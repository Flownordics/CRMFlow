import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useInvoice, useUpdateInvoice, useUpsertInvoiceLine, useDeleteInvoiceLine, Invoice } from "@/services/invoices";
import { formatMoneyMinor } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { FormRow } from "@/components/forms/FormRow";
import { LineItemsTable } from "@/components/lines/LineItemsTable";
import { getInvoicePdfUrl } from "@/services/pdf";
import { logPdfGenerated } from "@/services/activity";
import { Plus, DollarSign, Receipt, Bell } from "lucide-react";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { AddPaymentModal } from "@/components/invoices/AddPaymentModal";
import { SendInvoiceDialog } from "@/components/invoices/SendInvoiceDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OpenPdfButton } from "@/components/common/OpenPdfButton";
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/lib/logger';
import { useInvoicePayments } from "@/services/payments";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RelatedTasksList } from "@/components/tasks/RelatedTasksList";
import { useProjectFromDeal } from "@/services/projects";
import { FolderKanban } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function InvoiceDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: invoice, isLoading, error } = useInvoice(id);
  const { data: project } = useProjectFromDeal(invoice?.dealId);
  const { data: payments = [], isLoading: paymentsLoading } = useInvoicePayments(id);
  const [creating, setCreating] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  // Mutations
  const updateInvoiceMutation = useUpdateInvoice();
  const upsertLineMutation = useUpsertInvoiceLine(id);
  const deleteLineMutation = useDeleteInvoiceLine(id);

  const lines = invoice?.lines || [];

  // Check if invoice is overdue
  const isOverdue = invoice?.due_date 
    ? new Date(invoice.due_date) < new Date() && invoice.balance_minor > 0
    : false;



  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Invoice not found</h2>
          <p className="text-gray-600 mt-2">The invoice you're looking for doesn't exist.</p>
          <Link to="/invoices" className="text-blue-600 hover:underline mt-4 inline-block">
            ← Back to invoices
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Invoice ${invoice.number ?? ""}`}
        actions={
          <div className="flex items-center gap-2">
            {invoice.dealId && project && (
              <Button
                variant="outline"
                onClick={() => navigate(`/projects/${project.id}`)}
                className="flex items-center gap-2"
              >
                <FolderKanban className="h-4 w-4" />
                View Project
              </Button>
            )}
            <InvoiceStatusBadge invoice={invoice} />
            <OpenPdfButton
              onGetUrl={() => getInvoicePdfUrl(invoice.id)}
              onLogged={(url) => logPdfGenerated("invoice", invoice.id, invoice.dealId, url)}
              label="Generate PDF"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setPaymentModalOpen(true)}
                  disabled={invoice.balance_minor === 0}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Add Payment
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add payment to invoice</TooltipContent>
            </Tooltip>
            {isOverdue && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => setReminderDialogOpen(true)}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    Send Reminder
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send payment reminder for overdue invoice</TooltipContent>
              </Tooltip>
            )}
          </div>
        }
      />

      {/* Linked Project information */}
      {invoice.dealId && project && (
        <div className="rounded-2xl border bg-muted/30 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Linked project:{" "}
              <Link
                className="underline hover:text-foreground"
                to={`/projects/${project.id}`}
              >
                {project.name}
              </Link>
            </div>
            <div className="text-xs text-muted-foreground">
              (via deal)
            </div>
          </div>
        </div>
      )}

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMoneyMinor(invoice.total_minor, invoice.currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Amount Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#6b7c5e]">
              {formatMoneyMinor(invoice.paid_minor, invoice.currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#9d855e]">
              {formatMoneyMinor(invoice.balance_minor, invoice.currency)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden="true" focusable="false" />
              <CardTitle className="text-base">Payment History</CardTitle>
              <span className="text-sm text-muted-foreground">
                ({payments.length} payment{payments.length !== 1 ? 's' : ''})
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted/30 animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="max-w-[300px]">Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(payment.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="capitalize">{payment.method}</TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">
                          {formatMoneyMinor(payment.amount_minor, invoice.currency)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
                          {payment.note || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Linked Deal information */}
      {invoice.deal_id && (
        <div className="rounded-2xl border bg-muted/30 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Linked deal:{" "}
              <a
                className="underline hover:text-foreground"
                href={`/deals/${invoice.deal_id}`}
              >
                {invoice.deal_id}
              </a>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" disabled>
                  Sync from Deal
                </Button>
              </TooltipTrigger>
              <TooltipContent>Coming soon - Sync invoice data from linked deal</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Tasks Section */}
      <RelatedTasksList
        relatedType="invoice"
        relatedId={invoice.id}
        relatedTitle={`Invoice ${invoice.number ?? ""}`}
      />

      {/* Header fields */}
      <div className="rounded-2xl border p-4 shadow-card">
        <div className="grid gap-4 md:grid-cols-2">
          <FormRow
            label="Due Date"
            control={
              <Input
                type="date"
                defaultValue={
                  invoice.due_date
                    ? new Date(invoice.due_date).toISOString().split("T")[0]
                    : ""
                }
                onBlur={async (e) => {
                  const newDate = e.target.value;
                  if (!newDate) return;
                  
                  try {
                    await updateInvoiceMutation.mutateAsync({
                      id: invoice.id,
                      payload: { due_date: newDate }
                    });
                    toast({
                      title: "Date Updated",
                      description: "Due date has been updated",
                    });
                  } catch (error) {
                    logger.error("Failed to update due date:", error);
                    toast({
                      title: "Update Failed",
                      description: "Failed to update due date",
                      variant: "destructive"
                    });
                  }
                }}
              />
            }
          />
          <FormRow
            label="Status"
            control={
              <Select
                defaultValue={invoice.status}
                onValueChange={async (v) => {
                  try {
                    await updateInvoiceMutation.mutateAsync({
                      id: invoice.id,
                      payload: { status: v as Invoice["status"] }
                    });
                    toast({
                      title: "Status Updated",
                      description: `Invoice status changed to ${v}`,
                    });
                  } catch (error) {
                    logger.error("Failed to update invoice status:", error);
                    toast({
                      title: "Update Failed",
                      description: "Failed to update invoice status",
                      variant: "destructive"
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        </div>

        {/* Overdue warning */}
        {invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.balance_minor > 0 && (
          <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
            <div className="text-sm font-medium text-destructive">
              ⚠️ This invoice is overdue
            </div>
            <div className="mt-1 text-xs text-destructive/80">
              Due date: {new Date(invoice.due_date).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      {/* Lines table */}
      <DataTable
        toolbar={
          <>
            <div className="text-sm text-muted-foreground">
              {lines.length} items
            </div>
            <div className="flex-1" />
            <Button
              onClick={async () => {
                setCreating(true);
                try {
                  await upsertLineMutation.mutateAsync({
                    description: "New Item",
                    qty: 1,
                    unit_minor: 0,
                    tax_rate_pct: 25,
                    discount_pct: 0,
                  });
                  toast({
                    title: "Line Added",
                    description: "New line item has been added",
                  });
                } catch (error) {
                  logger.error("Failed to add line:", error);
                  toast({
                    title: "Failed to Add Line",
                    description: "Could not add line item. Please try again.",
                    variant: "destructive"
                  });
                } finally {
                  setCreating(false);
                }
              }}
              disabled={creating}
            >
              <Plus
                aria-hidden="true"
                focusable="false"
                className="mr-1 h-4 w-4"
              />{" "}
              Add Line
            </Button>
          </>
        }
      >
        <LineItemsTable
          currency={invoice.currency}
          lines={lines}
          onPatch={async (lineId, patch) => {
            try {
              await upsertLineMutation.mutateAsync({
                id: lineId,
                ...patch,
              });
              toast({
                title: "Line Updated",
                description: "Line item has been updated",
              });
            } catch (error) {
              logger.error("Failed to update line:", error);
              toast({
                title: "Update Failed",
                description: "Could not update line item",
                variant: "destructive"
              });
            }
          }}
          onDelete={async (lineId) => {
            if (!window.confirm("Delete this line item?")) return;
            
            try {
              await deleteLineMutation.mutateAsync(lineId);
              toast({
                title: "Line Deleted",
                description: "Line item has been deleted",
              });
            } catch (error) {
              logger.error("Failed to delete line:", error);
              toast({
                title: "Delete Failed",
                description: "Could not delete line item",
                variant: "destructive"
              });
            }
          }}
        />
        {lines.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">
            No lines yet
          </div>
        )}
      </DataTable>

      {/* Totals */}
      <div className="flex flex-col items-end gap-1">
        <div className="grid w-full grid-cols-2 gap-x-8 gap-y-1 text-sm sm:w-auto">
          <div className="text-muted-foreground">Subtotal</div>
          <div className="text-right">
            {formatMoneyMinor(invoice.subtotal_minor, invoice.currency)}
          </div>
          <div className="text-muted-foreground">Tax</div>
          <div className="text-right">
            {formatMoneyMinor(invoice.tax_minor, invoice.currency)}
          </div>
          <div className="font-semibold">Total</div>
          <div className="text-right font-semibold">
            {formatMoneyMinor(invoice.total_minor, invoice.currency)}
          </div>
          <div className="text-muted-foreground">Paid</div>
          <div className="text-right text-[#6b7c5e]">
            {formatMoneyMinor(invoice.paid_minor, invoice.currency)}
          </div>
          <div className="font-semibold">Balance</div>
          <div className="text-right font-semibold text-[#9d855e]">
            {formatMoneyMinor(invoice.balance_minor, invoice.currency)}
          </div>
        </div>
      </div>

      <div className="text-sm">
        <Link className="underline" to="/invoices">
          ← Back to invoices
        </Link>
      </div>

      {/* Payment Modal */}
      <AddPaymentModal
        invoiceId={invoice.id}
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        currency={invoice.currency}
        balanceMinor={invoice.balance_minor}
      />

      {/* Reminder Dialog */}
      {invoice && (
        <SendInvoiceDialog
          invoice={invoice}
          open={reminderDialogOpen}
          onOpenChange={setReminderDialogOpen}
          isReminder={true}
        />
      )}
    </div>
  );
}
