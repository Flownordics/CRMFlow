// Netlify Function using Node.js runtime
import { createClient } from '@supabase/supabase-js';

export const handler = async (event, context) => {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { orderId, order_id, recipient_email, to, subject, message } = body;

        // Support both orderId and order_id for compatibility
        const orderIdValue = orderId || order_id;
        const recipientEmail = recipient_email || to;

        console.log('Request body:', { orderId, order_id, recipient_email, to, subject, message });
        console.log('Parsed values:', { orderIdValue, recipientEmail });

        if (!orderIdValue || !recipientEmail || !subject) {
            return {
                statusCode: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'Missing required fields',
                    details: {
                        orderId: orderIdValue,
                        recipientEmail,
                        subject
                    }
                })
            };
        }

        // Get environment variables
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return {
                statusCode: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'Missing environment variables',
                    details: {
                        SUPABASE_URL: !!supabaseUrl,
                        SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey
                    }
                })
            };
        }

        // Get user from Authorization header
        const authHeader = event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Missing or invalid authorization header' })
            };
        }

        const accessToken = authHeader.slice('Bearer '.length);

        // Create Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        });

        // Verify user token
        const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
        if (userError || !user) {
            return {
                statusCode: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Invalid access token' })
            };
        }

        // Get user's Gmail integration
        console.log('Looking for Gmail integration for user:', user.id);
        const { data: integration, error: integrationError } = await supabase
            .from('user_integrations')
            .select('*')
            .eq('user_id', user.id)
            .eq('provider', 'google')
            .eq('kind', 'gmail')
            .single();

        if (integrationError || !integration?.access_token) {
            console.error('Gmail integration not found');
            return {
                statusCode: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'Gmail integration not found or missing access token'
                })
            };
        }

        // Use centralized Google OAuth credentials from environment variables
        console.log('Using centralized Google OAuth credentials from environment');
        const workspaceCredentials = {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET
        };

        if (!workspaceCredentials.client_id || !workspaceCredentials.client_secret) {
            console.error('Missing Google OAuth credentials in Netlify environment');
            return {
                statusCode: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'Google OAuth credentials not configured'
                })
            };
        }

        // Check if token is expired and refresh if needed
        let gmailAccessToken = integration.access_token;
        const now = new Date();
        const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;

        if (expiresAt && expiresAt <= now) {
            console.log('Token expired, attempting refresh...');

            const googleClientId = workspaceCredentials.client_id;
            const googleClientSecret = workspaceCredentials.client_secret;

            if (!integration.refresh_token) {
                return {
                    statusCode: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: 'Missing refresh token. Please reconnect Gmail.' })
                };
            }

            // Refresh token
            const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: googleClientId,
                    client_secret: googleClientSecret,
                    refresh_token: integration.refresh_token,
                    grant_type: 'refresh_token',
                }),
            });

            if (!refreshResponse.ok) {
                const errorText = await refreshResponse.text();
                console.error('Token refresh failed:', errorText);
                return {
                    statusCode: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: 'Failed to refresh Gmail access token' })
                };
            }

            const refreshData = await refreshResponse.json();
            gmailAccessToken = refreshData.access_token;

            // Update integration with new token
            await supabase
                .from('user_integrations')
                .update({
                    access_token: gmailAccessToken,
                    expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
                })
                .eq('id', integration.id);
        }

        // Generate PDF order using Netlify function
        console.log('Generating PDF order for order ID:', orderIdValue);

        let pdfBase64 = null;
        let pdfFilename = `order-${orderIdValue}.pdf`;

        try {
            const pdfRequestBody = {
                type: 'order',
                data: { id: orderIdValue },
                user: { id: user.id }
            };

            const pdfResponse = await fetch('https://crmflow-app.netlify.app/.netlify/functions/pdf-react', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(pdfRequestBody)
            });

            if (!pdfResponse.ok) {
                const errorText = await pdfResponse.text();
                console.error('PDF generation failed:', errorText);
                return {
                    statusCode: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: 'PDF generation failed' })
                };
            }

            // pdf-react returns JSON with base64 PDF already encoded
            const pdfData = await pdfResponse.json();
            pdfBase64 = pdfData.pdf; // Already base64 encoded!
            pdfFilename = pdfData.filename || pdfFilename;
            console.log('PDF generated successfully, base64 length:', pdfBase64.length, 'chars');
        } catch (pdfError) {
            console.error('PDF generation error:', pdfError);
            return {
                statusCode: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'PDF generation failed' })
            };
        }

        // Generate email content
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Order Confirmation</h2>
                <p>Please find your order confirmation attached.</p>
                ${message ? `<p>${message.replace(/\n/g, '<br>')}</p>` : ''}
                <p style="margin-top: 30px;">Best regards,<br>Your Sales Team</p>
            </div>
        `;

        const textContent = `
Order Confirmation

Please find your order confirmation attached.

${message || ''}

Best regards,
Your Sales Team
        `.trim();

        // Build MIME message with PDF attachment
        const boundary = 'boundary_' + Math.random().toString(36).substring(2);

        // Chunk base64 data into 76-character lines for proper MIME formatting
        const pdfBase64Chunked = pdfBase64.match(/.{1,76}/g)?.join('\r\n') || pdfBase64;
        
        const attachmentBoundary = 'attachment_' + Math.random().toString(36).substring(2);
        const mimeMessage = [
            `MIME-Version: 1.0`,
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            `To: ${recipientEmail}`,
            `Subject: ${subject}`,
            ``,
            `--${boundary}`,
            `Content-Type: multipart/alternative; boundary="${attachmentBoundary}"`,
            ``,
            `--${attachmentBoundary}`,
            `Content-Type: text/plain; charset=UTF-8`,
            ``,
            textContent,
            ``,
            `--${attachmentBoundary}`,
            `Content-Type: text/html; charset=UTF-8`,
            ``,
            htmlContent,
            ``,
            `--${attachmentBoundary}--`,
            ``,
            `--${boundary}`,
            `Content-Type: application/pdf; name="${pdfFilename}"`,
            `Content-Disposition: attachment; filename="${pdfFilename}"`,
            `Content-Transfer-Encoding: base64`,
            ``,
            pdfBase64Chunked,
            ``,
            `--${boundary}--`,
        ].join('\r\n');

        // Encode message in base64url
        const encodedMessage = Buffer.from(mimeMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // Send email via Gmail API
        console.log('Sending email via Gmail API...');
        const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${gmailAccessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                raw: encodedMessage,
            }),
        });

        if (!sendResponse.ok) {
            const errorData = await sendResponse.text();
            console.error('Gmail send failed:', errorData);
            return {
                statusCode: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Failed to send email via Gmail' })
            };
        }

        const sendData = await sendResponse.json();
        const messageId = sendData.id;
        console.log('Email sent successfully, message ID:', messageId);

        // Log email in email_logs table
        try {
            await supabase
                .from('email_logs')
                .insert({
                    user_id: user.id,
                    related_type: 'order',
                    related_id: orderIdValue,
                    to_email: recipientEmail,
                    subject: subject,
                    provider: 'gmail',
                    provider_message_id: messageId,
                    status: 'sent',
                });
        } catch (logError) {
            console.warn('Failed to log email:', logError);
        }

        return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true,
                messageId,
                message: 'Order email sent successfully'
            })
        };

    } catch (error) {
        console.error('Send order error:', error);
        return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal server error', details: error.message })
        };
    }
};

