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
        const error = params.get("error");

        if (connected === "true") {
            toastBus.emit({
                title: "Connected",
                description: `Connected ${provider} ${kind}`,
                variant: "success"
            });
        } else if (error) {
            toastBus.emit({
                title: "Failed to connect",
                description: error,
                variant: "destructive"
            });
        }

        // always send user to Settings → Integrations tab
        navigate("/settings?tab=integrations", { replace: true });
    }, [params, navigate]);

    return null;
}
