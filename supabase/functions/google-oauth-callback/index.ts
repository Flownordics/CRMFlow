import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Parse request body
    const { code, userId, kind, googleClientId, googleClientSecret, redirectUri } = await req.json()

    if (!code || !userId || !kind || !googleClientId || !googleClientSecret || !redirectUri) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate kind
    if (!['gmail', 'calendar'].includes(kind)) {
      return new Response(
        JSON.stringify({ error: 'Invalid kind parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing environment variables' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Google token exchange failed:', errorData)

      return new Response(
        JSON.stringify({ error: 'Failed to exchange authorization code for tokens' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const tokenData = await tokenResponse.json()

    // Check if we got a refresh token
    if (!tokenData.refresh_token) {
      console.warn('No refresh token received from Google OAuth')

      // Check if this is a reconsent scenario
      const { data: existingIntegration } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('kind', kind)
        .eq('provider', 'google')
        .single()

      if (existingIntegration && existingIntegration.refresh_token) {
        // We have an existing refresh token, use it
        tokenData.refresh_token = existingIntegration.refresh_token
        console.log('Using existing refresh token for reconsent')
      } else {
        // No refresh token available, this might be a first-time consent issue
        return new Response(
          JSON.stringify({
            error: 'No refresh token received. Please ensure you have granted offline access.',
            code: 'NO_REFRESH_TOKEN',
            requiresReconsent: true
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Get user info from Google to get email
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info from Google')

      return new Response(
        JSON.stringify({ error: 'Failed to get user information from Google' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const userInfo = await userInfoResponse.json()
    const email = userInfo.email
    const accountId = userInfo.id

    // Define scopes based on kind
    const scopes = kind === 'gmail'
      ? ['https://www.googleapis.com/auth/gmail.send']
      : ['https://www.googleapis.com/auth/calendar'];

    // Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('kind', kind)
      .eq('provider', 'google')
      .single()

    if (existingIntegration) {
      // Update existing integration
      const { error: updateError } = await supabase
        .from('user_integrations')
        .update({
          email: email,
          account_id: accountId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || existingIntegration.refresh_token,
          expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
          scopes: scopes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingIntegration.id)

      if (updateError) {
        console.error('Failed to update integration:', updateError)

        return new Response(
          JSON.stringify({ error: 'Failed to update integration' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } else {
      // Create new integration
      const { error: insertError } = await supabase
        .from('user_integrations')
        .insert({
          user_id: userId,
          provider: 'google',
          kind: kind,
          email: email,
          account_id: accountId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
          scopes: scopes,
        })

      if (insertError) {
        console.error('Failed to create integration:', insertError)

        return new Response(
          JSON.stringify({ error: 'Failed to create integration' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Return success with user info
    return new Response(
      JSON.stringify({
        success: true,
        email: email,
        accountId: accountId,
        kind: kind,
        message: `Successfully connected ${kind}`,
        hasRefreshToken: !!tokenData.refresh_token
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in google-oauth-callback function:', error)

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
