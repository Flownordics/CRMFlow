// Test Edge Function to verify environment variables
// Deploy this to check if all required env vars are set

Deno.serve(async (req) => {
  const envVars = {
    GOOGLE_CLIENT_ID: !!Deno.env.get('GOOGLE_CLIENT_ID'),
    GOOGLE_CLIENT_SECRET: !!Deno.env.get('GOOGLE_CLIENT_SECRET'),
    GOOGLE_REDIRECT_URI: !!Deno.env.get('GOOGLE_REDIRECT_URI'),
    ENCRYPTION_KEY: !!Deno.env.get('ENCRYPTION_KEY'),
    APP_URL: !!Deno.env.get('APP_URL'),
    JWT_SECRET: !!Deno.env.get('JWT_SECRET'),
    SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  };
  
  const values = {
    GOOGLE_CLIENT_ID: Deno.env.get('GOOGLE_CLIENT_ID')?.substring(0, 20) + '...',
    GOOGLE_REDIRECT_URI: Deno.env.get('GOOGLE_REDIRECT_URI'),
    APP_URL: Deno.env.get('APP_URL'),
  };

  return new Response(JSON.stringify({ envVars, values }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

