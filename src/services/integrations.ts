import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logger } from '@/lib/logger';

// Types
export interface WorkspaceIntegration {
  id: string;
  workspace_id: string;
  provider: 'google';
  kind: 'gmail' | 'calendar';
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  created_at: string;
  updated_at: string;
}

export interface UserIntegration {
  id: string;
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
  created_at: string;
  updated_at: string;
}

export interface IntegrationStatus {
  connected: boolean;
  email?: string;
  expiresAt?: string;
  lastSyncedAt?: string;
}

// Workspace Integration Functions
export async function getWorkspaceIntegrations(kind?: 'gmail' | 'calendar'): Promise<WorkspaceIntegration[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get workspace ID from workspace_settings (single-tenant)
    const { data: workspaceSettings } = await supabase
      .from('workspace_settings')
      .select('id')
      .limit(1)
      .single();

    if (!workspaceSettings) {
      throw new Error("Workspace not configured");
    }

    let query = supabase
      .from('workspace_integrations')
      .select('*')
      .eq('workspace_id', workspaceSettings.id)
      .eq('provider', 'google');

    if (kind) {
      query = query.eq('kind', kind);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []) as WorkspaceIntegration[];
  } catch (error) {
    logger.error('Failed to get workspace integrations:', error);
    throw error;
  }
}

export async function upsertWorkspaceIntegration(
  kind: 'gmail' | 'calendar',
  credentials: { client_id: string; client_secret: string; redirect_uri: string }
): Promise<WorkspaceIntegration> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get workspace ID from workspace_settings (single-tenant)
    const { data: workspaceSettings } = await supabase
      .from('workspace_settings')
      .select('id')
      .limit(1)
      .single();

    if (!workspaceSettings) {
      throw new Error("Workspace not configured");
    }

    const { data, error } = await supabase
      .from('workspace_integrations')
      .upsert({
        workspace_id: workspaceSettings.id,
        provider: 'google',
        kind: kind,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        redirect_uri: credentials.redirect_uri,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'workspace_id,provider,kind'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as WorkspaceIntegration;
  } catch (error) {
    logger.error('Failed to upsert workspace integration:', error);
    throw error;
  }
}

// User Integration Functions
export async function getUserIntegrations(): Promise<UserIntegration[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google');

    if (error) {
      throw error;
    }

    return (data || []) as UserIntegration[];
  } catch (error) {
    logger.error('Failed to get user integrations:', error);
    throw error;
  }
}

type GoogleKind = "gmail" | "calendar";

export async function startGoogleConnect(kind: GoogleKind, mode: "redirect" | "popup" = "redirect"): Promise<void> {
  try {
    // 1) get access token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }

    // 2) call start function with Authorization
    const FUNCTIONS_BASE = import.meta.env.VITE_SUPABASE_URL + "/functions/v1";
    const res = await fetch(`${FUNCTIONS_BASE}/google-oauth-start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ provider: "google", kind }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`oauth-start failed: ${res.status} ${text}`);
    }

    const { authUrl } = await res.json();

    if (mode === "redirect") {
      window.location.assign(authUrl); // full-page redirect (avoids COOP popup issues)
      return;
    }

    // optional popup path (only for local dev)
    const w = window.open(authUrl, "_blank", "noopener,noreferrer,width=500,height=650");
    if (!w) {
      throw new Error("Popup blocked");
    }
  } catch (error) {
    logger.error('Failed to start Google OAuth:', error);
    throw error;
  }
}

export async function disconnectIntegration(kind: 'gmail' | 'calendar'): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase
      .from('user_integrations')
      .update({
        access_token: null,
        refresh_token: null,
        expires_at: null,
        scopes: null,
        last_synced_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('kind', kind);

    if (error) {
      throw error;
    }
  } catch (error) {
    logger.error('Failed to disconnect integration:', error);
    throw error;
  }
}

export async function getIntegrationStatus(kind: 'gmail' | 'calendar'): Promise<IntegrationStatus> {
  try {
    const integrations = await getUserIntegrations();
    const integration = integrations.find(i => i.kind === kind);

    if (!integration) {
      return { connected: false };
    }

    return {
      connected: true,
      email: integration.email,
      expiresAt: integration.expires_at,
      lastSyncedAt: integration.last_synced_at
    };
  } catch (error) {
    logger.error(`Failed to get ${kind} integration status:`, error);
    return { connected: false };
  }
}

export async function deleteUserIntegration(kind: 'gmail' | 'calendar'): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase
      .from('user_integrations')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('kind', kind);

    if (error) {
      throw error;
    }
  } catch (error) {
    logger.error(`Failed to delete ${kind} integration:`, error);
    throw error;
  }
}

// React Query Hooks
export function useWorkspaceIntegrations(kind?: 'gmail' | 'calendar') {
  return useQuery({
    queryKey: ['workspace-integrations', kind],
    queryFn: () => getWorkspaceIntegrations(kind),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUserIntegrations() {
  return useQuery({
    queryKey: ['user-integrations'],
    queryFn: getUserIntegrations,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useIntegrationStatus(kind: 'gmail' | 'calendar') {
  return useQuery({
    queryKey: ['integration-status', kind],
    queryFn: () => getIntegrationStatus(kind),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useUpsertWorkspaceIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ kind, credentials }: { kind: 'gmail' | 'calendar'; credentials: any }) =>
      upsertWorkspaceIntegration(kind, credentials),
    onSuccess: () => {
      // Invalidate and refetch workspace integrations
      queryClient.invalidateQueries({ queryKey: ['workspace-integrations'] });
    },
  });
}

export function useDeleteUserIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUserIntegration,
    onSuccess: () => {
      // Invalidate and refetch user integrations
      queryClient.invalidateQueries({ queryKey: ['user-integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integration-status'] });
    },
  });
}

// Legacy functions for backward compatibility
export async function getGmailStatus(): Promise<{ connected: boolean; email?: string }> {
  try {
    const integrations = await getUserIntegrations();
    const gmailIntegration = integrations.find(i => i.kind === 'gmail');

    if (!gmailIntegration) {
      return { connected: false };
    }

    return {
      connected: true,
      email: gmailIntegration.email || ""
    };
  } catch (error) {
    logger.warn("[integrations] gmail status err:", error);
    return { connected: false };
  }
}

export async function getGmailEmail(): Promise<string | null> {
  try {
    const integrations = await getUserIntegrations();
    return integrations.find(i => i.kind === 'gmail')?.email || null;
  } catch (error) {
    logger.error("[integrations] Failed to get Gmail email:", error);
    return null;
  }
}

export async function refreshGoogleTokenIfNeeded(kind: 'gmail' | 'calendar', options?: { force?: boolean }): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get current integration
    const integrations = await getUserIntegrations();
    const integration = integrations.find(i => i.kind === kind && i.provider === 'google');

    if (!integration || !integration.expires_at) {
      return false; // No integration or no expiration time
    }

    // If force refresh is requested, skip expiration check
    if (!options?.force) {
      // Check if token expires in less than 2 minutes
      const expiresAt = new Date(integration.expires_at);
      const now = new Date();
      const twoMinutesFromNow = new Date(now.getTime() + 2 * 60 * 1000);

      if (expiresAt > twoMinutesFromNow) {
        return false; // Token is still valid
      }
    }

    // Call Edge Function to refresh token
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        integrationId: integration.id
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const result = await response.json();

    // Update the integration with new tokens
    if (result.accessToken) {
      await supabase
        .from('user_integrations')
        .update({
          access_token: result.accessToken,
          refresh_token: result.refreshToken || integration.refresh_token,
          expires_at: result.expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', integration.id);
      return true;
    }

    return false;
  } catch (error) {
    logger.error("[integrations] Failed to refresh Google token:", error);
    throw error;
  }
}

// React hooks for Gmail integration
export function useIsGmailConnected() {
  return useQuery({
    queryKey: ['gmail-status'],
    queryFn: getGmailStatus,
    staleTime: 60_000, // 1 minute
  });
}

export function useGmailEmail() {
  return useQuery({
    queryKey: ['gmail-email'],
    queryFn: getGmailEmail,
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Get authentication headers with Supabase session access token
 */
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

/**
 * Fetches the Google OAuth URL from the edge function with Authorization header
 * Returns the authorizeUrl for the UI to handle
 */
export async function startGoogleOAuth(kind: "gmail" | "calendar", workspaceId: string): Promise<string> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth-start?kind=${encodeURIComponent(kind)}&workspace_id=${encodeURIComponent(workspaceId)}`,
    { method: "POST", headers }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[start] ${res.status} ${text}`);
  }
  const { authorizeUrl } = await res.json();
  return authorizeUrl;
}

/**
 * Opens a popup synchronously and navigates it to the Google OAuth URL
 */
export async function openGoogleOAuthPopup(kind: "gmail" | "calendar", workspaceId: string) {
  // 1) Open a popup synchronously to avoid blockers
  const w = window.open("about:blank", "google_oauth", "width=520,height=640");
  if (!w) throw new Error("Popup blocked. Please allow popups for this site.");

  try {
    const authorizeUrl = await startGoogleOAuth(kind, workspaceId);
    // 2) Navigate popup to Google
    w.location.href = authorizeUrl;
  } catch (err) {
    // Close empty popup if something failed
    try { w.close(); } catch { }
    throw err;
  }
}
