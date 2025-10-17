import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { qk } from "@/lib/queryKeys";
import { toastBus } from "@/lib/toastBus";
import { createEvent as createGoogleEvent, updateEvent as updateGoogleEvent, deleteEvent as deleteGoogleEvent } from "@/services/calendar";
import { logger } from '@/lib/logger';

// Zod schema for EventRow
export const EventRowSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    start_at: z.string(), // ISO string
    end_at: z.string(), // ISO string
    all_day: z.boolean(),
    location: z.string().nullable(),
    attendees: z.array(z.object({
        email: z.string().email(),
        name: z.string(),
        optional: z.boolean()
    })).default([]),
    color: z.string().nullable(), // "primary|accent|warning|success|muted"
    kind: z.string().nullable(), // "meeting|call|deadline|other"
    // CRM-links (nullable)
    deal_id: z.string().uuid().nullable().optional(),
    company_id: z.string().uuid().nullable().optional(),
    quote_id: z.string().uuid().nullable().optional(),
    order_id: z.string().uuid().nullable().optional(),
    // Google sync fields (optional)
    google_event_id: z.string().nullable(),
    sync_state: z.enum(['none', 'pending', 'synced', 'error']).default('none'),
    // Ownership
    created_by: z.string().uuid(),
    // Audit
    created_at: z.string(), // ISO string
    updated_at: z.string(), // ISO string
});

export type EventRow = z.infer<typeof EventRowSchema>;

// Create event payload schema
export const CreateEventPayloadSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    start_at: z.string(), // ISO string in UTC
    end_at: z.string(), // ISO string in UTC
    all_day: z.boolean().default(false),
    location: z.string().optional(),
    attendees: z.array(z.object({
        email: z.string().email(),
        name: z.string(),
        optional: z.boolean().default(false)
    })).default([]),
    color: z.enum(['primary', 'accent', 'warning', 'success', 'muted']).optional(),
    kind: z.enum(['meeting', 'call', 'deadline', 'other']).optional(),
    // CRM-links (nullable)
    deal_id: z.string().uuid().optional(),
    company_id: z.string().uuid().optional(),
    quote_id: z.string().uuid().optional(),
    order_id: z.string().uuid().optional(),
    // Google sync options
    google_sync_enabled: z.boolean().optional(),
});

export type CreateEventPayload = z.infer<typeof CreateEventPayloadSchema>;

// Update event payload schema
export const UpdateEventPayloadSchema = CreateEventPayloadSchema.partial();
export type UpdateEventPayload = z.infer<typeof UpdateEventPayloadSchema>;

// List events parameters
export interface ListEventsParams {
    from: string; // ISO string
    to: string; // ISO string
    kinds?: string[];
    dealId?: string;
    companyId?: string;
}

/**
 * List events for a date range with optional filters
 */
export async function listEvents(params: ListEventsParams): Promise<EventRow[]> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        let query = supabase
            .from('events')
            .select('*')
            .eq('created_by', user.id)
            .gte('start_at', params.from)
            .lte('end_at', params.to)
            .order('start_at', { ascending: true });

        // Apply optional filters
        if (params.kinds && params.kinds.length > 0) {
            query = query.in('kind', params.kinds);
        }

        if (params.dealId) {
            query = query.eq('deal_id', params.dealId);
        }

        if (params.companyId) {
            query = query.eq('company_id', params.companyId);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch events: ${error.message}`);
        }

        // Parse and validate the response
        const events = z.array(EventRowSchema).parse(data);
        return events;
    } catch (error) {
        logger.error('Error listing events:', error);
        throw error;
    }
}

/**
 * Create a new event
 */
export async function createEvent(payload: CreateEventPayload): Promise<EventRow> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        // Validate payload
        const validatedPayload = CreateEventPayloadSchema.parse(payload);
        const shouldSyncToGoogle = validatedPayload.google_sync_enabled !== false; // Default to true
        
        // Destructure to exclude google_sync_enabled from database insert
        const { google_sync_enabled, ...dbPayload } = validatedPayload;

        // Create event in CRM database
        const { data, error } = await supabase
            .from('events')
            .insert({
                ...dbPayload,
                created_by: user.id,
                sync_state: shouldSyncToGoogle ? 'pending' : 'none',
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create event: ${error.message}`);
        }

        // Parse and validate the response
        const event = EventRowSchema.parse(data);

        // Sync to Google Calendar if enabled
        if (shouldSyncToGoogle) {
            try {
                const googleEvent = await createGoogleEvent({
                    summary: event.title,
                    description: event.description || undefined,
                    location: event.location || undefined,
                    start: {
                        dateTime: event.start_at,
                        timeZone: 'UTC',
                    },
                    end: {
                        dateTime: event.end_at,
                        timeZone: 'UTC',
                    },
                    attendees: event.attendees.map(att => ({
                        email: att.email,
                        displayName: att.name,
                    })),
                    crmRef: {
                        dealId: event.deal_id || undefined,
                        companyId: event.company_id || undefined,
                        quoteId: event.quote_id || undefined,
                        orderId: event.order_id || undefined,
                        kind: event.kind as any || 'other',
                    },
                });

                // Update the event with Google Calendar ID
                const { error: updateError } = await supabase
                    .from('events')
                    .update({
                        google_event_id: googleEvent.id,
                        sync_state: 'synced',
                    })
                    .eq('id', event.id);

                if (updateError) {
                    logger.error('Failed to update event with Google Calendar ID:', updateError);
                    // Update sync state to error
                    await supabase
                        .from('events')
                        .update({ sync_state: 'error' })
                        .eq('id', event.id);
                }
            } catch (googleError) {
                logger.error('Failed to sync event to Google Calendar:', googleError);
                // Update sync state to error
                await supabase
                    .from('events')
                    .update({ sync_state: 'error' })
                    .eq('id', event.id);
            }
        }

        return event;
    } catch (error) {
        logger.error('Error creating event:', error);
        throw error;
    }
}

/**
 * Update an existing event
 */
export async function updateEvent(id: string, payload: UpdateEventPayload): Promise<EventRow> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        // Get the current event to check sync status
        const { data: currentEvent, error: fetchError } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .eq('created_by', user.id)
            .single();

        if (fetchError || !currentEvent) {
            throw new Error("Event not found or access denied");
        }

        // Validate payload
        const validatedPayload = UpdateEventPayloadSchema.parse(payload);
        
        // Destructure to exclude google_sync_enabled from database update
        const { google_sync_enabled, ...dbPayload } = validatedPayload;

        // Update event in CRM database
        const { data, error } = await supabase
            .from('events')
            .update({
                ...dbPayload,
                sync_state: currentEvent.google_event_id ? 'pending' : 'none',
            })
            .eq('id', id)
            .eq('created_by', user.id) // Ensure user owns the event
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update event: ${error.message}`);
        }

        // Parse and validate the response
        const event = EventRowSchema.parse(data);

        // Sync to Google Calendar if event is synced
        if (currentEvent.google_event_id && currentEvent.sync_state === 'synced') {
            try {
                await updateGoogleEvent(currentEvent.google_event_id, {
                    summary: event.title,
                    description: event.description || undefined,
                    location: event.location || undefined,
                    start: {
                        dateTime: event.start_at,
                        timeZone: 'UTC',
                    },
                    end: {
                        dateTime: event.end_at,
                        timeZone: 'UTC',
                    },
                    attendees: event.attendees.map(att => ({
                        email: att.email,
                        displayName: att.name,
                    })),
                    crmRef: {
                        dealId: event.deal_id || undefined,
                        companyId: event.company_id || undefined,
                        quoteId: event.quote_id || undefined,
                        orderId: event.order_id || undefined,
                        kind: event.kind as any || 'other',
                    },
                });

                // Update sync state to synced
                await supabase
                    .from('events')
                    .update({ sync_state: 'synced' })
                    .eq('id', event.id);
            } catch (googleError) {
                logger.error('Failed to sync event update to Google Calendar:', googleError);
                // Update sync state to error
                await supabase
                    .from('events')
                    .update({ sync_state: 'error' })
                    .eq('id', event.id);
            }
        }

        return event;
    } catch (error) {
        logger.error('Error updating event:', error);
        throw error;
    }
}

/**
 * Delete an event
 */
export async function deleteEvent(id: string): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        // Get the current event to check if it's synced to Google Calendar
        const { data: currentEvent, error: fetchError } = await supabase
            .from('events')
            .select('google_event_id, sync_state')
            .eq('id', id)
            .eq('created_by', user.id)
            .single();

        if (fetchError) {
            throw new Error("Event not found or access denied");
        }

        // Delete from Google Calendar if synced
        if (currentEvent?.google_event_id && currentEvent.sync_state === 'synced') {
            try {
                await deleteGoogleEvent(currentEvent.google_event_id);
            } catch (googleError) {
                logger.error('Failed to delete event from Google Calendar:', googleError);
                // Continue with local deletion even if Google deletion fails
            }
        }

        // Delete from CRM database
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', id)
            .eq('created_by', user.id); // Ensure user owns the event

        if (error) {
            throw new Error(`Failed to delete event: ${error.message}`);
        }
    } catch (error) {
        logger.error('Error deleting event:', error);
        throw error;
    }
}

// React Query hooks

/**
 * Hook to list events
 */
export function useEvents(params: ListEventsParams) {
    return useQuery({
        queryKey: qk.events(params),
        queryFn: () => listEvents(params),
        staleTime: 30 * 1000, // 30 seconds
    });
}

/**
 * Hook to create event
 */
export function useCreateEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createEvent,
        onSuccess: () => {
            // Invalidate events queries
            queryClient.invalidateQueries({ queryKey: qk.events() });
            toastBus.success("Event created successfully");
        },
        onError: (error) => {
            toastBus.error("Failed to create event");
            logger.error('Create event error:', error);
        },
    });
}

/**
 * Hook to update event
 */
export function useUpdateEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateEventPayload }) =>
            updateEvent(id, payload),
        onSuccess: () => {
            // Invalidate events queries
            queryClient.invalidateQueries({ queryKey: qk.events() });
            toastBus.emit({
                title: "Success",
                description: "Event updated successfully",
                variant: "success"
            });
        },
        onError: (error) => {
            toastBus.emit({
                title: "Error",
                description: "Failed to update event",
                variant: "destructive"
            });
            logger.error('Update event error:', error);
        },
    });
}

/**
 * Hook to delete event
 */
export function useDeleteEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteEvent,
        onSuccess: () => {
            // Invalidate events queries
            queryClient.invalidateQueries({ queryKey: qk.events() });
            toastBus.emit({
                title: "Success",
                description: "Event deleted successfully",
                variant: "success"
            });
        },
        onError: (error) => {
            toastBus.emit({
                title: "Error",
                description: "Failed to delete event",
                variant: "destructive"
            });
            logger.error('Delete event error:', error);
        },
    });
}
