import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { usePersonActivities } from "@/services/people";
import { Activity, Clock } from "lucide-react";

interface PersonActivityProps {
    personId: string;
}

export function PersonActivity({ personId }: PersonActivityProps) {
    const { t } = useI18n();
    const { data: activities, isLoading, isError } = usePersonActivities(personId);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16" />
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div role="alert" className="text-destructive">
                Failed to load activities
            </div>
        );
    }

    if (!activities || activities.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="text-center space-y-4">
                        <Activity className="h-12 w-12 text-muted-foreground mx-auto" />
                        <h3 className="text-lg font-medium">{t("people.noActivityYet")}</h3>
                        <p className="text-sm text-muted-foreground">
                            {t("people.noActivityDescription")}
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString();
    };

    const getActivityIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'email':
                return '📧';
            case 'call':
                return '📞';
            case 'meeting':
                return '🤝';
            case 'note':
                return '📝';
            case 'deal_created':
                return '💼';
            case 'deal_updated':
                return '📊';
            default:
                return '📋';
        }
    };

    const getActivityTitle = (type: string) => {
        switch (type.toLowerCase()) {
            case 'email':
                return 'Email sent';
            case 'call':
                return 'Call made';
            case 'meeting':
                return 'Meeting held';
            case 'note':
                return 'Note added';
            case 'deal_created':
                return 'Deal created';
            case 'deal_updated':
                return 'Deal updated';
            default:
                return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium">{t("people.activity")}</h3>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Activity className="h-4 w-4" aria-hidden="true" />
                        Recent Activity ({activities.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {activities.map((activity: any) => (
                            <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border">
                                <div className="text-2xl" role="img" aria-label={getActivityTitle(activity.type)}>
                                    {getActivityIcon(activity.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium">
                                            {getActivityTitle(activity.type)}
                                        </h4>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" aria-hidden="true" />
                                            <span>{formatDate(activity.created_at)}</span>
                                            <span>•</span>
                                            <span>{formatTime(activity.created_at)}</span>
                                        </div>
                                    </div>

                                    {activity.meta && Object.keys(activity.meta).length > 0 && (
                                        <div className="mt-2 text-sm text-muted-foreground">
                                            {activity.meta.description && (
                                                <p>{activity.meta.description}</p>
                                            )}
                                            {activity.meta.subject && (
                                                <p className="font-medium">{activity.meta.subject}</p>
                                            )}
                                            {activity.meta.deal_title && (
                                                <p className="text-xs">
                                                    Deal: {activity.meta.deal_title}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
