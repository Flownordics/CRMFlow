import { useRecentTrackingEventsWithQuote } from "@/services/quoteTracking";
import { format } from "date-fns";
import { Eye, Download, CheckCircle2, XCircle, FileText, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { generateFriendlyNumber } from "@/lib/friendlyNumbers";

export function EmailActivityWidget() {
    const navigate = useNavigate();
    const { data: trackingEvents, isLoading, error } = useRecentTrackingEventsWithQuote(5);

    const getEventIcon = (eventType: string) => {
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

    const getEventLabel = (eventType: string) => {
        switch (eventType) {
            case 'viewed':
                return 'Viewed Quote';
            case 'downloaded':
                return 'Downloaded PDF';
            case 'accepted':
                return 'Accepted Quote';
            case 'rejected':
                return 'Rejected Quote';
            default:
                return eventType;
        }
    };

    const getEventBadge = (eventType: string) => {
        switch (eventType) {
            case 'viewed':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Viewed</Badge>;
            case 'downloaded':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Downloaded</Badge>;
            case 'accepted':
                return <Badge variant="default" className="bg-green-100 text-green-800 text-xs">Accepted</Badge>;
            case 'rejected':
                return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
            default:
                return <Badge variant="outline" className="text-xs">{eventType}</Badge>;
        }
    };

    const handleClick = (event: any) => {
        navigate(`/quotes/${event.quote_id}`);
    };

    return (
        <Card className="rounded-2xl border shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Customer Activity
                </CardTitle>
                <CardDescription>Recent customer interactions with quotes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="flex items-center justify-between rounded-lg border bg-muted/30 px-2.5 py-1.5">
                            <div className="space-y-1 flex-1">
                                <Skeleton className="h-3.5 w-32" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                            <Skeleton className="h-4 w-16" />
                        </div>
                    ))
                ) : error ? (
                    <div className="text-center text-destructive py-3 text-sm">
                        Failed to load customer activity
                    </div>
                ) : !trackingEvents || trackingEvents.length === 0 ? (
                    <div className="text-center text-muted-foreground py-3 text-sm">
                        No customer activity yet
                    </div>
                ) : (
                    trackingEvents.map((event) => (
                        <div
                            key={event.id}
                            className={cn(
                                "flex items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-1.5 transition-colors",
                                "hover:bg-muted/50 cursor-pointer"
                            )}
                            onClick={() => handleClick(event)}
                        >
                            <div className="flex-shrink-0">
                                {getEventIcon(event.event_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <FileText className="h-3 w-3 text-blue-600 flex-shrink-0" />
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Quote
                                    </span>
                                    {event.quote_number && (
                                        <span className="text-xs font-medium">
                                            {event.quote_number}
                                        </span>
                                    )}
                                    {!event.quote_number && (
                                        <span className="text-xs text-muted-foreground">
                                            {generateFriendlyNumber(event.quote_id, 'quote')}
                                        </span>
                                    )}
                                    <span className="text-xs font-medium">
                                        {getEventLabel(event.event_type)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {event.company_name && (
                                        <span className="text-xs text-muted-foreground truncate">
                                            {event.company_name}
                                        </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                        {format(new Date(event.created_at), "MMM d, HH:mm")}
                                    </span>
                                </div>
                            </div>
                            <div className="flex-shrink-0">
                                {getEventBadge(event.event_type)}
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
