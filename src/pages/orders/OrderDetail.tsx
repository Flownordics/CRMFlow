import { useParams, Link, useNavigate } from "react-router-dom";
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
import { ensureInvoiceForOrder } from "@/services/conversions";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { triggerDealStageAutomation } from "@/services/dealStageAutomation";
import { logger } from '@/lib/logger';
import { useOrder, useUpdateOrderHeader, useUpsertOrderLine, useDeleteOrderLine } from "@/services/orders";

export default function OrderDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Fetch order data with React Query
  const { data: order, isLoading, error } = useOrder(id);
  
  // Mutations
  const updateHeaderMutation = useUpdateOrderHeader(id);
  const upsertLineMutation = useUpsertOrderLine(id);
  const deleteLineMutation = useDeleteOrderLine(id);

  // Loading and error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading order...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load order</p>
          <Button onClick={() => navigate("/orders")}>Back to Orders</Button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Order not found</p>
          <Button onClick={() => navigate("/orders")}>Back to Orders</Button>
        </div>
      </div>
    );
  }

  const lines = order.lines || [];

  const totals = useMemo(() => {
    const subtotal = lines.reduce((acc, l) => {
      const { afterDiscMinor } = computeLineTotals({
        qty: l.qty,
        unitMinor: l.unitMinor,
        discountPct: l.discountPct,
        taxRatePct: l.taxRatePct,
      });
      return acc + afterDiscMinor;
    }, 0);
    const tax = lines.reduce((acc, l) => {
      const { taxMinor } = computeLineTotals({
        qty: l.qty,
        unitMinor: l.unitMinor,
        discountPct: l.discountPct,
        taxRatePct: l.taxRatePct,
      });
      return acc + taxMinor;
    }, 0);
    return { subtotal, tax, total: subtotal + tax };
  }, [lines]);

  const handlePdf = async () => {
    try {
      const url = await getOrderPdfUrl(order.id);
      await logPdfGenerated("order", order.id, order.dealId, url);
    } catch (error) {
      logger.error("Failed to generate PDF:", error);
    }
  };

  const handleConvertToInvoice = async () => {
    if (isConverting) return;

    try {
      setIsConverting(true);
      const { id: invoiceId } = await ensureInvoiceForOrder(order.id);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: qk.orders() });
      queryClient.invalidateQueries({ queryKey: qk.order(id) });
      queryClient.invalidateQueries({ queryKey: qk.invoices() });
      if (order.dealId) {
        queryClient.invalidateQueries({ queryKey: qk.deal(order.dealId) });
      }

      toast({
        title: "Invoice Created",
        description: `Order converted to invoice #${invoiceId}`,
        variant: "success"
      });
    } catch (error) {
      logger.error("Failed to convert order to invoice:", error);
      toast({
        title: "Conversion Failed",
        description: "Failed to convert order to invoice. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleStatusChange = async (newStatus: Order["status"]) => {
    const oldStatus = order.status;

    try {
      // Update order status via API
      await updateHeaderMutation.mutateAsync({ status: newStatus });

      // Trigger deal stage automation for order status changes
      if (order.dealId) {
        try {
          if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
            await triggerDealStageAutomation('order_cancelled', order.dealId, { ...order, status: newStatus });
          }
        } catch (error) {
          logger.warn("Deal stage automation failed:", error);
        }
      }

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
      });
    } catch (error) {
      logger.error("Failed to update order status:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update order status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleMarkFulfilled = async () => {
    if (!window.confirm("Mark this order as fulfilled?")) return;

    try {
      await updateHeaderMutation.mutateAsync({ status: "delivered" });
      
      toast({
        title: "Order Fulfilled",
        description: "Order has been marked as delivered",
        variant: "success"
      });
    } catch (error) {
      logger.error("Failed to mark order as fulfilled:", error);
      toast({
        title: "Update Failed",
        description: "Failed to mark order as fulfilled. Please try again.",
        variant: "destructive"
      });
    }
  };

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
        onConvertToInvoice={handleConvertToInvoice}
        onMarkFulfilled={handleMarkFulfilled}
        onStatusChange={handleStatusChange}
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
                onBlur={async (e) => {
                  const newDate = e.target.value;
                  if (!newDate) return;
                  
                  try {
                    await updateHeaderMutation.mutateAsync({ 
                      expectedDeliveryDate: new Date(newDate).toISOString() 
                    });
                    toast({
                      title: "Date Updated",
                      description: "Expected delivery date has been updated",
                    });
                  } catch (error) {
                    logger.error("Failed to update delivery date:", error);
                    toast({
                      title: "Update Failed",
                      description: "Failed to update delivery date",
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
                defaultValue={order.status}
                onValueChange={(v) => handleStatusChange(v as Order["status"])}
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
              {lines.length} items
            </div>
            <div className="flex-1" />
            <Button
              onClick={async () => {
                setCreating(true);
                try {
                  await upsertLineMutation.mutateAsync({
                    parentId: order.id,
                    parentType: "order",
                    description: "New Item",
                    qty: 1,
                    unitMinor: 0,
                    taxRatePct: 25,
                    discountPct: 0,
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
          currency={order.currency}
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
