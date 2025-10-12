import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCompanyActivityLogs, useLogCompanyActivity } from "@/services/activityLog";
import { useI18n } from "@/lib/i18n";
import { 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  CheckCircle, 
  Plus,
  PhoneOff,
  Voicemail,
  Clock,
  Handshake,
  ShoppingCart,
  Receipt,
  DollarSign
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";
import { Link } from "react-router-dom";

interface CompanyActivityTimelineProps {
  companyId: string;
}

const activityIcons = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  task: CheckCircle,
  deal: Handshake,
  quote: FileText,
  order: ShoppingCart,
  invoice: Receipt,
  payment: DollarSign,
};

const outcomeLabels: Record<string, string> = {
  completed: "Completed",
  voicemail: "Voicemail",
  no_answer: "No Answer",
  scheduled_followup: "Follow-up Scheduled",
  busy: "Busy",
  wrong_number: "Wrong Number",
  not_interested: "Not Interested",
  callback_requested: "Callback Requested",
};

// Format any outcome not in the mapping (remove underscores, capitalize)
const formatOutcome = (outcome: string) => {
  if (outcomeLabels[outcome]) return outcomeLabels[outcome];
  return outcome.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

export function CompanyActivityTimeline({ companyId }: CompanyActivityTimelineProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [activityType, setActivityType] = useState<string>("call");
  const [outcome, setOutcome] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const { data: activityLogs, isLoading } = useCompanyActivityLogs(companyId);
  const logActivityMutation = useLogCompanyActivity(companyId);

  const handleLogActivity = async () => {
    if (activityType === 'call' && !outcome) {
      toast({
        title: "Select Outcome",
        description: "Please select an outcome for the call",
        variant: "destructive",
      });
      return;
    }

    try {
      await logActivityMutation.mutateAsync({
        companyId,
        type: activityType as any,
        outcome: outcome || undefined,
        notes: notes || undefined,
      });

      toast({
        title: "Activity Logged",
        description: "Activity has been saved successfully",
      });

      setShowLogDialog(false);
      setActivityType("call");
      setOutcome("");
      setNotes("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save activity",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Aktivitetshistorik
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasActivities = activityLogs && activityLogs.length > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Activity History
            </span>
            <Button onClick={() => setShowLogDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Log Activity
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasActivities ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No activities yet</p>
              <p className="text-sm mt-1">Start by logging an activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activityLogs.map((log) => {
                const Icon = activityIcons[log.type] || FileText;
                const timeAgo = log.createdAt 
                  ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: da })
                  : 'Unknown';

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

                const getRelatedLink = () => {
                  if (!log.relatedType || !log.relatedId) return null;
                  
                  const links: Record<string, string> = {
                    deal: `/deals/${log.relatedId}`,
                    quote: `/quotes/${log.relatedId}`,
                    order: `/orders/${log.relatedId}`,
                    invoice: `/invoices/${log.relatedId}`,
                  };
                  
                  return links[log.relatedType];
                };

                const relatedLink = getRelatedLink();

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="mt-0.5">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {activityTypeLabels[log.type] || log.type}
                          </span>
                          {log.outcome && (
                            <span className="text-sm px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {formatOutcome(log.outcome)}
                            </span>
                          )}
                          {relatedLink && (
                            <Link 
                              to={relatedLink}
                              className="text-xs px-2 py-0.5 rounded-full bg-accent hover:bg-accent/80 text-accent-foreground"
                            >
                              Se {log.relatedType}
                            </Link>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {timeAgo}
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {log.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Activity Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
            <DialogDescription>
              Record an activity for this company
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="activity-type">Type *</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger id="activity-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Call
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="meeting">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Meeting
                    </div>
                  </SelectItem>
                  <SelectItem value="note">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Note
                    </div>
                  </SelectItem>
                  <SelectItem value="task">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Task
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(activityType === 'call' || activityType === 'email' || activityType === 'meeting') && (
              <div className="space-y-2">
                <Label htmlFor="outcome">Outcome</Label>
                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger id="outcome">
                    <SelectValue placeholder="Select outcome..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activityType === 'call' && (
                      <>
                        <SelectItem value="completed">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Completed
                          </div>
                        </SelectItem>
                        <SelectItem value="voicemail">
                          <div className="flex items-center gap-2">
                            <Voicemail className="h-4 w-4" />
                            Voicemail
                          </div>
                        </SelectItem>
                        <SelectItem value="no_answer">
                          <div className="flex items-center gap-2">
                            <PhoneOff className="h-4 w-4" />
                            No Answer
                          </div>
                        </SelectItem>
                        <SelectItem value="busy">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Busy
                          </div>
                        </SelectItem>
                        <SelectItem value="not_interested">
                          <div className="flex items-center gap-2">
                            <PhoneOff className="h-4 w-4" />
                            Not Interested
                          </div>
                        </SelectItem>
                      </>
                    )}
                    {(activityType === 'email' || activityType === 'meeting') && (
                      <>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="scheduled_followup">Follow-up Scheduled</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">
                Notes {activityType === 'note' && '*'}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about the activity..."
                rows={4}
                required={activityType === 'note'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleLogActivity}
              disabled={logActivityMutation.isPending || (activityType === 'note' && !notes)}
            >
              {logActivityMutation.isPending ? 'Saving...' : 'Save Activity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

