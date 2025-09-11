// Netlify Edge Function using Node.js runtime
export default async function handler(request) {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: corsHeaders
        });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            {
                status: 405,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }

    try {
        const body = await request.json();
        const { quote_id, recipient_email, recipient_name, message } = body;

        if (!quote_id || !recipient_email) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: quote_id and recipient_email' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // Get environment variables
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return new Response(
                JSON.stringify({ error: 'Missing environment variables' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // Get user's access token from Authorization header
        const auth = request.headers.get("authorization") || "";
        if (!auth.startsWith("Bearer ")) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }
        const accessToken = auth.slice("Bearer ".length);

        // Create Supabase client with service role key for admin operations
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get user info from the access token
        const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid access token' }),
                {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // Get quote info
        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .select(`
        *,
        line_items!parent_id (*),
        companies (*),
        people (*)
      `)
            .eq('id', quote_id)
            .single();

        if (quoteError || !quote) {
            return new Response(
                JSON.stringify({ error: 'Quote not found' }),
                {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // Check if user has permission to send this quote
        if (quote.user_id !== user.id) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized to send this quote' }),
                {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // Get user's email integration (Google Gmail or fallback)
        const { data: integration, error: integrationError } = await supabase
            .from('user_integrations')
            .select('*')
            .eq('user_id', user.id)
            .eq('provider', 'google')
            .eq('kind', 'gmail')
            .single();

        let emailSent = false;
        let emailError = null;

        if (integration && !integrationError) {
            // Try to send via Gmail API
            try {
                const emailHtml = generateQuoteEmail(quote, message);

                const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${integration.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        raw: Buffer.from(
                            `To: ${recipient_email}\r\n` +
                            `From: ${integration.provider_user_email}\r\n` +
                            `Subject: Tilbud: ${quote.number || quote.quote_number || quote.id}\r\n` +
                            `Content-Type: text/html; charset=utf-8\r\n` +
                            `\r\n` +
                            `${emailHtml}`
                        ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
                    }),
                });

                if (gmailResponse.ok) {
                    emailSent = true;
                } else {
                    emailError = `Gmail API error: ${gmailResponse.status}`;
                }
            } catch (error) {
                emailError = `Gmail API error: ${error.message}`;
            }
        }

        // If Gmail failed, try fallback email service
        if (!emailSent) {
            const fallbackEnabled = process.env.FEATURE_EMAIL_FALLBACK === 'true';
            const resendApiKey = process.env.VITE_RESEND_API_KEY;

            if (fallbackEnabled && resendApiKey) {
                try {
                    const emailHtml = generateQuoteEmail(quote, message);

                    const resendResponse = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${resendApiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            from: process.env.VITE_EMAIL_FROM || 'sales@yourdomain.com',
                            to: recipient_email,
                            subject: `Tilbud: ${quote.number || quote.quote_number || quote.id}`,
                            html: emailHtml,
                        }),
                    });

                    if (resendResponse.ok) {
                        emailSent = true;
                    } else {
                        emailError = `Resend API error: ${resendResponse.status}`;
                    }
                } catch (error) {
                    emailError = `Resend API error: ${error.message}`;
                }
            }
        }

        if (!emailSent) {
            return new Response(
                JSON.stringify({
                    error: 'Failed to send email',
                    details: emailError || 'No email service available'
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // Update quote status to sent
        const { error: updateError } = await supabase
            .from('quotes')
            .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                recipient_email: recipient_email,
                recipient_name: recipient_name || null,
            })
            .eq('id', quote_id);

        if (updateError) {
            console.error('Failed to update quote status:', updateError);
        }

        // Log the email
        const { error: logError } = await supabase
            .from('email_logs')
            .insert({
                user_id: user.id,
                to: recipient_email,
                from: integration?.provider_user_email || process.env.VITE_EMAIL_FROM || 'sales@yourdomain.com',
                subject: `Tilbud: ${quote.number || quote.quote_number || quote.id}`,
                provider: integration ? 'google' : 'resend',
                status: 'sent',
                related_id: quote_id,
                related_type: 'quote',
            });

        if (logError) {
            console.error('Failed to log email:', logError);
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Quote sent successfully',
                emailSent: true,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('Error in send-quote function:', error);
        return new Response(
            JSON.stringify({
                error: 'Internal server error',
                details: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
}

function generateQuoteEmail(quote, message) {
    const company = quote.companies || {};
    const person = quote.people || {};

    let linesHtml = '';
    if (quote.line_items && quote.line_items.length > 0) {
        linesHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Description</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">Quantity</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">Unit Price</th>
            <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${quote.line_items.map(line => `
            <tr>
              <td style="padding: 12px; border: 1px solid #dee2e6;">${line.description || ''}</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">${line.qty || 0}</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">${(line.unit_minor || 0) / 100}</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">${((line.qty || 0) * (line.unit_minor || 0)) / 100}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Tilbud: ${quote.number || quote.quote_number || quote.id}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px;">
        Tilbud: ${quote.number || quote.quote_number || quote.id}
      </h1>
      
      <div style="margin: 20px 0;">
        <h3>Virksomhedsoplysninger</h3>
        <p><strong>Virksomhed:</strong> ${company.name || 'N/A'}</p>
        <p><strong>Kontakt:</strong> ${person.name || person.first_name || ''} ${person.last_name || ''}</p>
        <p><strong>Email:</strong> ${person.email || 'N/A'}</p>
      </div>

      ${linesHtml}

      <div style="margin: 20px 0; text-align: right;">
        <h2>Total: ${new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format((quote.total_minor || 0) / 100)}</h2>
      </div>

      ${message ? `<div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #3498db;">
        <strong>Besked:</strong><br>
        ${message}
      </div>` : ''}

      <div style="margin: 20px 0; padding: 15px; background-color: #e8f5e8; border: 1px solid #28a745; border-radius: 5px;">
        <p style="margin: 0;"><strong>Tilbud ID:</strong> ${quote.id}</p>
        <p style="margin: 5px 0 0 0;"><strong>Gyldig til:</strong> ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('da-DK') : 'N/A'}</p>
      </div>

      ${message ? `<hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
      <p style="text-align: center; color: #6c757d; font-size: 14px;">
        Dette tilbud blev genereret af CRMFlow. Kontakt os venligst hvis du har spørgsmål.
      </p>` : ''}
    </body>
    </html>
  `;
}
