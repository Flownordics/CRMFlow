import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface DealCalendarSyncRequest {
    dealId: string
    action: 'create' | 'update' | 'delete'
    userId: string
}

interface Deal {
    id: string
    title: string
    close_date: string | null
    owner_user_id: string | null
    expected_value_minor: number
    company_id: string | null
}

interface Company {
    id: string
    name: string
}

interface UserIntegration {
    id: string
    user_id: string
    provider: string
    kind: string
    access_token: string
    refresh_token?: string
    expires_at?: string
}

interface DealIntegration {
    id: string
    deal_id: string
    provider: string
    kind: string
    external_id: string
    metadata: any
}

/**
 * Get Google Calendar access token for a user
 */
async function getGoogleCalendarToken(supabase: any, userId: string): Promise<string | null> {
    try {
        const { data: integrations, error } = await supabase
            .from('user_integrations')
            .select('*')
            .eq('user_id', userId)
            .eq('provider', 'google')
            .eq('kind', 'calendar')
            .single();

        if (error || !integrations) {
            console.log("No Google Calendar integration found for user:", userId);
            return null;
        }

        // Check if token is expired and refresh if needed
        if (integrations.expires_at && new Date(integrations.expires_at) <= new Date()) {
            if (integrations.refresh_token) {
                // Refresh token logic would go here
                // For now, we'll just return null if expired
                console.log("Token expired and refresh not implemented yet");
                return null;
            }
        }

        return integrations.access_token;
    } catch (error) {
        console.error("Failed to get Google Calendar token:", error);
        return null;
    }
}

/**
 * Create or update Google Calendar event
 */
async function createOrUpdateCalendarEvent(token: string, deal: Deal, companyName?: string): Promise<string> {
    const eventData = {
        summary: `Deal Close: ${deal.title}`,
        description: `Deal: ${deal.title}${companyName ? `\nCompany: ${companyName}` : ''}${deal.expected_value_minor > 0 ? `\nValue: ${deal.expected_value_minor / 100}` : ''}`,
        start: {
            date: deal.close_date, // All-day event
        },
        end: {
            date: deal.close_date, // All-day event
        },
    };

    // Check if event already exists
    const existingEventId = await getExistingCalendarEventId(deal.id);

    if (existingEventId) {
        // Update existing event
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingEventId}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData),
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to update calendar event: ${response.statusText}`);
        }

        const updatedEvent = await response.json();
        return updatedEvent.id;
    } else {
        // Create new event
        const response = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData),
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to create calendar event: ${response.statusText}`);
        }

        const newEvent = await response.json();
        return newEvent.id;
    }
}

/**
 * Get existing calendar event ID for a deal
 */
async function getExistingCalendarEventId(dealId: string): Promise<string | null> {
    try {
        const { data: integrations, error } = await supabase
            .from('deal_integrations')
            .select('external_id')
            .eq('deal_id', dealId)
            .eq('provider', 'google')
            .eq('kind', 'calendar')
            .single();

        if (error || !integrations) {
            return null;
        }

        return integrations.external_id;
    } catch (error) {
        console.error("Failed to get existing calendar event ID:", error);
        return null;
    }
}

/**
 * Store calendar event ID in deal_integrations
 */
async function storeCalendarEventId(supabase: any, dealId: string, eventId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('deal_integrations')
            .upsert({
                deal_id: dealId,
                provider: 'google',
                kind: 'calendar',
                external_id: eventId,
                metadata: {
                    synced_at: new Date().toISOString(),
                }
            });

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error("Failed to store calendar event ID:", error);
        throw error;
    }
}

/**
 * Remove calendar event from Google Calendar
 */
async function removeCalendarEvent(token: string, eventId: string): Promise<void> {
    const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        }
    );

    if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete calendar event: ${response.statusText}`);
    }
}

/**
 * Remove calendar event ID from deal_integrations
 */
async function removeCalendarEventId(supabase: any, dealId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('deal_integrations')
            .delete()
            .eq('deal_id', dealId)
            .eq('provider', 'google')
            .eq('kind', 'calendar');

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error("Failed to remove calendar event ID:", error);
        throw error;
    }
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Verify request method
        if (req.method !== 'POST') {
            return new Response(
                JSON.stringify({ error: 'Method not allowed' }),
                { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Parse request body
        const { dealId, action, userId }: DealCalendarSyncRequest = await req.json();

        if (!dealId || !action || !userId) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: dealId, action, userId' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get deal information
        const { data: deal, error: dealError } = await supabase
            .from('deals')
            .select('*')
            .eq('id', dealId)
            .single();

        if (dealError || !deal) {
            return new Response(
                JSON.stringify({ error: 'Deal not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get company name if available
        let companyName: string | undefined;
        if (deal.company_id) {
            const { data: company } = await supabase
                .from('companies')
                .select('name')
                .eq('id', deal.company_id)
                .single();
            companyName = company?.name;
        }

        // Handle different actions
        switch (action) {
            case 'create':
            case 'update':
                if (!deal.close_date || !deal.owner_user_id) {
                    return new Response(
                        JSON.stringify({ message: 'No close date or owner, nothing to sync' }),
                        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }

                const token = await getGoogleCalendarToken(supabase, deal.owner_user_id);
                if (!token) {
                    return new Response(
                        JSON.stringify({ message: 'No Google Calendar integration found for owner' }),
                        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }

                const eventId = await createOrUpdateCalendarEvent(token, deal, companyName);
                await storeCalendarEventId(supabase, dealId, eventId);

                return new Response(
                    JSON.stringify({
                        message: 'Deal synced to calendar successfully',
                        eventId: eventId
                    }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );

            case 'delete':
                if (deal.owner_user_id) {
                    const token = await getGoogleCalendarToken(supabase, deal.owner_user_id);
                    if (token) {
                        const existingEventId = await getExistingCalendarEventId(dealId);
                        if (existingEventId) {
                            await removeCalendarEvent(token, existingEventId);
                        }
                    }
                }

                await removeCalendarEventId(supabase, dealId);

                return new Response(
                    JSON.stringify({ message: 'Deal removed from calendar successfully' }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );

            default:
                return new Response(
                    JSON.stringify({ error: 'Invalid action' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
        }

    } catch (error) {
        console.error('Deal calendar sync error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
