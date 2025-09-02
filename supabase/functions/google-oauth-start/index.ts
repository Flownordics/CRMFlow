import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the kind parameter from query string
    const url = new URL(req.url);
    const kind = url.searchParams.get('kind');

    if (!kind || !['gmail', 'calendar'].includes(kind)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing kind parameter. Must be "gmail" or "calendar"' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate PKCE code verifier and challenge for enhanced security
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store the code verifier temporarily (in production, use a more secure method)
    // For now, we'll pass it as state parameter
    const state = btoa(JSON.stringify({
      codeVerifier,
      kind,
      timestamp: Date.now()
    }));

    // Define scopes based on kind
    const scopes = kind === 'gmail'
      ? 'https://www.googleapis.com/auth/gmail.send'
      : 'https://www.googleapis.com/auth/calendar';

    // Build Google OAuth URL
    const googleOAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    // We need a client_id for the OAuth URL, but the actual credentials will be provided in the callback
    // For now, we'll use a placeholder that will be replaced by the user's actual client_id
    googleOAuthUrl.searchParams.set('client_id', 'your-google-client-id.apps.googleusercontent.com');
    googleOAuthUrl.searchParams.set('redirect_uri', `${url.origin}/google-oauth-callback`);
    googleOAuthUrl.searchParams.set('response_type', 'code');
    googleOAuthUrl.searchParams.set('scope', scopes);
    googleOAuthUrl.searchParams.set('access_type', 'offline');
    googleOAuthUrl.searchParams.set('prompt', 'consent');
    googleOAuthUrl.searchParams.set('code_challenge', codeChallenge);
    googleOAuthUrl.searchParams.set('code_challenge_method', 'S256');
    googleOAuthUrl.searchParams.set('state', state);

    // Redirect to Google OAuth consent screen
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': googleOAuthUrl.toString()
      }
    });

  } catch (error) {
    console.error('Error in google-oauth-start function:', error);

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Generate a random code verifier for PKCE
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

// Generate code challenge from verifier
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(digest));
}

// Base64URL encoding (RFC 4648)
function base64URLEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
