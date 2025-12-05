import { useQuoteEmailLogs } from "@/services/emailLogs";
import { useTrackingEvents, useTrackingStats } from "@/services/quoteTracking";
import { format } from "date-fns";
import { Mail, CheckCircle, XCircle, Clock, AlertCircle, Eye, Download, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface EmailLogsProps {
    quoteId: string;
}

export function EmailLogs({ quoteId }: EmailLogsProps) {
    const { data: emailLogs, isLoading, error } = useQuoteEmailLogs(quoteId);
    const { data: trackingEvents, isLoading: trackingLoading } = useTrackingEvents(quoteId);
    const { data: trackingStats } = useTrackingStats(quoteId);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground">Loading email logs...</div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-destructive">
                        Failed to load email logs: {error.message}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!emailLogs || emailLogs.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground">
                        No emails have been sent for this quote yet.
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sent':
                return <CheckCircle className="h-4 w-4 text-[#6b7c5e]" />;
            case 'error':
                return <XCircle className="h-4 w-4 text-[#b8695f]" />;
            case 'queued':
                return <Clock className="h-4 w-4 text-[#9d855e]" />;
            default:
                return <AlertCircle className="h-4 w-4 text-gray-600" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'sent':
                return <Badge variant="default" className="bg-green-100 text-green-800">Sent</Badge>;
            case 'error':
                return <Badge variant="destructive">Error</Badge>;
            case 'queued':
                return <Badge variant="secondary">Queued</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getProviderBadge = (provider: string) => {
        const providerNames: Record<string, string> = {
            'gmail': 'Gmail',
            'resend': 'Resend',
            'smtp': 'SMTP',
            'none': 'None'
        };

        return (
            <Badge variant="outline" className="text-xs">
                {providerNames[provider] || provider}
            </Badge>
        );
    };

    const getTrackingEventIcon = (eventType: string) => {
        switch (eventType) {
            case 'viewed':
                return <Eye className="h-3 w-3 text-blue-600" />;
            case 'downloaded':
                return <Download className="h-3 w-3 text-green-600" />;
            case 'accepted':
                return <CheckCircle2 className="h-3 w-3 text-green-600" />;
            case 'rejected':
                return <XCircle className="h-3 w-3 text-red-600" />;
            default:
                return <AlertCircle className="h-3 w-3 text-gray-600" />;
        }
    };

    const getTrackingEventLabel = (eventType: string) => {
        switch (eventType) {
            case 'viewed':
                return 'Viewed';
            case 'downloaded':
                return 'Downloaded PDF';
            case 'accepted':
                return 'Accepted';
            case 'rejected':
                return 'Rejected';
            default:
                return eventType;
        }
    };

    const hasTracking = trackingStats && (trackingStats.views > 0 || trackingStats.downloads > 0 || trackingStats.responses > 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Activity
                    {emailLogs && emailLogs.length > 0 && ` (${emailLogs.length})`}
                    {hasTracking && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                            • {trackingStats.views} views, {trackingStats.downloads} downloads
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Email Logs */}
                    {emailLogs && emailLogs.length > 0 ? (
                        emailLogs.map((log) => (
                            <div key={log.id} className="rounded-lg border p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(log.status)}
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(log.status)}
                                            {getProviderBadge(log.provider)}
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {format(new Date(log.created_at), "PPpp")}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-sm font-medium">{log.subject}</div>

                                    <div className="text-sm text-muted-foreground">
                                        <span className="font-medium">To:</span> {log.to_email}
                                        {log.cc_emails && log.cc_emails.length > 0 && (
                                            <>
                                                <br />
                                                <span className="font-medium">CC:</span> {log.cc_emails.join(', ')}
                                            </>
                                        )}
                                    </div>

                                    {log.provider_message_id && (
                                        <div className="text-xs text-muted-foreground">
                                            <span className="font-medium">Message ID:</span> {log.provider_message_id}
                                        </div>
                                    )}

                                    {log.error_message && (
                                        <div className="text-sm text-destructive bg-red-50 p-2 rounded border">
                                            <span className="font-medium">Error:</span> {log.error_message}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        !isLoading && (
                            <div className="text-sm text-muted-foreground">
                                No emails have been sent for this quote yet.
                            </div>
                        )
                    )}

                    {/* Tracking Events */}
                    {hasTracking && trackingEvents && trackingEvents.length > 0 && (
                        <>
                            {emailLogs && emailLogs.length > 0 && <Separator className="my-4" />}
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground mb-2">Customer Interactions</div>
                                {trackingEvents.map((event) => (
                                    <div key={event.id} className="flex items-center gap-2 text-sm p-2 rounded border bg-muted/30">
                                        {getTrackingEventIcon(event.event_type)}
                                        <span className="font-medium">{getTrackingEventLabel(event.event_type)}</span>
                                        <span className="text-xs text-muted-foreground ml-auto">
                                            {format(new Date(event.created_at), "PPp")}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
