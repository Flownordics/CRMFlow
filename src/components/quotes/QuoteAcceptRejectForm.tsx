import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSubmitResponse } from "@/services/quoteResponses";
import { trackEvent } from "@/services/quoteTracking";
import { logger } from "@/lib/logger";
import { toastBus } from "@/lib/toastBus";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";

interface QuoteAcceptRejectFormProps {
  quoteId: string;
  tokenId: string | null;
  quoteStatus: string;
}

export function QuoteAcceptRejectForm({
  quoteId,
  tokenId,
  quoteStatus,
}: QuoteAcceptRejectFormProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitResponse = useSubmitResponse();
  const qc = useQueryClient();

  // Don't show form if quote is already accepted/declined
  if (quoteStatus === "accepted" || quoteStatus === "declined") {
    return null;
  }

  const handleAccept = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await submitResponse.mutateAsync({
        quoteId,
        tokenId: tokenId || null,
        responseType: "accepted",
      });

      // Track accepted event
      await trackEvent({
        quoteId,
        tokenId: tokenId || null,
        eventType: "accepted",
        metadata: { response_id: "accepted" },
      });

      // Invalidate queries to refresh quote status
      qc.invalidateQueries({ queryKey: qk.quote(quoteId) });
      qc.invalidateQueries({ queryKey: ["quote-response", quoteId] });

      toastBus.emit({
        title: "Quote Accepted",
        description: "Thank you for accepting the quote. We will be in touch soon.",
        variant: "success",
      });

      // Reload page to show updated status
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      logger.error("Failed to accept quote:", error);
      toastBus.emit({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to accept quote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await submitResponse.mutateAsync({
        quoteId,
        tokenId: tokenId || null,
        responseType: "rejected",
        comment: rejectComment.trim() || null,
      });

      // Track rejected event
      await trackEvent({
        quoteId,
        tokenId: tokenId || null,
        eventType: "rejected",
        metadata: {
          response_id: "rejected",
          comment: rejectComment.trim() || null,
        },
      });

      // Invalidate queries to refresh quote status
      qc.invalidateQueries({ queryKey: qk.quote(quoteId) });
      qc.invalidateQueries({ queryKey: ["quote-response", quoteId] });

      toastBus.emit({
        title: "Quote Rejected",
        description: "Thank you for your feedback. We appreciate your response.",
        variant: "default",
      });

      // Close dialog and reload page
      setRejectDialogOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      logger.error("Failed to reject quote:", error);
      toastBus.emit({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to reject quote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex gap-4">
        <Button
          onClick={handleAccept}
          disabled={isSubmitting}
          size="lg"
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          Accept Quote
        </Button>
        <Button
          onClick={() => setRejectDialogOpen(true)}
          disabled={isSubmitting}
          size="lg"
          variant="destructive"
          className="flex items-center gap-2"
        >
          <XCircle className="h-4 w-4" />
          Reject Quote
        </Button>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Quote</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this quote (optional). This
              helps us improve our service.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-comment">Comment (optional)</Label>
              <Textarea
                id="reject-comment"
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Enter your reason for rejecting this quote..."
                rows={4}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject Quote"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
