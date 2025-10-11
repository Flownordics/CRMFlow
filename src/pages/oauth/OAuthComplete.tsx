import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toastBus } from "@/lib/toastBus";

export default function OAuthComplete() {
    const [params] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const connected = params.get("connected");
        const provider = params.get("provider");
        const kind = params.get("kind");
        const email = params.get("email");
        const error = params.get("error");
        
        console.log('[OAuthComplete] Callback params:', { connected, provider, kind, email, error });

        if (connected === "true") {
            const kindLabel = kind === 'gmail' ? 'Gmail' : kind === 'calendar' ? 'Google Calendar' : kind;
            const message = email 
                ? `Connected ${kindLabel} as ${email}`
                : `Connected ${provider} ${kind}`;
            
            console.log('[OAuthComplete] Success! Showing toast:', message);
            
            toastBus.emit({
                title: "✅ Successfully Connected",
                description: message,
                variant: "default"
            });
        } else if (error) {
            console.error('[OAuthComplete] Error from callback:', error);
            
            toastBus.emit({
                title: "Failed to connect",
                description: error,
                variant: "destructive"
            });
        } else {
            console.warn('[OAuthComplete] Unknown state - no connected or error param');
            
            toastBus.emit({
                title: "Connection status unknown",
                description: "Please check your integration status in Settings",
                variant: "default"
            });
        }

        // Always send user to Settings → Integrations tab
        console.log('[OAuthComplete] Redirecting to settings...');
        navigate("/settings?tab=integrations", { replace: true });
    }, [params, navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Completing connection...</p>
            </div>
        </div>
    );
}
