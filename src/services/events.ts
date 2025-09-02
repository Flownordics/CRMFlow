import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { qk } from "@/lib/queryKeys";
import { toastBus } from "@/lib/toastBus";

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
    deal_id: z.string().uuid().nullable(),
    company_id: z.string().uuid().nullable(),
    quote_id: z.string().uuid().nullable(),
    order_id: z.string().uuid().nullable(),
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
        console.error('Error listing events:', error);
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

        const { data, error } = await supabase
            .from('events')
            .insert({
                ...validatedPayload,
                created_by: user.id,
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create event: ${error.message}`);
        }

        // Parse and validate the response
        const event = EventRowSchema.parse(data);
        return event;
    } catch (error) {
        console.error('Error creating event:', error);
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

        // Validate payload
        const validatedPayload = UpdateEventPayloadSchema.parse(payload);

        const { data, error } = await supabase
            .from('events')
            .update(validatedPayload)
            .eq('id', id)
            .eq('created_by', user.id) // Ensure user owns the event
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update event: ${error.message}`);
        }

        // Parse and validate the response
        const event = EventRowSchema.parse(data);
        return event;
    } catch (error) {
        console.error('Error updating event:', error);
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

        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', id)
            .eq('created_by', user.id); // Ensure user owns the event

        if (error) {
            throw new Error(`Failed to delete event: ${error.message}`);
        }
    } catch (error) {
        console.error('Error deleting event:', error);
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
            console.error('Create event error:', error);
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
            toastBus.success("Event updated successfully");
        },
        onError: (error) => {
            toastBus.error("Failed to update event");
            console.error('Update event error:', error);
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
            toastBus.success("Event deleted successfully");
        },
        onError: (error) => {
            toastBus.error("Failed to delete event");
            console.error('Delete event error:', error);
        },
    });
}
