import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types
export interface OAuthState {
  user_id: string;
  workspace_id: string;
  kind: 'gmail' | 'calendar';
  redirect_origin: string;
  ts: number;
}

export interface WorkspaceCredentials {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

export interface UserIntegration {
  id?: string;
  user_id: string;
  workspace_id: string;
  provider: 'google';
  kind: 'gmail' | 'calendar';
  email?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  scopes?: string[];
  last_synced_at?: string;
  created_at?: string;
  updated_at?: string;
}

// CORS headers
export function corsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, content-type, apikey',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

// Response helpers
export function okJson(data: any, origin?: string) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: corsHeaders(origin),
  });
}

export function errorJson(status: number, message: string, origin?: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: corsHeaders(origin),
  });
}

// Simple state signing/verification (not JWT, but secure enough for OAuth state)
export function signState(payload: OAuthState, secret: string): string {
  // Add timestamp and simple checksum
  const data = {
    ...payload,
    checksum: simpleChecksum(JSON.stringify(payload) + secret)
  };

  return btoa(JSON.stringify(data));
}

export function verifyState(token: string, secret: string): OAuthState | null {
  try {
    const data = JSON.parse(atob(token));
    const now = Date.now();

    // Check if state is not too old (5 minutes)
    if (now - data.ts > 5 * 60 * 1000) {
      return null;
    }

    // Verify checksum
    const expectedChecksum = simpleChecksum(JSON.stringify({
      user_id: data.user_id,
      workspace_id: data.workspace_id,
      kind: data.kind,
      redirect_origin: data.redirect_origin,
      ts: data.ts
    }) + secret);

    if (data.checksum !== expectedChecksum) {
      return null;
    }

    return {
      user_id: data.user_id,
      workspace_id: data.workspace_id,
      kind: data.kind,
      redirect_origin: data.redirect_origin,
      ts: data.ts
    } as OAuthState;
  } catch {
    return null;
  }
}

// Simple checksum function
function simpleChecksum(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Database helpers
export async function getWorkspaceCreds(
  supabaseAdmin: any,
  workspace_id: string,
  kind: 'gmail' | 'calendar'
): Promise<WorkspaceCredentials> {
  const { data, error } = await supabaseAdmin
    .from('workspace_integrations')
    .select('client_id, client_secret, redirect_uri')
    .eq('workspace_id', workspace_id)
    .eq('provider', 'google')
    .eq('kind', kind)
    .single();

  if (error || !data) {
    throw new Error(`No workspace credentials found for ${kind}`);
  }

  return data;
}

export async function getUserIntegration(
  supabaseAdmin: any,
  user_id: string,
  kind: 'gmail' | 'calendar'
): Promise<UserIntegration | null> {
  const { data, error } = await supabaseAdmin
    .from('user_integrations')
    .select('*')
    .eq('user_id', user_id)
    .eq('provider', 'google')
    .eq('kind', kind)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw error;
  }

  return data;
}

export async function upsertUserIntegration(
  supabaseAdmin: any,
  integration: UserIntegration
): Promise<UserIntegration> {
  const { data, error } = await supabaseAdmin
    .from('user_integrations')
    .upsert(integration, { onConflict: 'user_id,provider,kind' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// Get environment variables
export function getEnvVar(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

// Create Supabase admin client
export function createSupabaseAdmin() {
  const supabaseUrl = getEnvVar('SUPABASE_URL');
  const serviceRoleKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
