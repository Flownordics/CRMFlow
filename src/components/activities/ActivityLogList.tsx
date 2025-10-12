import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompanyActivityLogs } from "@/services/activityLog";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Mail, Calendar, FileText, CheckSquare, DollarSign, ShoppingCart, FileSpreadsheet, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ActivityLogListProps {
    companyId: string;
}

const activityTypeIcons: Record<string, any> = {
    call: Phone,
    email: Mail,
    meeting: Calendar,
    note: FileText,
    task: CheckSquare,
    deal: DollarSign,
    quote: FileSpreadsheet,
    order: ShoppingCart,
    invoice: Receipt,
    payment: DollarSign,
};

const activityTypeLabels: Record<string, string> = {
    call: 'Call',
    email: 'Email',
    meeting: 'Meeting',
    note: 'Note',
    task: 'Task',
    deal: 'Deal Created',
    quote: 'Quote Created',
    order: 'Order Created',
    invoice: 'Invoice Created',
    payment: 'Payment Received',
};

const outcomeLabels: Record<string, string> = {
    completed: 'Completed',
    voicemail: 'Voicemail',
    no_answer: 'No Answer',
    busy: 'Busy',
    scheduled_followup: 'Follow-up Scheduled',
    wrong_number: 'Wrong Number',
    not_interested: 'Not Interested',
    callback_requested: 'Callback Requested',
};

// Format any outcome not in the mapping (remove underscores, capitalize)
const formatOutcome = (outcome: string) => {
    if (outcomeLabels[outcome]) return outcomeLabels[outcome];
    return outcome.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
};

export function ActivityLogList({ companyId }: ActivityLogListProps) {
    const { data: activities, isLoading } = useCompanyActivityLogs(companyId);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Activity History</CardTitle>
                    <CardDescription>Recent interactions with this company</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                                <Skeleton className="h-10 w-10 rounded" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-1/3" />
                                    <Skeleton className="h-3 w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!activities || activities.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Activity History</CardTitle>
                    <CardDescription>Recent interactions with this company</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <Phone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No activities logged yet</p>
                        <p className="text-xs mt-1">Start by logging your first call or interaction</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Activity History</CardTitle>
                <CardDescription>
                    {activities.length} {activities.length === 1 ? 'interaction' : 'interactions'} logged
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {activities.map((activity) => {
                        const Icon = activityTypeIcons[activity.type] || Phone;
                        const typeLabel = activityTypeLabels[activity.type] || activity.type;

                        return (
                            <div
                                key={activity.id}
                                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium">{typeLabel}</span>
                                        {activity.outcome && (
                                            <Badge variant="secondary" className="text-xs">
                                                {formatOutcome(activity.outcome)}
                                            </Badge>
                                        )}
                                    </div>
                                    {activity.notes && (
                                        <p className="text-sm text-muted-foreground mb-1 line-clamp-2">
                                            {activity.notes}
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(activity.createdAt).toLocaleString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

