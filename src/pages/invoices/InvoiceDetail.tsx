import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useInvoice } from "@/services/invoices";
import { formatMoneyMinor } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, DollarSign } from "lucide-react";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { AddPaymentModal } from "@/components/invoices/AddPaymentModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OpenPdfButton } from "@/components/common/OpenPdfButton";

export default function InvoiceDetail() {
  const { id = "" } = useParams();
  const { data: invoice, isLoading, error } = useInvoice(id);
  const [creating, setCreating] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Mock line items - TODO: Replace with actual data
  const mockLines = [
    {
      id: "1",
      description: "Product A",
      qty: 2,
      unitMinor: 7500, // $75.00
      taxRatePct: 25,
      discountPct: 0,
    },
  ];



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
            <InvoiceStatusBadge invoice={invoice} />
            <OpenPdfButton
              onGetUrl={() => getInvoicePdfUrl(invoice.id)}
              onLogged={(url) => logPdfGenerated("invoice", invoice.id, invoice.dealId, url)}
              label="Generate PDF"
            />
            <Button
              onClick={() => setPaymentModalOpen(true)}
              disabled={invoice.balance_minor === 0}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
          </div>
        }
      />

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
            <div className="text-2xl font-bold text-green-600">
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
            <div className="text-2xl font-bold text-orange-600">
              {formatMoneyMinor(invoice.balance_minor, invoice.currency)}
            </div>
          </CardContent>
        </Card>
      </div>

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
            <Button variant="ghost" size="sm" disabled title="Coming soon">
              Sync from Deal
            </Button>
          </div>
        </div>
      )}

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
                onBlur={(e) => {
                  // TODO: Implement update
                  console.log("Update due date:", e.target.value);
                }}
              />
            }
          />
          <FormRow
            label="Status"
            control={
              <Select
                defaultValue={invoice.status}
                onValueChange={(v) => {
                  // TODO: Implement update
                  console.log("Update status:", v);
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
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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
              {mockLines.length} items
            </div>
            <div className="flex-1" />
            <Button
              onClick={() => {
                // TODO: Implement add line
                console.log("Add line");
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
          lines={mockLines}
          onPatch={(lineId, patch) => {
            // TODO: Implement update
            console.log("Update line:", lineId, patch);
          }}
          onDelete={(lineId) => {
            // TODO: Implement delete
            console.log("Delete line:", lineId);
          }}
        />
        {mockLines.length === 0 && (
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
          <div className="text-right text-green-600">
            {formatMoneyMinor(invoice.paid_minor, invoice.currency)}
          </div>
          <div className="font-semibold">Balance</div>
          <div className="text-right font-semibold text-orange-600">
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
    </div>
  );
}
