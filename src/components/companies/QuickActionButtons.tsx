import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Calendar, Handshake, FileText, PhoneCall, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useLogCompanyActivity } from "@/services/activityLog";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CreateEventDialog } from "@/components/calendar/CreateEventDialog";
import { CreateDealModal } from "@/components/deals/CreateDealModal";
import { CreateQuoteModal } from "@/components/quotes/CreateQuoteModal";
import { useUpdateCompany } from "@/services/companies";
import { lookupCvr, mapCvrToCompanyData } from "@/services/cvrLookup";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";

interface QuickActionButtonsProps {
  companyId: string;
  companyName: string;
  companyEmail?: string | null;
  companyVat?: string | null;
}

export function QuickActionButtons({ companyId, companyName, companyEmail, companyVat }: QuickActionButtonsProps) {
  const navigate = useNavigate();
  const [logCallDialogOpen, setLogCallDialogOpen] = useState(false);
  const [scheduleMeetingDialogOpen, setScheduleMeetingDialogOpen] = useState(false);
  const [createDealModalOpen, setCreateDealModalOpen] = useState(false);
  const [createQuoteModalOpen, setCreateQuoteModalOpen] = useState(false);
  const [callOutcome, setCallOutcome] = useState<string>("");
  const [callNotes, setCallNotes] = useState("");
  const [isCvrSyncing, setIsCvrSyncing] = useState(false);
  const logActivity = useLogCompanyActivity(companyId);
  const updateCompany = useUpdateCompany(companyId);
  const queryClient = useQueryClient();

  const handleSendEmail = () => {
    if (companyEmail) {
      // Open Gmail compose or native email client
      window.location.href = `mailto:${companyEmail}?subject=Re: ${companyName}`;
    } else {
      toast.error("No email address available");
    }
  };

  const handleLogCall = async () => {
    if (!callOutcome) {
      toast.error("Please select a call outcome");
      return;
    }

    try {
      await logActivity.mutateAsync({
        companyId,
        type: 'call',
        outcome: callOutcome,
        notes: callNotes || undefined,
      });
      toast.success("Call logged successfully");
      setLogCallDialogOpen(false);
      setCallOutcome("");
      setCallNotes("");
    } catch (error) {
      toast.error("Failed to log call");
    }
  };

  const handleScheduleMeeting = () => {
    // Open create event dialog with pre-filled company info
    setScheduleMeetingDialogOpen(true);
  };

  const handleCreateDeal = () => {
    setCreateDealModalOpen(true);
  };

  const handleCreateQuote = () => {
    setCreateQuoteModalOpen(true);
  };

  const handleCvrSync = async () => {
    if (!companyVat || companyVat.trim() === "") {
      toast.error("No CVR number available for this company");
      return;
    }

    setIsCvrSyncing(true);
    try {
      // Lookup CVR data using the company's VAT number
      const cvrData = await lookupCvr(companyVat);
      const mappedData = mapCvrToCompanyData(cvrData);

      // Update company with CVR data
      await updateCompany.mutateAsync(mappedData);

      // Invalidate and refetch company data
      await queryClient.invalidateQueries({ queryKey: qk.company(companyId) });

      toast.success(`Company data synced from CVR: ${cvrData.name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to sync CVR data: ${errorMessage}`);
    } finally {
      setIsCvrSyncing(false);
    }
  };

  const actions = [
    {
      label: "Send Email",
      icon: Mail,
      onClick: handleSendEmail,
      variant: "default" as const,
      disabled: !companyEmail,
    },
    {
      label: "Log Call",
      icon: Phone,
      onClick: () => setLogCallDialogOpen(true),
      variant: "outline" as const,
    },
    {
      label: "Schedule Meeting",
      icon: Calendar,
      onClick: handleScheduleMeeting,
      variant: "outline" as const,
    },
    {
      label: "Create Deal",
      icon: Handshake,
      onClick: handleCreateDeal,
      variant: "outline" as const,
    },
    {
      label: "Create Quote",
      icon: FileText,
      onClick: handleCreateQuote,
      variant: "outline" as const,
    },
    {
      label: "CVR Sync",
      icon: RefreshCw,
      onClick: handleCvrSync,
      variant: "outline" as const,
      disabled: !companyVat || companyVat.trim() === "" || isCvrSyncing,
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PhoneCall className="h-4 w-4" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            const isLoading = action.label === "CVR Sync" && isCvrSyncing;
            return (
              <Button
                key={action.label}
                variant={action.variant}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled || isLoading}
                className="w-full"
              >
                <Icon className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Syncing..." : action.label}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Log Call Dialog */}
      <Dialog open={logCallDialogOpen} onOpenChange={setLogCallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Call</DialogTitle>
            <DialogDescription>
              Record a call with {companyName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="outcome">Call Outcome *</Label>
              <Select value={callOutcome} onValueChange={setCallOutcome}>
                <SelectTrigger id="outcome">
                  <SelectValue placeholder="Select outcome..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                  <SelectItem value="no_answer">No Answer</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="scheduled_followup">Scheduled Follow-up</SelectItem>
                  <SelectItem value="wrong_number">Wrong Number</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                  <SelectItem value="callback_requested">Callback Requested</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add call notes..."
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setLogCallDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleLogCall} disabled={logActivity.isPending || !callOutcome}>
                {logActivity.isPending ? "Logging..." : "Log Call"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Meeting Dialog */}
      <CreateEventDialog
        open={scheduleMeetingDialogOpen}
        onOpenChange={setScheduleMeetingDialogOpen}
        onEventCreated={() => {
          toast.success("Meeting scheduled successfully");
        }}
        defaultCompanyId={companyId}
        defaultTitle={`Meeting with ${companyName}`}
      />

      {/* Create Deal Modal */}
      <CreateDealModal
        open={createDealModalOpen}
        onOpenChange={setCreateDealModalOpen}
        defaultCompanyId={companyId}
      />

      {/* Create Quote Modal */}
      <CreateQuoteModal
        open={createQuoteModalOpen}
        onOpenChange={setCreateQuoteModalOpen}
        defaultCompanyId={companyId}
        defaultTitle={`Quote for ${companyName}`}
      />
    </>
  );
}

