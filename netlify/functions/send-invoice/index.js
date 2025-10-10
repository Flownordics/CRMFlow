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
        const { invoiceId, invoice_id, recipient_email, to, subject, message } = body;

        // Support both invoiceId and invoice_id for compatibility
        const invoiceIdValue = invoiceId || invoice_id;
        const recipientEmail = recipient_email || to;

        console.log('Request body:', { invoiceId, invoice_id, recipient_email, to, subject, message });
        console.log('Parsed values:', { invoiceIdValue, recipientEmail });

        if (!invoiceIdValue || !recipientEmail || !subject) {
            return {
                statusCode: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'Missing required fields',
                    details: {
                        invoiceId: invoiceIdValue,
                        recipientEmail,
                        subject
                    }
                })
            };
        }

        // Get environment variables
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

        // Environment variables validated silently

        if (!supabaseUrl || !supabaseServiceKey) {
            return {
                statusCode: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'Missing environment variables',
                    details: {
                        SUPABASE_URL: !!supabaseUrl,
                        SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey,
                        available: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
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

        // Create Supabase client with user's access token
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        });

        // Verify user token and get user info
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

        console.log('Integration query result:', {
            integration,
            integrationError,
            hasAccessToken: !!integration?.access_token
        });

        if (integrationError) {
            console.error('Integration query error:', integrationError);
            return {
                statusCode: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'Gmail integration query failed',
                    details: integrationError.message
                })
            };
        }

        if (!integration?.access_token) {
            console.error('No Gmail integration found or missing access token');
            return {
                statusCode: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'Gmail integration not found or missing access token',
                    details: {
                        integrationFound: !!integration,
                        hasAccessToken: !!integration?.access_token,
                        userId: user.id
                    }
                })
            };
        }

        // Get workspace Google OAuth credentials
        console.log('Looking for workspace Google OAuth credentials for workspace:', integration.workspace_id);
        const { data: workspaceCredentials, error: workspaceError } = await supabase
            .from('workspace_integrations')
            .select('client_id, client_secret')
            .eq('workspace_id', integration.workspace_id)
            .eq('provider', 'google')
            .eq('kind', 'gmail')
            .single();

        console.log('Workspace credentials query result:', {
            workspaceCredentials,
            workspaceError,
            hasClientId: !!workspaceCredentials?.client_id,
            hasClientSecret: !!workspaceCredentials?.client_secret
        });

        if (workspaceError) {
            console.error('Workspace credentials query error:', workspaceError);
            return {
                statusCode: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'Workspace Google OAuth credentials not found',
                    details: workspaceError.message
                })
            };
        }

        if (!workspaceCredentials) {
            return {
                statusCode: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Workspace Google OAuth credentials not configured' })
            };
        }

        // Check if token is expired and refresh if needed
        let gmailAccessToken = integration.access_token;
        const now = new Date();
        const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;

        console.log('Token expiration check:', {
            now: now.toISOString(),
            expiresAt: expiresAt?.toISOString(),
            isExpired: expiresAt && expiresAt <= now,
            timeUntilExpiry: expiresAt ? Math.round((expiresAt - now) / 1000 / 60) : 'unknown' // minutes
        });

        if (expiresAt && expiresAt <= now) {
            console.log('Token expired, attempting refresh...');

            // Use workspace Google OAuth credentials
            const googleClientId = workspaceCredentials.client_id || process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
            const googleClientSecret = workspaceCredentials.client_secret || process.env.GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET;

            console.log('Google OAuth credentials check:', {
                hasWorkspaceClientId: !!workspaceCredentials.client_id,
                hasWorkspaceClientSecret: !!workspaceCredentials.client_secret,
                hasEnvClientId: !!process.env.GOOGLE_CLIENT_ID,
                hasEnvClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
                hasRefreshToken: !!integration.refresh_token,
                finalClientId: !!googleClientId,
                finalClientSecret: !!googleClientSecret
            });

            if (!googleClientId || !googleClientSecret || !integration.refresh_token) {
                return {
                    statusCode: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        error: 'Missing Google OAuth credentials for token refresh',
                        details: {
                            hasWorkspaceClientId: !!workspaceCredentials.client_id,
                            hasWorkspaceClientSecret: !!workspaceCredentials.client_secret,
                            hasEnvClientId: !!process.env.GOOGLE_CLIENT_ID,
                            hasEnvClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
                            hasRefreshToken: !!integration.refresh_token,
                            finalClientId: !!googleClientId,
                            finalClientSecret: !!googleClientSecret
                        }
                    })
                };
            }

            // Token expired, refresh it
            const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: googleClientId,
                    client_secret: googleClientSecret,
                    refresh_token: integration.refresh_token,
                    grant_type: 'refresh_token',
                }),
            });

            if (!refreshResponse.ok) {
                const errorText = await refreshResponse.text();
                console.error('Token refresh failed:', {
                    status: refreshResponse.status,
                    statusText: refreshResponse.statusText,
                    error: errorText
                });
                return {
                    statusCode: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        error: 'Failed to refresh Gmail access token',
                        details: {
                            status: refreshResponse.status,
                            statusText: refreshResponse.statusText,
                            error: errorText
                        }
                    })
                };
            }

            const refreshData = await refreshResponse.json();
            gmailAccessToken = refreshData.access_token;

            console.log('Token refresh successful, updating database...');

            // Update integration with new token
            await supabase
                .from('user_integrations')
                .update({
                    access_token: gmailAccessToken,
                    expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
                    last_synced_at: new Date().toISOString(),
                })
                .eq('id', integration.id);
        } else {
            console.log('Token is still valid, using existing token');
        }

        // Generate PDF invoice first using Netlify function
        console.log('Generating PDF invoice for invoice ID:', invoiceIdValue);
        console.log('PDF generator URL: https://crmflow-app.netlify.app/.netlify/functions/pdf-html');

        let pdfBase64 = null;
        let pdfFilename = `invoice-${invoiceIdValue}.pdf`;

        try {
            console.log('Attempting PDF generation...');
            const pdfRequestBody = {
                type: 'invoice',
                data: { id: invoiceIdValue },
                user: { id: user.id }
            };
            console.log('PDF request body:', JSON.stringify(pdfRequestBody));

            // Use Netlify Function for PDF generation (React PDF)
            const netlifyFunctionUrl = 'https://crmflow-app.netlify.app/.netlify/functions/pdf-react';
            console.log('PDF generator URL:', netlifyFunctionUrl);

            const pdfResponse = await fetch(netlifyFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(pdfRequestBody)
            });

            console.log('PDF response status:', pdfResponse.status);
            console.log('PDF response headers:', Object.fromEntries(pdfResponse.headers.entries()));

            if (!pdfResponse.ok) {
                const errorText = await pdfResponse.text();
                console.error('PDF generation failed:', pdfResponse.status, pdfResponse.statusText, errorText);
                return {
                    statusCode: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        error: 'PDF generation failed',
                        details: `PDF generation failed with status ${pdfResponse.status}: ${errorText}`
                    })
                };
            } else {
                const pdfBuffer = await pdfResponse.arrayBuffer();
                pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
                console.log('PDF generated successfully, size:', pdfBuffer.byteLength, 'bytes');
            }
        } catch (pdfError) {
            console.error('PDF generation error:', pdfError);
            return {
                statusCode: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'PDF generation failed',
                    details: pdfError.message || 'Unknown PDF generation error'
                })
            };
        }

        // Generate email content
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                ${message ? `<p>${message.replace(/\n/g, '<br>')}</p>` : ''}
            </div>
        `;

        const textContent = `
${message || ''}
        `.trim();

        // Build MIME message with or without PDF attachment
        const boundary = 'boundary_' + Math.random().toString(36).substring(2);

        let mimeMessage;

        if (pdfBase64) {
            // With PDF attachment
            const attachmentBoundary = 'attachment_' + Math.random().toString(36).substring(2);
            mimeMessage = [
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
                pdfBase64,
                ``,
                `--${boundary}--`,
            ].join('\r\n');
        } else {
            // Without PDF attachment
            const attachmentBoundary = 'attachment_' + Math.random().toString(36).substring(2);
            mimeMessage = [
                `MIME-Version: 1.0`,
                `Content-Type: multipart/alternative; boundary="${attachmentBoundary}"`,
                `To: ${recipientEmail}`,
                `Subject: ${subject}`,
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
            ].join('\r\n');
        }

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

        console.log('Gmail API response status:', sendResponse.status);

        if (!sendResponse.ok) {
            const errorData = await sendResponse.text();
            console.error('Gmail send failed:', sendResponse.status, errorData);
            return {
                statusCode: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'Failed to send email via Gmail',
                    details: errorData
                })
            };
        }

        const sendData = await sendResponse.json();
        const messageId = sendData.id;
        console.log('Email sent successfully, message ID:', messageId);

        // Update invoice status to 'sent'
        await supabase
            .from('invoices')
            .update({ status: 'sent' })
            .eq('id', invoice_id);

        // Log email in email_logs table (if it exists)
        try {
            await supabase
                .from('email_logs')
                .insert({
                    user_id: user.id,
                    invoice_id: invoiceIdValue,
                    recipient_email: recipientEmail,
                    subject: subject,
                    message_id: messageId,
                    provider: 'gmail',
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                });
        } catch (logError) {
            console.warn('Failed to log email:', logError);
            // Don't fail the request if logging fails
        }

        return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true,
                messageId,
                message: 'Invoice email sent successfully'
            })
        };

    } catch (error) {
        console.error('Send invoice error:', error);
        return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
