import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SendQuoteRequest {
    quoteId: string
    to: string
    cc?: string[]
    subject?: string
    body?: string
    userId: string
    isTest?: boolean
}

interface Quote {
    id: string
    number: string | null
    status: string
    deal_id: string | null
    company_id: string | null
    contact_id: string | null
    created_at: string
    valid_until?: string
    total_minor?: number
    currency?: string
}

interface Company {
    id: string
    name: string
    email?: string
}

interface Person {
    id: string
    name: string
    email?: string
}

interface WorkspaceSettings {
    id: string
    org_name: string
    pdf_footer?: string
    email_template_quote_html?: string
    email_template_quote_text?: string
}

interface QuoteLine {
    id: string
    description: string
    qty: number
    unit_minor: number
    tax_rate_pct: number
    discount_pct: number
}

interface GmailIntegration {
    user_id: string
    access_token: string
    refresh_token?: string
    email?: string
    expires_at?: string
}

/**
 * Render email template with handlebars-like variable replacement
 */
function renderTemplate(template: string, context: any): string {
    if (!template) return '';

    let rendered = template;

    // Replace simple variables {{variable}}
    Object.entries(context).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
            Object.entries(value).forEach(([subKey, subValue]) => {
                const placeholder = `{{${key}.${subKey}}}`;
                rendered = rendered.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(subValue || ''));
            });
        } else {
            const placeholder = `{{${key}}}`;
            rendered = rendered.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value || ''));
        }
    });

    // Handle conditional blocks {{#if condition}}content{{/if}}
    rendered = rendered.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}/g, (match, condition, content) => {
        const conditionValue = condition.includes('.')
            ? condition.split('.').reduce((obj, key) => obj?.[key], context)
            : context[condition];
        return conditionValue ? content : '';
    });

    return rendered;
}

/**
 * Convert text to HTML
 */
function textToHtml(text: string): string {
    return text
        .replace(/\n/g, '<br>')
        .replace(/\s{2,}/g, '&nbsp;&nbsp;');
}

/**
 * Get PDF as base64 string
 */
async function getPdfAsBase64(pdfUrl: string): Promise<string> {
    try {
        const response = await fetch(pdfUrl)
        if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.status}`)
        }
        const arrayBuffer = await response.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        return btoa(String.fromCharCode(...uint8Array))
    } catch (error) {
        console.error('Error fetching PDF:', error)
        return '' // Return empty string if PDF fetch fails
    }
}

/**
 * Send email via Gmail API with multipart/alternative MIME format
 */
async function sendEmailViaGmail(
    integration: GmailIntegration,
    to: string,
    cc: string[],
    subject: string,
    body: string,
    pdfUrl: string,
    quoteNumber: string
): Promise<any> {
    try {
        const from = integration.email || 'noreply@example.com'
        const ccHeader = cc.length > 0 ? `\r\nCc: ${cc.join(', ')}` : ''
        const boundary = 'boundary_' + Math.random().toString(36).substring(2, 15)
        const altBoundary = 'alt_' + Math.random().toString(36).substring(2, 15)

        // Convert body to HTML if it's plain text
        const htmlBody = body.includes('<') ? body : textToHtml(body)
        const textBody = body.replace(/<[^>]*>/g, '') // Strip HTML tags for text version

        // Build RFC 2822 raw email with multipart/alternative
        const rawEmail = `From: ${from}\r\nTo: ${to}${ccHeader}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n--${boundary}\r\nContent-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n--${altBoundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${textBody}\r\n\r\n--${altBoundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${htmlBody}\r\n\r\n--${altBoundary}--\r\n\r\n--${boundary}\r\nContent-Type: application/pdf; name="quote-${quoteNumber}.pdf"\r\nContent-Disposition: attachment; filename="quote-${quoteNumber}.pdf"\r\nContent-Transfer-Encoding: base64\r\n\r\n${await getPdfAsBase64(pdfUrl)}\r\n\r\n--${boundary}--`

        // Encode to base64url
        const encodedEmail = btoa(rawEmail)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '')

        // Send via Gmail API
        const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${integration.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                raw: encodedEmail
            })
        })

        if (response.status === 401 && integration.refresh_token) {
            // Token expired, try to refresh
            console.log('Gmail token expired, attempting refresh...')
            const refreshed = await refreshGmailToken(integration)
            if (refreshed) {
                // Retry with new token
                const retryResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${refreshed.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        raw: encodedEmail
                    })
                })

                if (retryResponse.ok) {
                    return await retryResponse.json()
                } else {
                    throw new Error(`Gmail API retry failed: ${retryResponse.status}`)
                }
            }
        }

        if (!response.ok) {
            const errorData = await response.text()
            throw new Error(`Gmail API error: ${response.status} - ${errorData}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Gmail API error:', error)
        throw error
    }
}

/**
 * Refresh Gmail access token
 */
async function refreshGmailToken(integration: GmailIntegration): Promise<any> {
    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const response = await fetch(`${supabaseUrl}/functions/v1/google-refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: integration.user_id,
                kind: 'gmail',
                refreshToken: integration.refresh_token
            })
        })

        if (response.ok) {
            const result = await response.json()
            return result
        } else {
            console.error('Failed to refresh Gmail token:', response.status)
            return null
        }
    } catch (error) {
        console.error('Error refreshing Gmail token:', error)
        return null
    }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Check idempotency
        const idempotencyKey = req.headers.get('idempotency-key')
        if (!idempotencyKey) {
            return new Response(
                JSON.stringify({ error: 'Idempotency-Key header is required' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Check if this request has already been processed
        const { data: existingKey } = await supabase
            .from('idempotency_keys')
            .select('*')
            .eq('purpose', 'send_quote_email')
            .eq('external_key', idempotencyKey)
            .single()

        if (existingKey) {
            // Return the existing result to maintain idempotency
            return new Response(
                JSON.stringify({
                    message: 'Email already sent',
                    idempotencyKey: idempotencyKey,
                    success: true
                }),
                {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Parse request body
        const { quoteId, to, cc, subject, body, userId }: SendQuoteRequest = await req.json()

        if (!quoteId || !to || !userId) {
            return new Response(
                JSON.stringify({ error: 'quoteId, to, and userId are required' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Fetch quote data
        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .select('*')
            .eq('id', quoteId)
            .single()

        if (quoteError || !quote) {
            return new Response(
                JSON.stringify({ error: 'Quote not found' }),
                {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Fetch company data if available
        let company: Company | null = null;
        if (quote.company_id) {
            const { data: companyData } = await supabase
                .from('companies')
                .select('name, email')
                .eq('id', quote.company_id)
                .single();
            company = companyData;
        }

        // Fetch contact data if available
        let contact: Person | null = null;
        if (quote.contact_id) {
            const { data: contactData } = await supabase
                .from('people')
                .select('name, email')
                .eq('id', quote.contact_id)
                .single();
            contact = contactData;
        }

        // Fetch workspace settings for email templates
        const { data: workspaceSettings, error: settingsError } = await supabase
            .from('workspace_settings')
            .select('*')
            .limit(1)
            .single()

        if (settingsError) {
            console.error('Error fetching workspace settings:', settingsError)
        }

        const { data: lines, error: linesError } = await supabase
            .from('line_items')
            .select('*')
            .eq('parent_id', quoteId)
            .eq('parent_type', 'quote')

        if (linesError) {
            return new Response(
                JSON.stringify({ error: 'Failed to fetch quote lines' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Check if user has Gmail integration
        const { data: gmailIntegration, error: integrationError } = await supabase
            .from('user_integrations')
            .select('*')
            .eq('user_id', userId)
            .eq('provider', 'google')
            .eq('kind', 'gmail')
            .single()

        if (integrationError && integrationError.code !== 'PGRST116') {
            console.error('Error checking Gmail integration:', integrationError)
        }

        // Generate PDF URL
        const appUrl = Deno.env.get('VITE_PUBLIC_APP_URL') || 'http://localhost:8080'
        const pdfUrl = `${appUrl}/pdf/quote/${quoteId}`

        // Prepare email content using templates
        const defaultSubject = `Your quote ${quote.number || quoteId}`
        const emailSubject = subject || defaultSubject

        // Prepare template context
        const templateContext = {
            workspace: {
                org_name: workspaceSettings?.org_name || 'Your Company',
                pdf_footer: workspaceSettings?.pdf_footer || ''
            },
            user: {
                email: gmailIntegration?.email || 'user@example.com',
                name: 'Current User'
            },
            quote: {
                number: quote.number || quoteId,
                total_minor: quote.total_minor || 0,
                currency: quote.currency || 'DKK',
                valid_until: quote.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                id: quoteId
            },
            company: company || { name: 'Customer Company', email: 'customer@example.com' },
            contact: contact || { name: 'Customer Contact', email: 'contact@example.com' },
            appUrl: appUrl
        };

        // Render email body using templates
        let emailBody: string;
        if (body) {
            // Use custom body if provided
            emailBody = body;
        } else if (workspaceSettings?.email_template_quote_html) {
            // Use custom HTML template
            emailBody = renderTemplate(workspaceSettings.email_template_quote_html, templateContext);
        } else if (workspaceSettings?.email_template_quote_text) {
            // Use custom text template
            emailBody = renderTemplate(workspaceSettings.email_template_quote_text, templateContext);
        } else {
            // Use default fallback
            emailBody = `Dear ${templateContext.contact.name},

Please find attached your quote ${templateContext.quote.number}.

You can also view it online at: ${pdfUrl}

Best regards,
${templateContext.workspace.org_name}`;
        }

        // Send email based on available providers
        let emailResult: any = null
        let emailProvider = 'console'

        if (gmailIntegration && gmailIntegration.access_token) {
            // Use Gmail API to send email
            try {
                emailResult = await sendEmailViaGmail(
                    gmailIntegration,
                    to,
                    cc || [],
                    emailSubject,
                    emailBody,
                    pdfUrl,
                    quote.number || quoteId
                )
                emailProvider = 'gmail'
            } catch (error) {
                console.error('Gmail API error:', error)
                emailResult = { error: `Gmail API error: ${error.message}` }
            }
        }

        // If Gmail failed or not available, try fallback
        if (!emailResult || emailResult.error) {
            const fallbackEnabled = Deno.env.get('FEATURE_EMAIL_FALLBACK') === 'true'

            if (fallbackEnabled) {
                // Try Resend fallback
                const resendApiKey = Deno.env.get('VITE_RESEND_API_KEY')
                if (resendApiKey) {
                    try {
                        const resendResponse = await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${resendApiKey}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                from: Deno.env.get('VITE_EMAIL_FROM') || 'sales@yourdomain.com',
                                to: [to],
                                cc: cc || [],
                                subject: emailSubject,
                                html: emailBody.replace(/\n/g, '<br>'),
                                attachments: [
                                    {
                                        filename: `quote-${quote.number || quoteId}.pdf`,
                                        url: pdfUrl
                                    }
                                ]
                            })
                        })

                        if (resendResponse.ok) {
                            emailResult = await resendResponse.json()
                            emailProvider = 'resend'
                        } else {
                            emailResult = { error: `Resend API error: ${resendResponse.status}` }
                        }
                    } catch (error) {
                        emailResult = { error: `Resend API error: ${error.message}` }
                    }
                }
            }

            // If no fallback or fallback failed, return error
            if (!emailResult || emailResult.error) {
                // Log email error
                await supabase
                    .from('email_logs')
                    .insert({
                        user_id: userId,
                        related_type: 'quote',
                        related_id: quoteId,
                        to_email: to,
                        cc_emails: cc || [],
                        subject: emailSubject,
                        provider: 'none',
                        provider_message_id: null,
                        status: 'error',
                        error_message: emailResult?.error || 'No email provider available'
                    })

                if (!gmailIntegration) {
                    return new Response(
                        JSON.stringify({
                            error: 'Connect your email to send quotes',
                            code: 'EMAIL_NOT_CONNECTED'
                        }),
                        {
                            status: 409,
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                        }
                    )
                } else {
                    return new Response(
                        JSON.stringify({ error: emailResult.error }),
                        {
                            status: 500,
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                        }
                    )
                }
            }
        }

        // If email failed, log error and return
        if (emailResult?.error) {
            // Log email error
            await supabase
                .from('email_logs')
                .insert({
                    user_id: userId,
                    related_type: 'quote',
                    related_id: quoteId,
                    to_email: to,
                    cc_emails: cc || [],
                    subject: emailSubject,
                    provider: emailProvider,
                    provider_message_id: null,
                    status: 'error',
                    error_message: emailResult.error
                })

            return new Response(
                JSON.stringify({ error: emailResult.error }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Record idempotency key
        await supabase
            .from('idempotency_keys')
            .insert({
                purpose: 'send_quote_email',
                external_key: idempotencyKey,
                entity_type: 'quote',
                entity_id: quoteId
            })

        // Log email activity
        await supabase
            .from('email_logs')
            .insert({
                user_id: userId,
                related_type: 'quote',
                related_id: quoteId,
                to_email: to,
                cc_emails: cc || [],
                subject: emailSubject,
                provider: emailProvider,
                provider_message_id: emailResult?.id || emailResult?.messageId,
                status: 'sent'
            })

        // Update quote status to 'sent'
        await supabase
            .from('quotes')
            .update({ status: 'sent' })
            .eq('id', quoteId)

        // Add activity record if deal exists
        if (quote.deal_id) {
            await supabase
                .from('activities')
                .insert({
                    type: 'email_sent',
                    deal_id: quote.deal_id,
                    meta: {
                        quoteId,
                        to,
                        provider: emailProvider,
                        subject: emailSubject,
                        from: gmailIntegration?.email || 'system'
                    }
                })
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Quote email sent successfully',
                emailResult,
                idempotencyKey
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.error('Send quote error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
