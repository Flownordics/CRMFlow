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

// CORS headers - Always allow from our frontend
export function corsHeaders(origin?: string) {
  const allowedOrigins = [
    'https://crmflow-app.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  
  // If specific origin provided and it's in allowed list, use it
  // Otherwise default to wildcard for development
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : '*';
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, content-type, apikey, x-requested-with',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
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

// Encryption utilities for token storage
export async function encryptToken(plaintext: string): Promise<string> {
  const encryptionKey = getEnvVar('ENCRYPTION_KEY');
  
  // For Deno, we use the Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Derive a key from the encryption key
  const keyData = encoder.encode(encryptionKey);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData.slice(0, 32), // Use first 32 bytes for AES-256
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  // Combine IV and encrypted data, then base64 encode
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

export async function decryptToken(ciphertext: string): Promise<string> {
  const encryptionKey = getEnvVar('ENCRYPTION_KEY');
  
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Decode from base64
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  
  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  // Derive key
  const keyData = encoder.encode(encryptionKey);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData.slice(0, 32),
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

// Database helpers - Centralized OAuth Credentials
export function getCentralizedOAuthCreds(): WorkspaceCredentials {
  return {
    client_id: getEnvVar('GOOGLE_CLIENT_ID'),
    client_secret: getEnvVar('GOOGLE_CLIENT_SECRET'),
    redirect_uri: getEnvVar('GOOGLE_REDIRECT_URI'),
  };
}

// Legacy: Get workspace credentials (deprecated, but kept for migration period)
export async function getWorkspaceCreds(
  supabaseAdmin: any,
  workspace_id: string,
  kind: 'gmail' | 'calendar'
): Promise<WorkspaceCredentials> {
  // Try centralized credentials first
  try {
    return getCentralizedOAuthCreds();
  } catch {
    // Fallback to workspace credentials if centralized not configured
    const { data, error } = await supabaseAdmin
      .from('workspace_integrations')
      .select('client_id, client_secret, redirect_uri')
      .eq('workspace_id', workspace_id)
      .eq('provider', 'google')
      .eq('kind', kind)
      .single();

    if (error || !data) {
      throw new Error(`No OAuth credentials configured for ${kind}. Please configure centralized Google OAuth credentials.`);
    }

    return data;
  }
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
  // Encrypt tokens before storing if ENCRYPTION_KEY is available
  let integrationToStore = { ...integration };
  
  try {
    if (integration.access_token) {
      integrationToStore.access_token = await encryptToken(integration.access_token);
    }
    if (integration.refresh_token) {
      integrationToStore.refresh_token = await encryptToken(integration.refresh_token);
    }
  } catch (encryptError) {
    console.warn('Token encryption failed, storing in plaintext (ENCRYPTION_KEY may not be configured):', encryptError);
    // If encryption fails, proceed with plaintext (backwards compatible)
  }

  const { data, error } = await supabaseAdmin
    .from('user_integrations')
    .upsert(integrationToStore, { onConflict: 'user_id,provider,kind' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getUserIntegrationWithDecryption(
  supabaseAdmin: any,
  user_id: string,
  kind: 'gmail' | 'calendar'
): Promise<UserIntegration | null> {
  const integration = await getUserIntegration(supabaseAdmin, user_id, kind);
  
  if (!integration) {
    return null;
  }

  // Decrypt tokens if they appear to be encrypted
  try {
    if (integration.access_token && integration.access_token.length > 100) {
      // Likely encrypted (base64 encoded encrypted data is longer)
      integration.access_token = await decryptToken(integration.access_token);
    }
    if (integration.refresh_token && integration.refresh_token.length > 100) {
      integration.refresh_token = await decryptToken(integration.refresh_token);
    }
  } catch (decryptError) {
    console.warn('Token decryption failed, assuming plaintext:', decryptError);
    // If decryption fails, assume tokens are in plaintext (backwards compatible)
  }

  return integration;
}

// Get environment variables with better error handling
export function getEnvVar(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    console.error(`[CRITICAL] Missing environment variable: ${name}`);
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

// Safe environment variable getter that doesn't throw
export function getEnvVarSafe(name: string, defaultValue: string = ''): string {
  const value = Deno.env.get(name);
  if (!value) {
    console.warn(`[WARNING] Missing environment variable: ${name}, using default: ${defaultValue || 'empty'}`);
    return defaultValue;
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
