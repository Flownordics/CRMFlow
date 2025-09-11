import { corsHeaders, errorJson, verifyState, getWorkspaceCreds, upsertUserIntegration, createSupabaseAdmin, getEnvVar } from '../_shared/oauth-utils.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders(getEnvVar('APP_URL')),
    });
  }

  // Only allow GET requests (Google redirects here)
  if (req.method !== 'GET') {
    return errorJson(405, 'Method not allowed', getEnvVar('APP_URL'));
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return errorJson(400, `OAuth error: ${error}`, getEnvVar('APP_URL'));
    }

    if (!code || !state) {
      return errorJson(400, 'Missing code or state parameter', getEnvVar('APP_URL'));
    }

    // Verify state
    const stateData = verifyState(state, getEnvVar('JWT_SECRET'));
    if (!stateData) {
      return errorJson(400, 'Invalid or expired state', getEnvVar('APP_URL'));
    }

    const { user_id, workspace_id, kind, redirect_origin } = stateData;

    // Create Supabase admin client
    const supabaseAdmin = createSupabaseAdmin();

    // Get workspace credentials
    const credentials = await getWorkspaceCreds(supabaseAdmin, workspace_id, kind);

    // Exchange code for tokens
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
      console.error('Token exchange failed:', errorData);
      return errorJson(400, 'Failed to exchange code for tokens', getEnvVar('APP_URL'));
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope } = tokenData;

    // Get user email
    let email: string;
    if (kind === 'gmail') {
      const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      });

      if (!profileResponse.ok) {
        return errorJson(400, 'Failed to get Gmail profile', getEnvVar('APP_URL'));
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
        return errorJson(400, 'Failed to get user info', getEnvVar('APP_URL'));
      }

      const userInfoData = await userInfoResponse.json();
      email = userInfoData.email;
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Save user integration
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

    // Redirect to completion page
    const appUrl = getEnvVar('APP_URL').replace(/\/+$/, '');
    const target = `${appUrl}/oauth/complete?connected=true&provider=google&kind=${encodeURIComponent(kind)}`;

    return new Response(null, {
      status: 302,
      headers: {
        Location: target,
        ...corsHeaders(getEnvVar('APP_URL')),
      },
    });

  } catch (error) {
    console.error('OAuth callback error:', error);

    // Redirect to completion page with error
    const appUrl = getEnvVar('APP_URL').replace(/\/+$/, '');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const target = `${appUrl}/oauth/complete?error=${encodeURIComponent(errorMessage)}&provider=google&kind=${encodeURIComponent(kind || 'unknown')}`;

    return new Response(null, {
      status: 302,
      headers: {
        Location: target,
        ...corsHeaders(getEnvVar('APP_URL')),
      },
    });
  }
});
