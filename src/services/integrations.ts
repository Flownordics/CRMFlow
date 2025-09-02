import { api, apiClient, normalizeApiData } from "../lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { UserIntegration, UserIntegrationCreate, UserIntegrationUpdate } from "@/types/integrations";
import { supabase } from "@/integrations/supabase/client";

// =========================================
// API Functions
// =========================================

/**
 * Get all integrations for the current user
 */
export async function getUserIntegrations(): Promise<{
  gmail?: { email: string; expiresAt?: string; connected: boolean };
  calendar?: { email: string; expiresAt?: string; connected: boolean };
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const res = await apiClient.get(`/user_integrations?select=*&user_id=eq.${user.id}`);
    const list = normalizeApiData(res);
    const out: any = {};

    (Array.isArray(list) ? list : []).forEach((row: any) => {
      if (row.kind === "gmail" && row.provider === "google") {
        out.gmail = { email: row.email ?? "", expiresAt: row.expires_at ?? "", connected: true };
      }
      if (row.kind === "calendar" && row.provider === "google") {
        out.calendar = { email: row.email ?? "", expiresAt: row.expires_at ?? "", connected: true };
      }
    });

    return out;
  } catch (e) {
    console.error("[integrations] status error:", e);
    return {}; // fail-safe, UI viser "Connect"
  }
}

/**
 * Create or update a user integration
 */
export async function upsertUserIntegration(payload: UserIntegrationCreate): Promise<UserIntegration> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const response = await apiClient.post(
      `/user_integrations`,
      payload,
      {
        headers: {
          'Prefer': 'resolution=merge-duplicates,return=representation'
        }
      }
    );

    const raw = normalizeApiData(response);
    return Array.isArray(raw) ? raw[0] : raw;
  } catch (error) {
    console.error("[integrations] Failed to upsert user integration:", error);
    throw error;
  }
}

/**
 * Delete a user integration by kind
 */
export async function deleteUserIntegration(kind: 'gmail' | 'calendar'): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    await apiClient.delete(
      `/user_integrations?user_id=eq.${user.id}&kind=eq.${kind}`
    );
  } catch (error) {
    console.error("[integrations] Failed to delete user integration:", error);
    throw error;
  }
}



// =========================================
// React Query Hooks
// =========================================

export function useUserIntegrations() {
  return useQuery({
    queryKey: qk.integrations.all(),
    queryFn: getUserIntegrations,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUserIntegration(kind: 'gmail' | 'calendar') {
  return useQuery({
    queryKey: qk.integrations.byKind(kind),
    queryFn: async () => {
      const integrations = await getUserIntegrations();
      return integrations.find(i => i.kind === kind);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpsertUserIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertUserIntegration,
    onSuccess: () => {
      // Invalidate and refetch integrations
      queryClient.invalidateQueries({ queryKey: qk.integrations.all() });
    },
  });
}

export function useDeleteUserIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUserIntegration,
    onSuccess: () => {
      // Invalidate and refetch integrations
      queryClient.invalidateQueries({ queryKey: qk.integrations.all() });
    },
  });
}

export function useRefreshGoogleToken() {
  return useMutation({
    mutationFn: refreshGoogleTokenIfNeeded,
  });
}

/**
 * Hook to check if Gmail is connected
 */
export function useIsGmailConnected() {
  return useQuery({
    queryKey: qk.integrations.gmail(),
    queryFn: isGmailConnected,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get Gmail email if connected
 */
export function useGmailEmail() {
  return useQuery({
    queryKey: qk.integrations.gmailEmail(),
    queryFn: getGmailEmail,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Check if Gmail is connected and return email
 */
export async function isGmailConnected(): Promise<boolean> {
  try {
    const integrations = await getUserIntegrations();
    return !!integrations.gmail;
  } catch (error) {
    console.error("[integrations] Failed to check Gmail connection:", error);
    return false;
  }
}

/**
 * Get stable Gmail status without throwing on 406/401
 */
export async function getGmailStatus(): Promise<{ connected: boolean; email?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { connected: false };
    }

    // First check if the table exists and is accessible
    const { data: integrations, error } = await supabase
      .from('user_integrations')
      .select('id, email')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('kind', 'gmail');

    if (error) {
      console.warn("[integrations] Database error:", error);
      // If it's a 406 or table doesn't exist, return not connected
      if (error.code === '406' || error.message?.includes('does not exist')) {
        return { connected: false };
      }
      return { connected: false };
    }

    if (!integrations || integrations.length === 0) {
      return { connected: false };
    }

    const integration = integrations[0];
    return {
      connected: true,
      email: integration.email || ""
    };
  } catch (error) {
    console.warn("[integrations] gmail status err:", error);
    return { connected: false };
  }
}

/**
 * Get Gmail email if connected
 */
export async function getGmailEmail(): Promise<string | null> {
  try {
    const integrations = await getUserIntegrations();
    return integrations.gmail?.email || null;
  } catch (error) {
    console.error("[integrations] Failed to get Gmail email:", error);
    return null;
  }
}

/**
 * Refresh Google access token if it's expired or about to expire
 */
export async function refreshGoogleTokenIfNeeded(kind: 'gmail' | 'calendar', options?: { force?: boolean }): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get current integration
    const integrations = await getUserIntegrations();
    const integration = integrations.find(i => i.kind === kind && i.provider === 'google');

    if (!integration || !integration.expiresAt) {
      return false; // No integration or no expiration time
    }

    // If force refresh is requested, skip expiration check
    if (!options?.force) {
      // Check if token expires in less than 2 minutes
      const expiresAt = new Date(integration.expiresAt);
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
        userId: user.id,
        kind,
        refreshToken: integration.refreshToken
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const result = await response.json();

    // Update the integration with new tokens
    if (result.accessToken) {
      await upsertUserIntegration({
        ...integration,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken || integration.refreshToken,
        expiresAt: result.expiresAt
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error("[integrations] Failed to refresh Google token:", error);
    throw error;
  }
}
