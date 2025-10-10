import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toastBus } from "@/lib/toastBus";
import { logger } from '@/lib/logger';

export default function OAuthCallback() {
    const [params] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                const code = params.get("code");
                const state = params.get("state");
                const error = params.get("error");

                if (error) {
                    throw new Error(`OAuth error: ${error}`);
                }

                if (!code || !state) {
                    throw new Error("Missing code or state parameter");
                }

                // Get current session
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    throw new Error("Not authenticated");
                }

                // Exchange code for tokens via Edge Function
                const { data, error: exchangeError } = await supabase.functions.invoke('google-oauth-exchange', {
                    body: { code, state },
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                });

                if (exchangeError) {
                    logger.error('Exchange error details:', exchangeError);
                    logger.error('Exchange error context:', exchangeError.context);
                    logger.error('Exchange error message:', exchangeError.message);

                    // Try to get more details from the error response
                    let errorMessage = exchangeError.message || 'Failed to exchange OAuth code';

                    if (exchangeError.context?.body) {
                        try {
                            // If it's a ReadableStream, we need to read it
                            if (exchangeError.context.body instanceof ReadableStream) {
                                const response = new Response(exchangeError.context.body);
                                const text = await response.text();
                                logger.debug('Error response text:', text);
                                const errorBody = JSON.parse(text);
                                errorMessage = errorBody.error || errorMessage;
                            } else {
                                const errorBody = JSON.parse(exchangeError.context.body);
                                errorMessage = errorBody.error || errorMessage;
                            }
                        } catch (e) {
                            logger.debug('Could not parse error body:', e);
                        }
                    }

                    throw new Error(errorMessage);
                }

                if (!data?.success) {
                    logger.error('Exchange response:', data);
                    throw new Error(data?.error || 'OAuth exchange failed');
                }

                // Show success message
                toastBus.emit({
                    title: "Connected",
                    description: `Connected Google ${data.kind} as ${data.email}`,
                });

                // Redirect to settings
                navigate("/settings?tab=integrations", { replace: true });

            } catch (error) {
                logger.error('OAuth callback error:', error);

                // Show error message
                toastBus.emit({
                    title: "Failed to connect",
                    description: error instanceof Error ? error.message : "Unknown error",
                    variant: "destructive",
                });

                // Redirect to settings with error
                navigate("/settings?tab=integrations", { replace: true });
            }
        };

        handleOAuthCallback();
    }, [params, navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Processing OAuth callback...</p>
            </div>
        </div>
    );
}
