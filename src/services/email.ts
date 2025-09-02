import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { toastBus } from "@/lib/toastBus";
import { supabase } from "@/integrations/supabase/client";
import { newIdemKey } from "@/lib/idempotency";
import { refreshGoogleTokenIfNeeded } from "@/services/integrations";

export interface SendQuoteEmailRequest {
    quoteId: string;
    to: string;
    cc?: string[];
    subject?: string;
    body?: string;
    attachPdf?: boolean;
}

export interface SendQuoteEmailResponse {
    success: boolean;
    message: string;
    emailResult: any;
    idempotencyKey: string;
}

// Generate a unique idempotency key using UUID v4
function generateIdempotencyKey(): string {
    return newIdemKey();
}

// Send quote email via Edge Function
export async function sendQuoteEmail(request: SendQuoteEmailRequest): Promise<{ ok: true }> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
        throw new Error("VITE_SUPABASE_URL is not configured");
    }

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated");
    }

    const idempotencyKey = generateIdempotencyKey();

    const makeRequest = async (): Promise<Response> => {
        return fetch(`${supabaseUrl}/functions/v1/send-quote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': idempotencyKey,
            },
            body: JSON.stringify({
                ...request,
                userId: user.id
            }),
        });
    };

    let response = await makeRequest();

    // Handle 401 with automatic retry after token refresh
    if (response.status === 401) {
        try {
            // Refresh token with force option
            await refreshGoogleTokenIfNeeded('gmail', { force: true });

            // Retry once after refresh
            response = await makeRequest();
        } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError);
            throw new Error('Authentication failed');
        }
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle specific error cases
        if (response.status === 409 && errorData.code === 'EMAIL_NOT_CONNECTED') {
            const error = new Error('EMAIL_NOT_CONNECTED');
            error.name = 'EmailNotConnectedError';
            throw error;
        }

        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return { ok: true };
}

// Enhanced send quote email with idempotency and better error handling
export async function sendQuoteEmailEnhanced(quoteId: string, payload: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    cc?: string[];
    attachPdf?: boolean;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        const key = `quote:${quoteId}:${payload.to}:${payload.subject}`;

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-quote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-idempotency-key': key,
            },
            body: JSON.stringify({
                quoteId,
                userId: user.id,
                ...payload
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const msg = errorData.error || errorData.message || `HTTP error! status: ${response.status}`;
            throw new Error(msg);
        }

        const result = await response.json();
        return {
            ok: true,
            messageId: result.messageId || result.id
        };
    } catch (error: any) {
        const msg = error?.response?.data?.message || error?.message || "Failed to send email";
        return { ok: false, error: msg };
    }
}

// React hook for sending quote emails
export function useSendQuoteEmail() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: sendQuoteEmail,
        onSuccess: (data, variables) => {
            // Invalidate quote and activities queries
            queryClient.invalidateQueries({ queryKey: qk.quote(variables.quoteId) });
            queryClient.invalidateQueries({ queryKey: qk.quotes() });
            queryClient.invalidateQueries({ queryKey: qk.quoteStatusCounts() });

            // If the quote has a deal, invalidate activities
            queryClient.invalidateQueries({ queryKey: qk.activities() });

            // Invalidate email logs for this quote
            queryClient.invalidateQueries({ queryKey: ['email-logs', 'quote', variables.quoteId] });

            // Show success toast
            toastBus.emit({
                title: "Quote Sent",
                description: `Quote email sent successfully to ${variables.to}`,
                variant: "success"
            });
        },
        onError: (error: Error) => {
            if (error.name === 'EmailNotConnectedError') {
                // Show special message for email not connected
                toastBus.emit({
                    title: "Email Not Connected",
                    description: "Please connect your Gmail account to send quotes",
                    variant: "destructive",
                    action: {
                        label: "Connect Email",
                        onClick: () => {
                            // Navigate to settings integrations
                            window.location.href = '/settings?tab=integrations';
                        }
                    }
                });
            } else {
                // Show generic error toast
                toastBus.emit({
                    title: "Failed to Send Quote",
                    description: error.message,
                    variant: "destructive"
                });
            }
        },
    });
}

// Check if email functionality is available
export async function isEmailAvailable(): Promise<boolean> {
    try {
        // Check if user has Gmail integration
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return false;
        }

        const { data: gmailIntegration } = await supabase
            .from('user_integrations')
            .select('*')
            .eq('user_id', user.id)
            .eq('provider', 'google')
            .eq('kind', 'gmail')
            .single();

        if (gmailIntegration) {
            return true;
        }

        // Check fallback providers
        const provider = import.meta.env.VITE_EMAIL_PROVIDER;
        const fromEmail = import.meta.env.VITE_EMAIL_FROM;

        if (provider === 'resend') {
            return !!import.meta.env.VITE_RESEND_API_KEY && !!fromEmail;
        }

        // Console fallback is always available
        return true;
    } catch (error) {
        console.error('Error checking email availability:', error);
        return false;
    }
}

// Get email provider info
export async function getEmailProviderInfo(): Promise<{ provider: 'gmail' | 'none'; connected: boolean; email?: string }> {
    try {
        // Check if user has Gmail integration
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { provider: 'none', connected: false };
        }

        const { data: gmailIntegration } = await supabase
            .from('user_integrations')
            .select('*')
            .eq('user_id', user.id)
            .eq('provider', 'google')
            .eq('kind', 'gmail')
            .single();

        if (gmailIntegration && gmailIntegration.access_token) {
            return {
                provider: 'gmail',
                email: gmailIntegration.email,
                connected: true
            };
        }

        return { provider: 'none', connected: false };
    } catch (error) {
        console.error('Error getting email provider info:', error);
        return { provider: 'none', connected: false };
    }
}

// Check if Gmail integration is connected and valid
export async function isGmailConnected(): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return false;
        }

        const { data: gmailIntegration } = await supabase
            .from('user_integrations')
            .select('*')
            .eq('user_id', user.id)
            .eq('provider', 'google')
            .eq('kind', 'gmail')
            .single();

        return !!gmailIntegration && !!gmailIntegration.access_token;
    } catch (error) {
        console.error('Error checking Gmail connection:', error);
        return false;
    }
}

// Legacy function for backward compatibility
export function getEmailProviderName(): string {
    const provider = import.meta.env.VITE_EMAIL_PROVIDER;

    switch (provider) {
        case 'resend':
            return 'Resend';
        case 'smtp':
            return 'SMTP';
        default:
            return 'Console (Development)';
    }
}
