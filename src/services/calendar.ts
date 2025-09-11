import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { toastBus } from "@/lib/toastBus";

// Types for Google Calendar API
export interface GoogleCalendarEvent {
    id?: string;
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    attendees?: Array<{
        email: string;
        displayName?: string;
        responseStatus?: string;
    }>;
    reminders?: {
        useDefault: boolean;
        overrides?: Array<{
            method: string;
            minutes: number;
        }>;
    };
    extendedProperties?: {
        private?: {
            crmflowKind?: string;
            crmflowDealId?: string;
            crmflowCompanyId?: string;
            crmflowQuoteId?: string;
            crmflowOrderId?: string;
            crmflowDealTitle?: string;
            crmflowCompanyName?: string;
        };
    };
    crmRef?: CrmReference; // Add CRM reference field for easy access
}

export interface CreateEventPayload {
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime: string;
        timeZone?: string;
    };
    end: {
        dateTime: string;
        timeZone?: string;
    };
    attendees?: Array<{
        email: string;
        displayName?: string;
    }>;
    reminders?: {
        useDefault: boolean;
        overrides?: Array<{
            method: string;
            minutes: number;
        }>;
    };
    crmRef?: CrmReference; // Add CRM reference field
}

export interface CalendarIntegration {
    user_id: string;
    access_token: string;
    refresh_token?: string;
    email?: string;
    expires_at?: string;
}

// Calendar status interface
export type CalendarStatus = {
    connected: boolean;
    email?: string;
    provider?: "google";
    lastSyncAt?: string
};

// CRM Reference interface for linking events to CRM entities
export interface CrmReference {
    dealId?: string;
    companyId?: string;
    quoteId?: string;
    orderId?: string;
    kind?: "meeting" | "call" | "deadline" | "other";
}

// Helper function to map CRM reference to extendedProperties
function mapCrmRefToExtendedProperties(crmRef?: CrmReference) {
    if (!crmRef) return undefined;

    return {
        private: {
            crmflowKind: crmRef.kind,
            crmflowDealId: crmRef.dealId,
            crmflowCompanyId: crmRef.companyId,
            crmflowQuoteId: crmRef.quoteId,
            crmflowOrderId: crmRef.orderId,
        }
    };
}

// Helper function to extract CRM reference from extendedProperties
function extractCrmRefFromExtendedProperties(event: any): CrmReference | undefined {
    const privateProps = event.extendedProperties?.private;
    if (!privateProps) return undefined;

    return {
        kind: privateProps.crmflowKind,
        dealId: privateProps.crmflowDealId,
        companyId: privateProps.crmflowCompanyId,
        quoteId: privateProps.crmflowQuoteId,
        orderId: privateProps.crmflowOrderId,
    };
}

/**
 * Get user's Google Calendar integration
 */
async function getCalendarIntegration(): Promise<CalendarIntegration | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        const { data: integration, error } = await supabase
            .from('user_integrations')
            .select('*')
            .eq('user_id', user.id)
            .eq('provider', 'google')
            .eq('kind', 'calendar')
            .single();

        if (error || !integration) {
            return null;
        }

        return integration;
    } catch (error) {
        console.error('Error getting calendar integration:', error);
        return null;
    }
}

/**
 * Refresh Google access token if needed
 */
async function refreshTokenIfNeeded(integration: CalendarIntegration): Promise<string> {
    // Check if token is expired (within 2 minutes)
    if (integration.expires_at) {
        const expiresAt = new Date(integration.expires_at);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();

        if (timeUntilExpiry < 2 * 60 * 1000) { // Less than 2 minutes
            console.log('Token expired, refreshing...');
            return await refreshGoogleToken(integration);
        }
    }

    return integration.access_token;
}

/**
 * Refresh Google access token
 */
async function refreshGoogleToken(integration: CalendarIntegration): Promise<string> {
    try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) {
            throw new Error("VITE_SUPABASE_URL is not configured");
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/google-refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
                userId: integration.user_id,
                kind: 'calendar',
                refreshToken: integration.refresh_token
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to refresh token: ${response.status}`);
        }

        const result = await response.json();
        return result.access_token;
    } catch (error) {
        console.error('Error refreshing Google token:', error);
        throw error;
    }
}

/**
 * List calendar events for a date range
 */
export async function listEvents(range: { start: string; end: string }): Promise<GoogleCalendarEvent[]> {
    const integration = await getCalendarIntegration();
    if (!integration) {
        throw new Error('Google Calendar not connected');
    }

    try {
        const accessToken = await refreshTokenIfNeeded(integration);

        const params = new URLSearchParams({
            timeMin: range.start,
            timeMax: range.end,
            singleEvents: 'true',
            orderBy: 'startTime'
        });

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.status === 401) {
            // Token expired, try to refresh and retry once
            const newToken = await refreshGoogleToken(integration);
            const retryResponse = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
                {
                    headers: {
                        'Authorization': `Bearer ${newToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!retryResponse.ok) {
                throw new Error(`Google Calendar API error: ${retryResponse.status}`);
            }

            const data = await retryResponse.json();
            // Extract CRM references from all events
            return (data.items || []).map(event => ({
                ...event,
                crmRef: extractCrmRefFromExtendedProperties(event)
            }));
        }

        if (!response.ok) {
            throw new Error(`Google Calendar API error: ${response.status}`);
        }

        const data = await response.json();
        // Extract CRM references from all events
        return (data.items || []).map(event => ({
            ...event,
            crmRef: extractCrmRefFromExtendedProperties(event)
        }));
    } catch (error) {
        console.error('Error listing calendar events:', error);
        throw error;
    }
}

/**
 * Create a new calendar event
 */
export async function createEvent(payload: CreateEventPayload): Promise<GoogleCalendarEvent> {
    const integration = await getCalendarIntegration();
    if (!integration) {
        throw new Error('Google Calendar not connected');
    }

    try {
        const accessToken = await refreshTokenIfNeeded(integration);

        // Map CRM reference to extendedProperties
        const eventPayload = {
            ...payload,
            extendedProperties: mapCrmRefToExtendedProperties(payload.crmRef)
        };

        const response = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventPayload),
            }
        );

        if (response.status === 401) {
            // Token expired, try to refresh and retry once
            const newToken = await refreshGoogleToken(integration);
            const retryResponse = await fetch(
                'https://www.googleapis.com/calendar/v3/calendars/primary/events',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${newToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(eventPayload),
                }
            );

            if (!retryResponse.ok) {
                throw new Error(`Google Calendar API error: ${retryResponse.status}`);
            }

            const result = await retryResponse.json();
            // Add CRM reference to the returned event
            return {
                ...result,
                crmRef: extractCrmRefFromExtendedProperties(result)
            };
        }

        if (!response.ok) {
            throw new Error(`Google Calendar API error: ${response.status}`);
        }

        const result = await response.json();
        // Add CRM reference to the returned event
        return {
            ...result,
            crmRef: extractCrmRefFromExtendedProperties(result)
        };
    } catch (error) {
        console.error('Error creating calendar event:', error);
        throw error;
    }
}

/**
 * Update an existing calendar event
 */
export async function updateEvent(eventId: string, payload: Partial<CreateEventPayload>): Promise<GoogleCalendarEvent> {
    const integration = await getCalendarIntegration();
    if (!integration) {
        throw new Error('Google Calendar not connected');
    }

    try {
        const accessToken = await refreshTokenIfNeeded(integration);

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            }
        );

        if (response.status === 401) {
            // Token expired, try to refresh and retry once
            const newToken = await refreshGoogleToken(integration);
            const retryResponse = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${newToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (!retryResponse.ok) {
                throw new Error(`Google Calendar API error: ${retryResponse.status}`);
            }

            return await retryResponse.json();
        }

        if (!response.ok) {
            throw new Error(`Google Calendar API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating calendar event:', error);
        throw error;
    }
}

/**
 * Delete a calendar event
 */
export async function deleteEvent(eventId: string): Promise<void> {
    const integration = await getCalendarIntegration();
    if (!integration) {
        throw new Error('Google Calendar not connected');
    }

    try {
        const accessToken = await refreshTokenIfNeeded(integration);

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        if (response.status === 401) {
            // Token expired, try to refresh and retry once
            const newToken = await refreshGoogleToken(integration);
            const retryResponse = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${newToken}`,
                    },
                }
            );

            if (!retryResponse.ok) {
                throw new Error(`Google Calendar API error: ${retryResponse.status}`);
            }
        }

        if (!response.ok) {
            throw new Error(`Google Calendar API error: ${response.status}`);
        }
    } catch (error) {
        console.error('Error deleting calendar event:', error);
        throw error;
    }
}

/**
 * Check if user has Google Calendar connected
 */
export async function isCalendarConnected(): Promise<boolean> {
    const integration = await getCalendarIntegration();
    return !!integration;
}

/**
 * Get calendar integration info
 */
export async function getCalendarInfo(): Promise<{ connected: boolean; email?: string } | null> {
    try {
        const integration = await getCalendarIntegration();
        if (!integration) {
            return { connected: false };
        }

        return {
            connected: true,
            email: integration.email
        };
    } catch (error) {
        console.error('Error getting calendar info:', error);
        return null;
    }
}

/**
 * Get comprehensive calendar status
 */
export async function getCalendarStatus(): Promise<CalendarStatus> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { connected: false };
        }

        // First check if the table exists and is accessible
        const { data: integrations, error } = await supabase
            .from('user_integrations')
            .select('id, email, updated_at')
            .eq('user_id', user.id)
            .eq('provider', 'google')
            .eq('kind', 'calendar');

        if (error) {
            console.warn("[calendar] Database error:", error);
            // If it's a 406 or table doesn't exist, return not connected
            if (error.code === '406' || error.message?.includes('does not exist')) {
                return { connected: false };
            }
            return { connected: false };
        }

        if (!integrations || integrations.length === 0) {
            return { connected: false };
        }

        const integration = integrations[0];
        return {
            connected: true,
            email: integration.email || "",
            provider: "google",
            lastSyncAt: integration.updated_at || null
        };
    } catch (error) {
        console.warn("[calendar] status err:", error);
        return { connected: false };
    }
}

/**
 * Set up Google Calendar push notifications
 */
export async function setupCalendarPushNotifications(): Promise<{ ok: boolean; error?: string }> {
    try {
        const integration = await getCalendarIntegration();
        if (!integration) {
            return { ok: false, error: 'Google Calendar not connected' };
        }

        const accessToken = await refreshTokenIfNeeded(integration);
        const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-webhook`;

        // Set up push notification channel
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/watch', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: `crmflow-${integration.user_id}-${Date.now()}`,
                type: 'web_hook',
                address: webhookUrl,
                token: `crmflow-${integration.user_id}`,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Failed to set up push notifications:', errorData);
            return { ok: false, error: 'Failed to set up push notifications' };
        }

        const watchData = await response.json();

        // Store the resource ID in the integration using Supabase client
        // Skip expiration for now to avoid timestamp issues
        const { error: updateError } = await supabase
            .from('user_integrations')
            .update({
                resource_id: watchData.resourceId,
                // Skip expiration field to avoid timestamp issues
                // expiration: watchData.expiration,
            })
            .eq('user_id', integration.user_id)
            .eq('provider', 'google')
            .eq('kind', 'calendar');

        if (updateError) {
            console.error('Failed to update integration with resource ID:', updateError);
        }

        return { ok: true };
    } catch (error: any) {
        console.error('Error setting up push notifications:', error);
        return { ok: false, error: error.message || 'Failed to set up push notifications' };
    }
}

/**
 * Sync Google Calendar
 */
export async function syncGoogleCalendar(): Promise<{ ok: boolean; error?: string }> {
    try {
        const status = await getCalendarStatus();
        if (!status.connected) {
            return { ok: false, error: "Google Calendar not connected" };
        }

        // Set up push notifications for real-time sync
        const pushResult = await setupCalendarPushNotifications();
        if (!pushResult.ok) {
            console.warn('Failed to set up push notifications:', pushResult.error);
        }

        return { ok: true };
    } catch (error: any) {
        const msg = error?.response?.data?.message || error?.message || "Sync failed";
        return { ok: false, error: msg };
    }
}

// React Query hooks

/**
 * Hook to list calendar events
 */
export function useCalendarEvents(range: { start: string; end: string }) {
    return useQuery({
        queryKey: qk.calendarEvents(range),
        queryFn: () => listEvents(range),
        enabled: false, // Disable automatic fetching, call refetch manually
        retry: 1,
    });
}

/**
 * Hook to create calendar event
 */
export function useCreateCalendarEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createEvent,
        onSuccess: () => {
            // Invalidate calendar events queries
            queryClient.invalidateQueries({ queryKey: qk.calendarEvents() });
        },
    });
}

/**
 * Hook to update calendar event
 */
export function useUpdateCalendarEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ eventId, payload }: { eventId: string; payload: Partial<CreateEventPayload> }) =>
            updateEvent(eventId, payload),
        onSuccess: () => {
            // Invalidate calendar events queries
            queryClient.invalidateQueries({ queryKey: qk.calendarEvents() });
        },
    });
}

/**
 * Hook to delete calendar event
 */
export function useDeleteCalendarEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteEvent,
        onSuccess: () => {
            // Invalidate calendar events queries
            queryClient.invalidateQueries({ queryKey: qk.calendarEvents() });
        },
    });
}

/**
 * Hook to check calendar connection status
 */
export function useCalendarConnection() {
    return useQuery({
        queryKey: qk.calendarConnection(),
        queryFn: getCalendarInfo,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Hook to set up calendar sync
 */
export function useSetupCalendarSync() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: syncGoogleCalendar,
        onSuccess: () => {
            // Invalidate calendar connection to refresh status
            queryClient.invalidateQueries({ queryKey: qk.calendarConnection() });
            toastBus.emit({
                title: "Success",
                description: "Calendar sync set up successfully",
                variant: "success"
            });
        },
        onError: (error) => {
            console.error('Failed to set up calendar sync:', error);
            toastBus.emit({
                title: "Error",
                description: "Failed to set up calendar sync",
                variant: "destructive"
            });
        },
    });
}
