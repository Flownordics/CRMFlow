import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus, Settings, RefreshCw, Database } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";

interface CalendarEmptyProps {
    isConnected: boolean;
    isLoading: boolean;
    onCreateEvent: () => void;
    onGoToSettings: () => void;
    showGoogleLayer?: boolean;
}

export function CalendarEmpty({
    isConnected,
    isLoading,
    onCreateEvent,
    onGoToSettings,
    showGoogleLayer = false
}: CalendarEmptyProps) {
    const { t } = useI18n();

    if (isLoading) {
        return <CalendarSkeleton />;
    }

    if (!isConnected) {
        return (
            <Card className="max-w-md mx-auto mt-8">
                <CardHeader className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Database className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
                        <Calendar className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <CardTitle>Native Calendar Ready</CardTitle>
                    <CardDescription>
                        Your native calendar is working! Connect Google Calendar for additional features
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <Button onClick={onCreateEvent} className="w-full">
                        <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                        {t('create_event')}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onGoToSettings}
                        className="w-full"
                    >
                        <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                        {t('connect_google_calendar')}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                        Navigate to Settings → Integrations → Google Calendar to connect your account
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="max-w-md mx-auto mt-8">
            <CardHeader className="text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
                <CardTitle>No Events</CardTitle>
                <CardDescription>
                    {showGoogleLayer
                        ? "No events found in this time range (native + Google)"
                        : "No events found in this time range"
                    }
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <Button onClick={onCreateEvent}>
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    {t('create_event')}
                </Button>
            </CardContent>
        </Card>
    );
}

function CalendarSkeleton() {
    return (
        <div className="space-y-4">
            {/* Header Skeleton */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-64" />
            </div>

            {/* Event Skeletons */}
            <div className="grid gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="p-4">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-6 w-20 rounded-full" />
                                <Skeleton className="h-5 flex-1" />
                                <Skeleton className="h-6 w-16 rounded-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export function CalendarLoadingState() {
    const { t } = useI18n();

    return (
        <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">Loading calendar events...</p>
            </div>
        </div>
    );
}
