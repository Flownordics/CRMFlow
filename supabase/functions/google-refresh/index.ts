import { corsHeaders, okJson, errorJson, getUserIntegrationWithDecryption, upsertUserIntegration, getCentralizedOAuthCreds, createSupabaseAdmin, getEnvVar } from '../_shared/oauth-utils.ts';

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
    const { userId, kind, force = false, refreshToken } = body;

    if (!kind || !['gmail', 'calendar'].includes(kind)) {
      return errorJson(400, 'Invalid kind parameter. Must be "gmail" or "calendar"', getEnvVar('APP_URL'));
    }

    if (!userId) {
      return errorJson(400, 'Missing userId parameter', getEnvVar('APP_URL'));
    }

    // Security: Verify that the authenticated user matches the userId in request
    if (userId !== user.id) {
      return errorJson(403, 'Forbidden: userId does not match authenticated user', getEnvVar('APP_URL'));
    }

    // Get user integration with decrypted tokens
    const integration = await getUserIntegrationWithDecryption(supabaseAdmin, userId, kind);
    if (!integration || !integration.refresh_token) {
      return errorJson(400, 'No integration found or missing refresh token', getEnvVar('APP_URL'));
    }

    // Check if token needs refresh
    const now = new Date();
    const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
    const needsRefresh = force || !expiresAt || expiresAt <= now;

    if (!needsRefresh) {
      return okJson({
        ok: true,
        expiresAt: integration.expires_at,
        message: 'Token still valid'
      }, getEnvVar('APP_URL'));
    }

    // Get centralized OAuth credentials from environment variables
    const credentials = getCentralizedOAuthCreds();

    // Refresh token using Google's OAuth2 endpoint
    // Note: redirect_uri is NOT needed for token refresh, only for initial authorization
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        refresh_token: integration.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.text().catch(() => 'Unable to read error response');
      let errorMessage = 'Failed to refresh token';
      let errorCode = 'unknown';
      
      try {
        const errorDataParsed = JSON.parse(errorData);
        errorCode = errorDataParsed.error || 'unknown';
        errorMessage = errorDataParsed.error_description || errorDataParsed.error || errorMessage;
        console.error('Token refresh failed - Google API error:', {
          status: refreshResponse.status,
          error: errorCode,
          error_description: errorDataParsed.error_description,
          full_response: errorData,
          has_refresh_token: !!integration.refresh_token,
          has_client_id: !!credentials.client_id,
          has_client_secret: !!credentials.client_secret
        });
      } catch {
        console.error('Token refresh failed - Unable to parse error:', {
          status: refreshResponse.status,
          raw_response: errorData
        });
      }
      
      // Provide more specific error messages based on error code
      if (errorCode === 'invalid_grant') {
        errorMessage = 'Refresh token is invalid or expired. Please reconnect your Google account.';
      } else if (errorCode === 'invalid_client') {
        errorMessage = 'OAuth credentials are invalid. Please check your Google OAuth configuration.';
      }
      
      return errorJson(400, errorMessage, getEnvVar('APP_URL'));
    }

    const refreshData = await refreshResponse.json();
    const { access_token, expires_in, scope } = refreshData;

    // Calculate new expiration time
    const newExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Update integration
    await upsertUserIntegration(supabaseAdmin, {
      ...integration,
      access_token,
      expires_at: newExpiresAt,
      scopes: scope ? scope.split(' ') : integration.scopes,
      last_synced_at: new Date().toISOString(),
    });

    return okJson({
      ok: true,
      access_token: access_token,
      expiresAt: newExpiresAt,
      message: 'Token refreshed successfully'
    }, getEnvVar('APP_URL'));

  } catch (error) {
    console.error('Token refresh error:', error);
    return errorJson(500, 'Internal server error', getEnvVar('APP_URL'));
  }
});
