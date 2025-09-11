import { corsHeaders, okJson, errorJson, getUserIntegration, upsertUserIntegration, createSupabaseAdmin, getEnvVar } from '../_shared/oauth-utils.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders(),
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return errorJson(405, 'Method not allowed');
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorJson(401, 'Missing or invalid authorization header');
    }

    const accessToken = authHeader.slice('Bearer '.length);

    // Create Supabase admin client
    const supabaseAdmin = createSupabaseAdmin();

    // Verify user token and get user info
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    if (userError || !user) {
      return errorJson(401, 'Invalid access token');
    }

    // Get request body
    const body = await req.json();
    const { to, subject, html, text, quoteId, invoiceId } = body;

    if (!to || !subject || (!html && !text)) {
      return errorJson(400, 'Missing required fields: to, subject, and either html or text');
    }

    // Get user's Gmail integration
    const integration = await getUserIntegration(supabaseAdmin, user.id, 'gmail');
    if (!integration || !integration.access_token) {
      return errorJson(400, 'Gmail integration not found or missing access token');
    }

    // Check if token is expired and refresh if needed
    let accessToken = integration.access_token;
    const now = new Date();
    const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;

    if (expiresAt && expiresAt <= now) {
      // Token expired, refresh it
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
          refresh_token: integration.refresh_token || '',
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        return errorJson(400, 'Failed to refresh Gmail access token');
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update integration with new token
      await upsertUserIntegration(supabaseAdmin, {
        ...integration,
        access_token: accessToken,
        expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        last_synced_at: new Date().toISOString(),
      });
    }

    // Build MIME message
    const boundary = 'boundary_' + Math.random().toString(36).substring(2);
    const mimeMessage = [
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      `To: ${to}`,
      `Subject: ${subject}`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      text || html.replace(/<[^>]*>/g, ''), // Strip HTML if no text provided
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      html || text,
      ``,
      `--${boundary}--`,
    ].join('\r\n');

    // Encode message in base64url
    const encodedMessage = btoa(mimeMessage)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email via Gmail API
    const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    });

    if (!sendResponse.ok) {
      const errorData = await sendResponse.text();
      console.error('Gmail send failed:', errorData);
      return errorJson(400, 'Failed to send email via Gmail');
    }

    const sendData = await sendResponse.json();
    const messageId = sendData.id;

    // Log email in email_logs table (if it exists)
    try {
      await supabaseAdmin
        .from('email_logs')
        .insert({
          user_id: user.id,
          quote_id: quoteId,
          invoice_id: invoiceId,
          recipient_email: to,
          subject,
          message_id: messageId,
          provider: 'gmail',
          status: 'sent',
          sent_at: new Date().toISOString(),
        });
    } catch (logError) {
      console.warn('Failed to log email:', logError);
      // Don't fail the request if logging fails
    }

    return okJson({
      ok: true,
      messageId,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('Gmail send error:', error);
    return errorJson(500, 'Internal server error');
  }
});
