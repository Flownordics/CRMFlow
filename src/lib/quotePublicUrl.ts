/**
 * Generate public URL for a quote token
 * Uses VITE_APP_URL if set (for production), otherwise falls back to window.location.origin
 */
export function generatePublicUrl(token: string): string {
  // Use production URL if set (for emails sent from local dev)
  const productionUrl = import.meta.env.VITE_APP_URL;
  const baseUrl = productionUrl || window.location.origin;
  
  // Remove trailing slash if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  
  return `${cleanBaseUrl}/quote/${token}`;
}
