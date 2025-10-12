import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    Download,
    Trash2,
    Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    useCallList,
    useCallListItems,
    useUpdateCallListItem,
    exportCallListToCsv,
    useDeleteCallList,
} from "@/services/callLists";
import { useCompanyActivityLogs } from "@/services/activityLog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ActivityStatusBadge } from "@/components/companies/ActivityStatusBadge";
import { Progress } from "@/components/ui/progress";
import { CompanySearchDialog } from "@/components/call-lists/CompanySearchDialog";
import { LogActivityPanel } from "@/components/activities/LogActivityPanel";

export default function CallListDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAddCompaniesDialog, setShowAddCompaniesDialog] = useState(false);

    const { data: callList, isLoading: listLoading } = useCallList(id!);
    const { data: items, isLoading: itemsLoading } = useCallListItems(id!);
    const updateItemMutation = useUpdateCallListItem(items?.[currentIndex]?.id || "", id!);
    const deleteMutation = useDeleteCallList();
    const { data: recentActivities } = useCompanyActivityLogs(items?.[currentIndex]?.company?.id || "");

    const isLoading = listLoading || itemsLoading;
    const currentItem = items?.[currentIndex];
    const company = currentItem?.company;

    const completedCount = items?.filter(item => item.status === 'completed').length || 0;
    const totalCount = items?.length || 0;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const handleNext = () => {
        if (items && currentIndex < items.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleActivityLogged = async () => {
        if (!currentItem) return;

        try {
            // Update the call list item status
            await updateItemMutation.mutateAsync({
                status: 'completed',
            });

            // Auto-advance to next item
            setTimeout(() => {
                if (items && currentIndex < items.length - 1) {
                    handleNext();
                }
            }, 500);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update call list item",
                variant: "destructive",
            });
        }
    };

    const handleSkip = async () => {
        if (!currentItem) return;

        try {
            await updateItemMutation.mutateAsync({
                status: 'skipped',
            });

            toast({
                title: "Skipped",
                description: "Company was skipped",
            });

            handleNext();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to skip",
                variant: "destructive",
            });
        }
    };

    const handleExport = async () => {
        try {
            await exportCallListToCsv(id!);
            toast({
                title: "Exported",
                description: "Call list has been exported to CSV",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to export call list",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async () => {
        if (!callList) return;

        if (!confirm(`Are you sure you want to delete the call list "${callList.name}"?`)) {
            return;
        }

        try {
            await deleteMutation.mutateAsync(id!);
            toast({
                title: "Call List Deleted",
                description: `${callList.name} has been deleted`,
            });
            navigate("/call-lists");
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete call list",
                variant: "destructive",
            });
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!callList || !items || items.length === 0) {
        return (
            <div className="container mx-auto py-6">
                <Button variant="ghost" onClick={() => navigate("/call-lists")} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground mb-4">
                            This call list is empty
                        </p>
                        <Button onClick={() => navigate("/call-lists")}>
                            Back to overview
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/call-lists")}
                        className="mb-2"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <h1 className="text-3xl font-bold">{callList.name}</h1>
                    <p className="text-muted-foreground mt-1">
                        {completedCount} of {totalCount} completed
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowAddCompaniesDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Companies
                    </Button>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete List
                    </Button>
                </div>
            </div>

            {/* Progress */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} />
                    </div>
                </CardContent>
            </Card>

            {/* Main Call Flow */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Company Info */}
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <CardTitle className="text-2xl">{company?.name}</CardTitle>
                                <CardDescription>
                                    Position {currentIndex + 1} of {totalCount}
                                </CardDescription>
                            </div>
                            <ActivityStatusBadge
                                status={company?.activityStatus as any}
                                lastActivityAt={company?.lastActivityAt}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {company?.phone && (
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <a
                                    href={`tel:${company.phone}`}
                                    className="text-lg font-medium hover:underline"
                                >
                                    {company.phone}
                                </a>
                            </div>
                        )}

                        {company?.email && (
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <a
                                    href={`mailto:${company.email}`}
                                    className="text-sm hover:underline"
                                >
                                    {company.email}
                                </a>
                            </div>
                        )}

                        {/* Last Activity */}
                        {recentActivities && recentActivities.length > 0 && (() => {
                            const activity = recentActivities[0];
                            
                            const typeLabels: Record<string, string> = {
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

                            return (
                                <div className="p-3 bg-muted/30 rounded-lg border">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Latest Activity:</p>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium">
                                                {typeLabels[activity.type] || activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                                            </span>
                                            {activity.outcome && (
                                                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                                    {formatOutcome(activity.outcome)}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(activity.createdAt).toLocaleDateString('en-US', {
                                                day: 'numeric',
                                                month: 'short'
                                            })}
                                        </span>
                                    </div>
                                    {activity.notes && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                            {activity.notes}
                                        </p>
                                    )}
                                </div>
                            );
                        })()}

                        {currentItem.notes && (
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Notes:</p>
                                <p className="text-sm text-muted-foreground">{currentItem.notes}</p>
                            </div>
                        )}

                        {/* Navigation */}
                        <div className="flex gap-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={handlePrevious}
                                disabled={currentIndex === 0}
                                className="flex-1"
                            >
                                <ChevronLeft className="mr-2 h-4 w-4" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleNext}
                                disabled={currentIndex === items.length - 1}
                                className="flex-1"
                            >
                                Next
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Call Logging */}
                <LogActivityPanel
                    companyId={company?.id || ""}
                    companyName={company?.name}
                    onActivityLogged={handleActivityLogged}
                    onSkip={handleSkip}
                    skipDisabled={updateItemMutation.isPending}
                />
            </div>

            {/* All Items List */}
            <Card>
                <CardHeader>
                    <CardTitle>All companies in the list</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {items.map((item, index) => (
                            <div
                                key={item.id}
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${index === currentIndex ? 'bg-muted border-primary' : ''
                                    }`}
                onClick={() => {
                    setCurrentIndex(index);
                }}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-muted-foreground w-8">
                                        #{index + 1}
                                    </span>
                                    <ActivityStatusBadge
                                        status={item.company?.activityStatus as any}
                                        lastActivityAt={item.company?.lastActivityAt}
                                    />
                                    <span className="font-medium">{item.company?.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {item.status === 'completed' && (
                                        <Badge variant="default" className="bg-[#b5c69f] hover:bg-[#a5b68f] text-white">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Completed
                                        </Badge>
                                    )}
                                    {item.status === 'skipped' && (
                                        <Badge variant="secondary">
                                            Skipped
                                        </Badge>
                                    )}
                                    {item.status === 'pending' && (
                                        <Badge variant="outline">
                                            Pending
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Add Companies Dialog */}
            <CompanySearchDialog
                open={showAddCompaniesDialog}
                onOpenChange={setShowAddCompaniesDialog}
                callListId={id!}
                existingCompanyIds={items?.map((item) => item.companyId) || []}
            />
        </div>
    );
}
