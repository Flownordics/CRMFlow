import { useParams, Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { Order, OrderSchema } from "@/lib/api";
import { formatMoneyMinor, computeLineTotals } from "@/lib/money";
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
import { StatusBadge } from "@/components/ui/status-badge";
import { LineItemsTable } from "@/components/lines/LineItemsTable";
import { getOrderPdfUrl } from "@/services/pdf";
import { logPdfGenerated } from "@/services/activity";
import { Plus } from "lucide-react";
import { OrderEditorHeader } from "@/components/orders";
import { OpenPdfButton } from "@/components/common/OpenPdfButton";

// Mock data - TODO: Replace with actual API calls
const mockOrder: Order = {
  id: "1",
  number: "O-2024-001",
  quoteId: "quote-1",
  dealId: "deal-1", // Link to source Deal
  companyId: "company-1",
  personId: "person-1",
  amount: 15000,
  currency: "USD",
  status: "confirmed",
  expectedDeliveryDate: "2024-03-15T00:00:00Z",
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z",
};

export default function OrderDetail() {
  const { id = "" } = useParams();
  const [order, setOrder] = useState<Order>(mockOrder); // TODO: Replace with useOrder hook
  const [creating, setCreating] = useState(false);

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

  const totals = useMemo(() => {
    const subtotal = mockLines.reduce((acc, l) => {
      const { afterDiscMinor } = computeLineTotals({
        qty: l.qty,
        unitMinor: l.unitMinor,
        discountPct: l.discountPct,
        taxRatePct: l.taxRatePct,
      });
      return acc + afterDiscMinor;
    }, 0);
    const tax = mockLines.reduce((acc, l) => {
      const { taxMinor } = computeLineTotals({
        qty: l.qty,
        unitMinor: l.unitMinor,
        discountPct: l.discountPct,
        taxRatePct: l.taxRatePct,
      });
      return acc + taxMinor;
    }, 0);
    return { subtotal, tax, total: subtotal + tax };
  }, [mockLines]);



  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Order ${order.number ?? ""}`}
        actions={
          <div className="flex items-center gap-2">
            <OpenPdfButton
              onGetUrl={() => getOrderPdfUrl(order.id)}
              onLogged={(url) => logPdfGenerated("order", order.id, order.dealId, url)}
              label="Generate PDF"
            />
          </div>
        }
      />

      <OrderEditorHeader
        order={order}
        onOpenPdf={handlePdf}
        onConvertToInvoice={() => {
          // TODO: Implement convert to invoice
          console.log("Convert to invoice");
        }}
        onMarkFulfilled={() => {
          // TODO: Implement mark as fulfilled
          console.log("Mark as fulfilled");
        }}
      />

      {/* Linked Deal information */}
      {order.dealId && (
        <div className="rounded-2xl border bg-muted/30 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Linked deal:{" "}
              <a
                className="underline hover:text-foreground"
                href={`/deals/${order.dealId}`}
              >
                {order.dealId}
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
            label="Expected Delivery Date"
            control={
              <Input
                type="date"
                defaultValue={
                  order.expectedDeliveryDate
                    ? new Date(order.expectedDeliveryDate)
                      .toISOString()
                      .split("T")[0]
                    : ""
                }
                onBlur={(e) => {
                  // TODO: Implement update
                  console.log("Update expected delivery date:", e.target.value);
                }}
              />
            }
          />
          <FormRow
            label="Status"
            control={
              <Select
                defaultValue={order.status}
                onValueChange={(v) => {
                  // TODO: Implement update
                  console.log("Update status:", v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        </div>
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
          currency={order.currency}
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
            {formatMoneyMinor(totals.subtotal, order.currency)}
          </div>
          <div className="text-muted-foreground">Tax</div>
          <div className="text-right">
            {formatMoneyMinor(totals.tax, order.currency)}
          </div>
          <div className="font-semibold">Total</div>
          <div className="text-right font-semibold">
            {formatMoneyMinor(totals.total, order.currency)}
          </div>
        </div>
      </div>

      <div className="text-sm">
        <Link className="underline" to="/orders">
          ← Back to orders
        </Link>
      </div>
    </div>
  );
}
