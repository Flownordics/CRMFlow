import { corsHeaders, okJson, errorJson, signState, getCentralizedOAuthCreds, createSupabaseAdmin, getEnvVar, getEnvVarSafe } from '../_shared/oauth-utils.ts';

Deno.serve(async (req) => {
  // Debug: Log all requests
  console.log(`[google-oauth-start] ${req.method} request from origin: ${req.headers.get('origin')}`);
  
  // Handle CORS preflight - NEVER throw errors here
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin') || '*';
    console.log('[google-oauth-start] Handling CORS preflight for origin:', origin);
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    const appUrl = getEnvVarSafe('APP_URL', 'https://crmflow-app.netlify.app');
    return errorJson(405, 'Method not allowed', appUrl);
  }

  try {
    console.log('[google-oauth-start] Processing POST request...');
    
    const appUrl = getEnvVarSafe('APP_URL', 'https://crmflow-app.netlify.app');
    
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[google-oauth-start] Missing or invalid authorization header');
      return errorJson(401, 'Missing or invalid authorization header', appUrl);
    }

    const accessToken = authHeader.slice('Bearer '.length);
    console.log('[google-oauth-start] Access token present, verifying user...');

    // Create Supabase admin client
    const supabaseAdmin = createSupabaseAdmin();

    // Verify user token and get user info
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    if (userError || !user) {
      console.error('[google-oauth-start] Invalid user token:', userError?.message);
      return errorJson(401, 'Invalid access token', appUrl);
    }
    
    console.log('[google-oauth-start] User authenticated:', user.id);

    // Get request body
    const body = await req.json();
    const { kind } = body;
    
    console.log('[google-oauth-start] OAuth kind requested:', kind);

    if (!kind || !['gmail', 'calendar'].includes(kind)) {
      console.error('[google-oauth-start] Invalid kind parameter:', kind);
      return errorJson(400, 'Invalid kind parameter. Must be "gmail" or "calendar"', appUrl);
    }

    // Get workspace ID from workspace_settings (single-tenant)
    const { data: workspaceSettings, error: workspaceError } = await supabaseAdmin
      .from('workspace_settings')
      .select('id')
      .limit(1)
      .single();

    if (workspaceError || !workspaceSettings) {
      console.error('[google-oauth-start] Workspace not configured:', workspaceError?.message);
      return errorJson(500, 'Workspace not configured', appUrl);
    }
    
    console.log('[google-oauth-start] Workspace ID:', workspaceSettings.id);

    // Get centralized OAuth credentials from environment variables
    console.log('[google-oauth-start] Loading centralized OAuth credentials from environment...');
    const credentials = getCentralizedOAuthCreds();
    console.log('[google-oauth-start] OAuth credentials loaded. Client ID starts with:', credentials.client_id.substring(0, 20));

    // Build OAuth state
    const state = signState({
      user_id: user.id,
      workspace_id: workspaceSettings.id,
      kind,
      redirect_origin: getEnvVar('APP_URL'),
      ts: Date.now(),
    }, getEnvVar('JWT_SECRET'));

    // Build Google OAuth URL
    const scopes = kind === 'gmail'
      ? 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly'
      : 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email';

    const params = new URLSearchParams({
      client_id: credentials.client_id,
      redirect_uri: credentials.redirect_uri,
      scope: scopes,
      access_type: 'offline', // CRITICAL: Requests refresh_token
      include_granted_scopes: 'true',
      prompt: 'consent', // CRITICAL: Forces consent screen to get refresh_token
      response_type: 'code',
      state,
    });
    
    console.log('[google-oauth-start] OAuth params:', {
      client_id: credentials.client_id.substring(0, 20) + '...',
      redirect_uri: credentials.redirect_uri,
      access_type: 'offline',
      prompt: 'consent',
      scopes: scopes
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    
    console.log('[google-oauth-start] OAuth URL generated successfully');
    console.log('[google-oauth-start] Redirect URI:', credentials.redirect_uri);
    console.log('[google-oauth-start] Scopes:', scopes);

    return okJson({ authUrl }, appUrl);

  } catch (error) {
    console.error('[google-oauth-start] ERROR:', error);
    console.error('[google-oauth-start] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    const appUrl = getEnvVarSafe('APP_URL', 'https://crmflow-app.netlify.app');
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return errorJson(500, `OAuth start failed: ${errorMessage}`, appUrl);
  }
});
