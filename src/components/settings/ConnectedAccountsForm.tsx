import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Mail, Calendar, CheckCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getUserIntegrations, useDeleteUserIntegration, useUserIntegrations } from "@/services/integrations";
import { startGoogleConnect } from "@/services/oauth";
import { toast } from "sonner";

interface IntegrationCardProps {
    kind: 'gmail' | 'calendar';
    title: string;
    description: string;
    icon: React.ReactNode;
    scopes: string[];
}

function IntegrationCard({ kind, title, description, icon, scopes }: IntegrationCardProps) {
    const [isConnecting, setIsConnecting] = useState(false);
    const { data: integrations, isLoading } = useQuery({
        queryKey: ["integrations"],
        queryFn: getUserIntegrations,
        staleTime: 60_000,
    });
    const deleteIntegration = useDeleteUserIntegration();

    // Find the integration for this kind
    const integration = kind === 'gmail' ? integrations?.gmail : integrations?.calendar;
    const isConnected = integration?.connected || false;

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            // For now, we'll use placeholder credentials
            // In a real implementation, these would be stored securely
            await startGoogleConnect(kind, '', '');
            toast.success(`Starting ${title} connection...`);
        } catch (error) {
            console.error(`Failed to start ${title} connection:`, error);
            toast.error(`Failed to connect ${title}`);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            await deleteIntegration.mutateAsync(kind);
            toast.success(`${title} disconnected successfully`);
        } catch (error) {
            console.error(`Failed to disconnect ${title}:`, error);
            toast.error(`Failed to disconnect ${title}`);
        }
    };

    return (
        <Card className="p-4">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        {icon}
                    </div>
                    <div>
                        <h3 className="font-medium">{title}</h3>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isConnected ? (
                        <Badge variant="secondary" className="gap-1">
                            <CheckCircle className="h-3 w-3" aria-hidden="true" />
                            Connected as {integration?.email || 'Unknown'}
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="gap-1">
                            <XCircle className="h-3 w-3" aria-hidden="true" />
                            Not connected
                        </Badge>
                    )}
                </div>
            </div>

            {isConnected && (
                <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-2">Scopes:</p>
                    <div className="flex flex-wrap gap-1">
                        {scopes.map((scope) => (
                            <Badge key={scope} variant="outline" className="text-xs">
                                {scope}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-4 flex gap-2">
                {isConnected ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnect}
                        disabled={deleteIntegration.isPending}
                        aria-label={`Disconnect ${title}`}
                    >
                        {deleteIntegration.isPending ? "Disconnecting..." : "Disconnect"}
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        onClick={handleConnect}
                        disabled={isConnecting}
                        aria-label={`Connect ${title}`}
                    >
                        {isConnecting ? "Connecting..." : "Connect"}
                    </Button>
                )}
            </div>
        </Card>
    );
}

export function ConnectedAccountsForm() {
    const { isLoading, error } = useUserIntegrations();

    if (isLoading) {
        return (
            <Card className="p-4">
                <div className="mb-3">
                    <h2 className="text-base font-semibold">Connected Accounts</h2>
                    <p className="text-xs text-muted-foreground">
                        Optional Google integrations.
                    </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                    {[1, 2].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                            <div className="h-4 bg-muted rounded w-3/4"></div>
                        </div>
                    ))}
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-4">
                <div className="mb-3">
                    <h2 className="text-base font-semibold">Connected Accounts</h2>
                    <p className="text-xs text-muted-foreground">
                        Optional Google integrations.
                    </p>
                </div>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Failed to load integrations. Please check your connection and try again.
                    </AlertDescription>
                </Alert>
            </Card>
        );
    }

    return (
        <Card className="p-4">
            <div className="mb-3">
                <h2 className="text-base font-semibold">Connected Accounts</h2>
                <p className="text-xs text-muted-foreground">
                    Optional Google integrations.
                </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
                <IntegrationCard
                    kind="gmail"
                    title="Google Mail"
                    description="Send emails directly from CRMFlow"
                    icon={<Mail className="h-5 w-5" aria-hidden="true" />}
                    scopes={["gmail.send", "gmail.readonly"]}
                />

                <IntegrationCard
                    kind="calendar"
                    title="Google Calendar"
                    description="Sync events and meetings"
                    icon={<Calendar className="h-5 w-5" aria-hidden="true" />}
                    scopes={["calendar.events", "calendar.readonly"]}
                />
            </div>
        </Card>
    );
}
