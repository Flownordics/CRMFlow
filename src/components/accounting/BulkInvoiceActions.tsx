import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckSquare, ChevronDown, Send, DollarSign, RefreshCw, Download } from "lucide-react";
import { Invoice, useBulkInvoiceOperations } from "@/services/invoices";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface BulkInvoiceActionsProps {
  selectedInvoices: Invoice[];
  onClearSelection: () => void;
  onExport?: () => void;
}

type BulkAction = "send" | "mark-paid" | "update-status" | null;

export function BulkInvoiceActions({
  selectedInvoices,
  onClearSelection,
  onExport,
}: BulkInvoiceActionsProps) {
  const { toast } = useToast();
  const { updateStatus, markAsPaid, sendInvoices } = useBulkInvoiceOperations();
  const [pendingAction, setPendingAction] = useState<BulkAction>(null);

  const count = selectedInvoices.length;

  const handleSendInvoices = async () => {
    if (count === 0) return;

    const ids = selectedInvoices.map((inv) => inv.id);

    try {
      const result = await sendInvoices.mutateAsync(ids);

      if (result.failed.length > 0) {
        toast({
          title: "Partial Success",
          description: `${result.successful.length} invoice(s) sent, ${result.failed.length} failed.`,
          variant: "destructive",
        });
        logger.warn("Bulk send partial failure:", result.failed);
      } else {
        toast({
          title: "Invoices Sent",
          description: `${result.successful.length} invoice(s) successfully sent.`,
        });
      }

      onClearSelection();
    } catch (error) {
      logger.error("Bulk send failed:", error);
      toast({
        title: "Operation Failed",
        description: "Failed to send invoices. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleMarkAsPaid = async () => {
    if (count === 0) return;

    const invoicesData = selectedInvoices.map((inv) => ({
      id: inv.id,
      total_minor: inv.total_minor,
      balance_minor: inv.balance_minor,
    }));

    try {
      const result = await markAsPaid.mutateAsync(invoicesData);

      if (result.failed.length > 0) {
        toast({
          title: "Partial Success",
          description: `${result.successful.length} invoice(s) marked as paid, ${result.failed.length} failed.`,
          variant: "destructive",
        });
        logger.warn("Bulk mark paid partial failure:", result.failed);
      } else {
        toast({
          title: "Invoices Marked as Paid",
          description: `${result.successful.length} invoice(s) successfully marked as paid.`,
        });
      }

      onClearSelection();
    } catch (error) {
      logger.error("Bulk mark paid failed:", error);
      toast({
        title: "Operation Failed",
        description: "Failed to mark invoices as paid. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPendingAction(null);
    }
  };

  if (count === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 p-4 bg-primary/5 border rounded-lg">
        <CheckSquare className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-sm font-medium">
          {count} invoice{count !== 1 ? 's' : ''} selected
        </span>

        <div className="flex-1" />

        <Button variant="outline" size="sm" onClick={onClearSelection}>
          Clear
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              Actions
              <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setPendingAction("send")}>
              <Send className="mr-2 h-4 w-4" aria-hidden="true" />
              Send Selected
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPendingAction("mark-paid")}>
              <DollarSign className="mr-2 h-4 w-4" aria-hidden="true" />
              Mark as Paid
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPendingAction("update-status")}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Update Status
            </DropdownMenuItem>
            {onExport && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onExport}>
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Export Selected
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Send Confirmation Dialog */}
      <AlertDialog open={pendingAction === "send"} onOpenChange={() => setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send {count} Invoice{count !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the status to "sent" for all selected invoices. 
              {count > 10 && " This operation may take a while."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendInvoices} disabled={sendInvoices.isPending}>
              {sendInvoices.isPending ? "Sending..." : "Send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark as Paid Confirmation Dialog */}
      <AlertDialog open={pendingAction === "mark-paid"} onOpenChange={() => setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark {count} Invoice{count !== 1 ? 's' : ''} as Paid?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the balance to 0 and status to "paid" for all selected invoices.
              This action cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsPaid} disabled={markAsPaid.isPending}>
              {markAsPaid.isPending ? "Processing..." : "Mark as Paid"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Status Dialog - Coming soon */}
      <AlertDialog open={pendingAction === "update-status"} onOpenChange={() => setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Status</AlertDialogTitle>
            <AlertDialogDescription>
              Bulk status update is coming soon. For now, please update invoices individually.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

