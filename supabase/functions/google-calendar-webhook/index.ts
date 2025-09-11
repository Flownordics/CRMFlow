import { corsHeaders, okJson, errorJson, createSupabaseAdmin, getEnvVar } from '../_shared/oauth-utils.ts';

interface GoogleCalendarNotification {
    kind: string;
    id: string;
    resourceId: string;
    resourceUri: string;
    token: string;
    expiration: string;
    type: string;
    address: string;
}

interface GoogleCalendarEvent {
    id: string;
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
    extendedProperties?: {
        private?: {
            crmflowKind?: string;
            crmflowDealId?: string;
            crmflowCompanyId?: string;
            crmflowQuoteId?: string;
            crmflowOrderId?: string;
            crmflowEventId?: string;
        };
    };
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: corsHeaders(getEnvVar('APP_URL')),
        });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return errorJson(405, 'Method not allowed', getEnvVar('APP_URL'));
    }

    try {
        const supabaseAdmin = createSupabaseAdmin();

        // Get the request body
        const body = await req.text();

        // Check if this is a Google Calendar push notification
        if (req.headers.get('x-goog-resource-state') === 'sync') {
            // Initial sync notification - we can ignore this
            return okJson({ message: 'Sync notification received' }, getEnvVar('APP_URL'));
        }

        // Parse the notification
        let notification: GoogleCalendarNotification;
        try {
            notification = JSON.parse(body);
        } catch (error) {
            console.error('Failed to parse notification body:', error);
            return errorJson(400, 'Invalid JSON in request body', getEnvVar('APP_URL'));
        }

        // Validate notification structure
        if (!notification.resourceId || !notification.resourceUri) {
            return errorJson(400, 'Invalid notification structure', getEnvVar('APP_URL'));
        }

        // Extract user ID from the resource URI or token
        // The resource URI should contain the user's calendar ID
        const resourceId = notification.resourceId;

        // Find the user integration that matches this resource ID
        const { data: integrations, error: integrationError } = await supabaseAdmin
            .from('user_integrations')
            .select('user_id, access_token, refresh_token, expires_at')
            .eq('provider', 'google')
            .eq('kind', 'calendar')
            .eq('resource_id', resourceId);

        if (integrationError || !integrations || integrations.length === 0) {
            console.error('No integration found for resource ID:', resourceId);
            return errorJson(404, 'Integration not found', getEnvVar('APP_URL'));
        }

        const integration = integrations[0];

        // Refresh token if needed
        let accessToken = integration.access_token;
        if (integration.expires_at) {
            const expiresAt = new Date(integration.expires_at);
            const now = new Date();
            if (expiresAt <= now) {
                // Token expired, refresh it
                const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        client_id: getEnvVar('GOOGLE_CLIENT_ID'),
                        client_secret: getEnvVar('GOOGLE_CLIENT_SECRET'),
                        refresh_token: integration.refresh_token || '',
                        grant_type: 'refresh_token',
                    }),
                });

                if (refreshResponse.ok) {
                    const refreshData = await refreshResponse.json();
                    accessToken = refreshData.access_token;

                    // Update the integration with new token
                    await supabaseAdmin
                        .from('user_integrations')
                        .update({
                            access_token: accessToken,
                            expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
                        })
                        .eq('user_id', integration.user_id)
                        .eq('provider', 'google')
                        .eq('kind', 'calendar');
                }
            }
        }

        // Fetch the updated events from Google Calendar
        const eventsResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}&singleEvents=true&orderBy=startTime`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!eventsResponse.ok) {
            console.error('Failed to fetch events from Google Calendar:', eventsResponse.statusText);
            return errorJson(500, 'Failed to fetch events from Google Calendar', getEnvVar('APP_URL'));
        }

        const eventsData = await eventsResponse.json();
        const googleEvents: GoogleCalendarEvent[] = eventsData.items || [];

        // Process each event
        for (const googleEvent of googleEvents) {
            await processGoogleCalendarEvent(supabaseAdmin, integration.user_id, googleEvent);
        }

        return okJson({
            message: 'Webhook processed successfully',
            eventsProcessed: googleEvents.length
        }, getEnvVar('APP_URL'));

    } catch (error) {
        console.error('Webhook error:', error);
        return errorJson(500, 'Internal server error', getEnvVar('APP_URL'));
    }
});

/**
 * Process a Google Calendar event and sync it to CRM
 */
async function processGoogleCalendarEvent(
    supabaseAdmin: any,
    userId: string,
    googleEvent: GoogleCalendarEvent
): Promise<void> {
    try {
        // Check if this is a CRMFlow event (has extended properties)
        const crmRef = googleEvent.extendedProperties?.private;

        if (crmRef?.crmflowEventId) {
            // This is a CRM event that was synced to Google Calendar
            // Update the existing CRM event
            await updateCrmEventFromGoogle(supabaseAdmin, crmRef.crmflowEventId, googleEvent);
        } else {
            // This is a native Google Calendar event
            // Check if we already have this event in CRM
            const { data: existingEvent } = await supabaseAdmin
                .from('events')
                .select('id')
                .eq('google_event_id', googleEvent.id)
                .eq('created_by', userId)
                .single();

            if (existingEvent) {
                // Update existing CRM event
                await updateCrmEventFromGoogle(supabaseAdmin, existingEvent.id, googleEvent);
            } else {
                // Create new CRM event from Google Calendar event
                await createCrmEventFromGoogle(supabaseAdmin, userId, googleEvent);
            }
        }
    } catch (error) {
        console.error('Error processing Google Calendar event:', error);
    }
}

/**
 * Create a new CRM event from a Google Calendar event
 */
async function createCrmEventFromGoogle(
    supabaseAdmin: any,
    userId: string,
    googleEvent: GoogleCalendarEvent
): Promise<void> {
    const startAt = googleEvent.start.dateTime || googleEvent.start.date;
    const endAt = googleEvent.end.dateTime || googleEvent.end.date;
    const allDay = !googleEvent.start.dateTime;

    if (!startAt || !endAt) {
        console.error('Invalid event dates:', googleEvent);
        return;
    }

    const { error } = await supabaseAdmin
        .from('events')
        .insert({
            title: googleEvent.summary || 'Untitled Event',
            description: googleEvent.description || null,
            start_at: startAt,
            end_at: endAt,
            all_day: allDay,
            location: googleEvent.location || null,
            attendees: googleEvent.attendees?.map(att => ({
                email: att.email,
                name: att.displayName || att.email,
                optional: att.responseStatus === 'needsAction'
            })) || [],
            color: 'primary',
            kind: 'meeting',
            google_event_id: googleEvent.id,
            sync_state: 'synced',
            created_by: userId,
        });

    if (error) {
        console.error('Failed to create CRM event from Google Calendar:', error);
    }
}

/**
 * Update an existing CRM event from a Google Calendar event
 */
async function updateCrmEventFromGoogle(
    supabaseAdmin: any,
    crmEventId: string,
    googleEvent: GoogleCalendarEvent
): Promise<void> {
    const startAt = googleEvent.start.dateTime || googleEvent.start.date;
    const endAt = googleEvent.end.dateTime || googleEvent.end.date;
    const allDay = !googleEvent.start.dateTime;

    if (!startAt || !endAt) {
        console.error('Invalid event dates:', googleEvent);
        return;
    }

    const { error } = await supabaseAdmin
        .from('events')
        .update({
            title: googleEvent.summary || 'Untitled Event',
            description: googleEvent.description || null,
            start_at: startAt,
            end_at: endAt,
            all_day: allDay,
            location: googleEvent.location || null,
            attendees: googleEvent.attendees?.map(att => ({
                email: att.email,
                name: att.displayName || att.email,
                optional: att.responseStatus === 'needsAction'
            })) || [],
            sync_state: 'synced',
        })
        .eq('id', crmEventId);

    if (error) {
        console.error('Failed to update CRM event from Google Calendar:', error);
    }
}
