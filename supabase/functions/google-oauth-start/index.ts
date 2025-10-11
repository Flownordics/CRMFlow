/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { corsHeaders, okJson, errorJson, signState, getCentralizedOAuthCreds, createSupabaseAdmin, getEnvVar } from '../_shared/oauth-utils.ts';

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
    const { kind } = body;

    if (!kind || !['gmail', 'calendar'].includes(kind)) {
      return errorJson(400, 'Invalid kind parameter. Must be "gmail" or "calendar"', getEnvVar('APP_URL'));
    }

    // Get workspace ID from workspace_settings (single-tenant)
    const { data: workspaceSettings, error: workspaceError } = await supabaseAdmin
      .from('workspace_settings')
      .select('id')
      .limit(1)
      .single();

    if (workspaceError || !workspaceSettings) {
      return errorJson(500, 'Workspace not configured', getEnvVar('APP_URL'));
    }

    // Get centralized OAuth credentials from environment variables
    const credentials = getCentralizedOAuthCreds();

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
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'select_account',
      response_type: 'code',
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return okJson({ authUrl }, getEnvVar('APP_URL'));

  } catch (error) {
    console.error('OAuth start error:', error);
    return errorJson(500, 'Internal server error', getEnvVar('APP_URL'));
  }
});
