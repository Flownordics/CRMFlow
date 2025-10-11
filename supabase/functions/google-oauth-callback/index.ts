import { corsHeaders, errorJson, verifyState, getCentralizedOAuthCreds, upsertUserIntegration, createSupabaseAdmin, getEnvVar, getEnvVarSafe } from '../_shared/oauth-utils.ts';

Deno.serve(async (req) => {
  // Debug: Log all requests
  console.log(`[google-oauth-callback] ${req.method} request from origin: ${req.headers.get('origin')}`);
  
  // Handle CORS preflight - NEVER throw errors here
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin') || '*';
    console.log('[google-oauth-callback] Handling CORS preflight for origin:', origin);
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  // Only allow GET requests (Google redirects here)
  if (req.method !== 'GET') {
    const appUrl = getEnvVarSafe('APP_URL', 'https://crmflow-app.netlify.app');
    return errorJson(405, 'Method not allowed', appUrl);
  }

  let kind: "gmail" | "calendar" | undefined;

  try {
    console.log('[google-oauth-callback] Processing OAuth callback...');
    const appUrl = getEnvVarSafe('APP_URL', 'https://crmflow-app.netlify.app');
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    
    console.log('[google-oauth-callback] Callback params:', { hasCode: !!code, hasState: !!state, error: error || 'none' });

    if (error) {
      console.error('[google-oauth-callback] OAuth error from Google:', error);
      return errorJson(400, `OAuth error: ${error}`, appUrl);
    }

    if (!code || !state) {
      console.error('[google-oauth-callback] Missing code or state');
      return errorJson(400, 'Missing code or state parameter', appUrl);
    }

    // Verify state
    const stateData = verifyState(state, getEnvVar('JWT_SECRET'));
    if (!stateData) {
      console.error('[google-oauth-callback] Invalid or expired state');
      return errorJson(400, 'Invalid or expired state', appUrl);
    }

    const { user_id, workspace_id, kind: parsedKind, redirect_origin } = stateData;
    kind = parsedKind;
    console.log('[google-oauth-callback] State verified. User:', user_id, 'Kind:', kind);

    // Create Supabase admin client
    const supabaseAdmin = createSupabaseAdmin();

    // Get centralized OAuth credentials from environment variables
    console.log('[google-oauth-callback] Loading centralized OAuth credentials...');
    const credentials = getCentralizedOAuthCreds();
    console.log('[google-oauth-callback] Credentials loaded. Redirect URI:', credentials.redirect_uri);

    // Exchange code for tokens
    console.log('[google-oauth-callback] Exchanging authorization code for tokens...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: credentials.redirect_uri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[google-oauth-callback] Token exchange failed:', errorData);
      return errorJson(400, 'Failed to exchange code for tokens', appUrl);
    }
    
    console.log('[google-oauth-callback] Tokens received successfully');

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope } = tokenData;
    console.log('[google-oauth-callback] Token data:', { hasAccessToken: !!access_token, hasRefreshToken: !!refresh_token, expiresIn: expires_in });

    // Get user email
    console.log('[google-oauth-callback] Fetching user email...');
    let email: string;
    if (kind === 'gmail') {
      const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      });

      if (!profileResponse.ok) {
        console.error('[google-oauth-callback] Failed to get Gmail profile');
        return errorJson(400, 'Failed to get Gmail profile', appUrl);
      }

      const profileData = await profileResponse.json();
      email = profileData.emailAddress;
    } else {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        console.error('[google-oauth-callback] Failed to get user info');
        return errorJson(400, 'Failed to get user info', appUrl);
      }

      const userInfoData = await userInfoResponse.json();
      email = userInfoData.email;
    }
    
    console.log('[google-oauth-callback] User email retrieved:', email);

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Save user integration (will be encrypted automatically)
    console.log('[google-oauth-callback] Saving user integration (tokens will be encrypted)...');
    await upsertUserIntegration(supabaseAdmin, {
      user_id,
      workspace_id,
      provider: 'google',
      kind,
      email,
      access_token,
      refresh_token,
      expires_at: expiresAt,
      scopes: scope.split(' '),
      last_synced_at: new Date().toISOString(),
    });
    
    console.log('[google-oauth-callback] Integration saved successfully. Redirecting to app...');

    // Redirect to completion page
    const target = `${appUrl.replace(/\/+$/, '')}/oauth/complete?connected=true&provider=google&kind=${encodeURIComponent(kind)}`;

    return new Response(null, {
      status: 302,
      headers: {
        Location: target,
        ...corsHeaders(appUrl),
      },
    });

  } catch (error) {
    console.error('[google-oauth-callback] ERROR:', error);
    console.error('[google-oauth-callback] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Redirect to completion page with error
    const appUrl = getEnvVarSafe('APP_URL', 'https://crmflow-app.netlify.app');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const target = `${appUrl.replace(/\/+$/, '')}/oauth/complete?error=${encodeURIComponent(errorMessage)}&provider=google&kind=${encodeURIComponent(kind || 'unknown')}`;

    return new Response(null, {
      status: 302,
      headers: {
        Location: target,
        ...corsHeaders(appUrl),
      },
    });
  }
});
