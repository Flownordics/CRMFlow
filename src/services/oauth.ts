import { supabase } from "@/integrations/supabase/client";

export type GoogleOAuthKind = 'gmail' | 'calendar';

/**
 * Start Google OAuth flow for the specified kind
 * This will redirect the user to Google's OAuth consent screen
 */
export async function startGoogleConnect(
  kind: GoogleOAuthKind,
  googleClientId: string,
  googleClientSecret: string
): Promise<void> {
  try {
    // First, store the user's Google credentials temporarily
    // We'll use this in the callback to complete the OAuth flow
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Store credentials in localStorage temporarily for the OAuth flow
    // In production, you might want to use a more secure method
    localStorage.setItem('google_oauth_temp', JSON.stringify({
      userId: user.id,
      kind,
      googleClientId,
      googleClientSecret,
      timestamp: Date.now()
    }));

    // Redirect to our Edge Function that will start the OAuth flow
    const redirectUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth-start?kind=${kind}`;
    window.location.href = redirectUrl;

  } catch (error) {
    console.error('[oauth] Failed to start Google OAuth:', error);
    throw error;
  }
}

/**
 * Handle OAuth callback
 * This should be called from the OAuth callback route
 */
export async function handleGoogleCallback(): Promise<{ success: boolean; message: string }> {
  try {
    // Get the temporary stored credentials
    const tempData = localStorage.getItem('google_oauth_temp');
    if (!tempData) {
      throw new Error("No OAuth session found");
    }

    const { userId, kind, googleClientId, googleClientSecret, timestamp } = JSON.parse(tempData);
    
    // Check if the session is still valid (within 10 minutes)
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      localStorage.removeItem('google_oauth_temp');
      throw new Error("OAuth session expired");
    }

    // Get the authorization code from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }

    if (!code) {
      throw new Error("No authorization code received");
    }

    // Exchange the code for tokens via our Edge Function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        code,
        userId,
        kind,
        googleClientId,
        googleClientSecret,
        redirectUri: `${window.location.origin}/oauth/google/callback`
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to complete OAuth flow');
    }

    const result = await response.json();
    
    // Clean up temporary data
    localStorage.removeItem('google_oauth_temp');

    // Redirect back to settings with success message
    window.location.href = `/settings?connected=google-${kind}&email=${encodeURIComponent(result.email)}`;

    return { success: true, message: `Successfully connected ${kind}` };

  } catch (error) {
    console.error('[oauth] Failed to handle Google callback:', error);
    
    // Clean up on error
    localStorage.removeItem('google_oauth_temp');
    
    // Redirect back to settings with error
    window.location.href = `/settings?error=oauth_failed&message=${encodeURIComponent(error.message)}`;
    
    return { success: false, message: error.message };
  }
}

/**
 * Disconnect Google integration
 */
export async function disconnectGoogle(kind: GoogleOAuthKind): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Call our API to remove the integration
    const response = await fetch(`/api/integrations/google/${kind}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to disconnect integration');
    }

    // Redirect back to settings
    window.location.href = `/settings?disconnected=google-${kind}`;

  } catch (error) {
    console.error('[oauth] Failed to disconnect Google:', error);
    throw error;
  }
}

/**
 * Check if user has valid Google OAuth credentials stored
 */
export function hasStoredGoogleCredentials(): boolean {
  const tempData = localStorage.getItem('google_oauth_temp');
  if (!tempData) return false;
  
  try {
    const { timestamp } = JSON.parse(tempData);
    // Check if session is still valid (within 10 minutes)
    return Date.now() - timestamp <= 10 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Clear any stored OAuth data
 */
export function clearOAuthData(): void {
  localStorage.removeItem('google_oauth_temp');
}
