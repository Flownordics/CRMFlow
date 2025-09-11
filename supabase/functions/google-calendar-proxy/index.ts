import { corsHeaders, okJson, errorJson, getUserIntegration, upsertUserIntegration, createSupabaseAdmin, getEnvVar } from '../_shared/oauth-utils.ts';

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
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorJson(401, 'Missing or invalid authorization header', getEnvVar('APP_URL'));
    }

    const accessToken = authHeader.slice('Bearer '.length);
    
    // Create Supabase admin client
    const supabaseAdmin = createSupabaseAdmin();
    
    // Verify user token and get user info
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    if (userError || !user) {
      return errorJson(401, 'Invalid access token', getEnvVar('APP_URL'));
    }

    // Get request body
    const body = await req.json();
    const { op, event } = body;

    if (!op || !['create', 'update', 'delete'].includes(op) || !event) {
      return errorJson(400, 'Invalid operation or missing event data', getEnvVar('APP_URL'));
    }

    // Get user's Calendar integration
    const integration = await getUserIntegration(supabaseAdmin, user.id, 'calendar');
    if (!integration || !integration.access_token) {
      return errorJson(400, 'Calendar integration not found or missing access token', getEnvVar('APP_URL'));
    }

    // Check if token is expired and refresh if needed
    let calendarAccessToken = integration.access_token;
    const now = new Date();
    const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
    
    if (expiresAt && expiresAt <= now) {
      // Token expired, refresh it
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          refresh_token: integration.refresh_token || '',
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        return errorJson(400, 'Failed to refresh Calendar access token', getEnvVar('APP_URL'));
      }

      const refreshData = await refreshResponse.json();
      calendarAccessToken = refreshData.access_token;
      
      // Update integration with new token
      await upsertUserIntegration(supabaseAdmin, {
        ...integration,
        access_token: calendarAccessToken,
        expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        last_synced_at: new Date().toISOString(),
      });
    }

    let googleEventId: string | null = null;

    // Handle different operations
    if (op === 'create') {
      // Create event
      const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${calendarAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: event.title,
          description: event.description,
          start: {
            dateTime: event.start,
            timeZone: event.timezone || 'UTC',
          },
          end: {
            dateTime: event.end,
            timeZone: event.timezone || 'UTC',
          },
          location: event.location,
          extendedProperties: {
            private: {
              dealId: event.dealId,
              companyId: event.companyId,
              crmEventId: event.id,
            },
          },
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.text();
        console.error('Calendar create failed:', errorData);
        return errorJson(400, 'Failed to create calendar event', getEnvVar('APP_URL'));
      }

      const createData = await createResponse.json();
      googleEventId = createData.id;

    } else if (op === 'update') {
      // Update event
      if (!event.googleEventId) {
        return errorJson(400, 'Missing googleEventId for update operation', getEnvVar('APP_URL'));
      }

      const updateResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.googleEventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${calendarAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: event.title,
          description: event.description,
          start: {
            dateTime: event.start,
            timeZone: event.timezone || 'UTC',
          },
          end: {
            dateTime: event.end,
            timeZone: event.timezone || 'UTC',
          },
          location: event.location,
          extendedProperties: {
            private: {
              dealId: event.dealId,
              companyId: event.companyId,
              crmEventId: event.id,
            },
          },
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.text();
        console.error('Calendar update failed:', errorData);
        return errorJson(400, 'Failed to update calendar event', getEnvVar('APP_URL'));
      }

      const updateData = await updateResponse.json();
      googleEventId = updateData.id;

    } else if (op === 'delete') {
      // Delete event
      if (!event.googleEventId) {
        return errorJson(400, 'Missing googleEventId for delete operation', getEnvVar('APP_URL'));
      }

      const deleteResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.googleEventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${calendarAccessToken}`,
        },
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.text();
        console.error('Calendar delete failed:', errorData);
        return errorJson(400, 'Failed to delete calendar event', getEnvVar('APP_URL'));
      }

      googleEventId = event.googleEventId;
    }

    return okJson({ 
      ok: true, 
      googleEventId,
      message: `Calendar event ${op}d successfully`
    }, getEnvVar('APP_URL'));

  } catch (error) {
    console.error('Calendar proxy error:', error);
    return errorJson(500, 'Internal server error', getEnvVar('APP_URL'));
  }
});
