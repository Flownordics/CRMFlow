import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
    useOrder,
    useUpdateOrderHeader,
    useUpsertOrderLine,
    useDeleteOrderLine,
    useDeleteOrder,
} from "@/services/orders";
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
import { PageHeader } from "@/components/layout/PageHeader";
import { FormRow } from "@/components/forms/FormRow";

import { getOrderPdfUrl } from "@/services/pdf";
import { logPdfGenerated } from "@/services/activity";
import { Plus, Trash2, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toastBus } from "@/lib/toastBus";
import { generateFriendlyNumber } from "@/lib/friendlyNumbers";

import { OpenPdfButton } from "@/components/common/OpenPdfButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from '@/lib/logger';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLineItems } from "@/hooks/useLineItems";
import { LineItemsTable } from "@/components/lines/LineItemsTable";
import { useCompanyLookup } from "@/hooks/useCompanyLookup";

export default function OrderEditor() {
    const { id = "" } = useParams();
    const navigate = useNavigate();

    const { data: order, isLoading, error } = useOrder(id);
    const updateHeader = useUpdateOrderHeader(id);
    const upsertLine = useUpsertOrderLine(id);
    const deleteLine = useDeleteOrderLine(id);
    const deleteOrderMutation = useDeleteOrder();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const { getCompanyName } = useCompanyLookup();

    // Use the new line items hook
    const lineItems = useLineItems({
        initialLines: order?.lines || [],
        onPatch: async (lineId, patch) => {
            // Calculate line total if relevant fields changed
            const existingLine = order?.lines.find((l) => l.id === lineId);
            if (existingLine && (patch.qty !== undefined || patch.unitMinor !== undefined || 
                patch.taxRatePct !== undefined || patch.discountPct !== undefined)) {
                const { computeLineTotals } = await import("@/lib/money");
                const { totalMinor } = computeLineTotals({
                    qty: patch.qty !== undefined ? patch.qty : existingLine.qty,
                    unitMinor: patch.unitMinor !== undefined ? patch.unitMinor : existingLine.unitMinor,
                    discountPct: patch.discountPct !== undefined ? patch.discountPct : existingLine.discountPct,
                    taxRatePct: patch.taxRatePct !== undefined ? patch.taxRatePct : existingLine.taxRatePct,
                });
                patch = { ...patch, lineTotalMinor: totalMinor };
            }
            await upsertLine.mutateAsync({ id: lineId, ...patch });
        },
        onDelete: async (lineId) => {
            await deleteLine.mutateAsync(lineId);
        },
    });

    // Sync lines when order changes
    useEffect(() => {
        if (order?.lines) {
            lineItems.setLines(order.lines);
        }
    }, [order?.lines, order?.id]);


    // Local state for form fields
    const [orderDate, setOrderDate] = useState("");
    const [status, setStatus] = useState("");
    const [notes, setNotes] = useState("");
    const [currency, setCurrency] = useState("DKK");

    // Update local state when order data changes
    useEffect(() => {
        if (order) {
            // Set order date to creation date if not set
            const defaultOrderDate = order.order_date || order.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
            setOrderDate(defaultOrderDate);

            // Set status to "accepted" if order came from quote, otherwise use existing status
            const defaultStatus = order.quote_id ? "accepted" : (order.status || "draft");
            setStatus(defaultStatus);

            // Set notes from quote or existing notes
            const defaultNotes = order.notes || (order.quote_id ? `Order created from quote` : "");
            setNotes(defaultNotes);

            // Set currency from order or default to DKK
            setCurrency(order.currency || "DKK");
        }
    }, [order]);

    // Use totals from the hook
    const totals = lineItems.totals;

    // Handle header field changes
    const handleHeaderChange = (field: string, value: string) => {
        if (!order) return;

        const patch: any = { [field]: value };
        updateHeader.mutate(patch);
    };

    // Handle delete order
    const handleDelete = async () => {
        if (!order) return;
        try {
            await deleteOrderMutation.mutateAsync(order.id);
            toastBus.emit({
                title: "Order Deleted",
                description: `Order ${order.number || order.id} has been moved to trash.`,
                variant: "success",
                action: {
                    label: "Restore",
                    onClick: () => {
                        window.location.href = "/settings?tab=trash";
                    }
                }
            });
            navigate("/orders");
        } catch (error: any) {
            toastBus.emit({
                title: "Error",
                description: error.message || "Failed to delete order. Please try again.",
                variant: "destructive",
            });
        }
    };

    // Handle add new line
    const handleAddLine = async () => {
        const tempId = lineItems.addLine({
            description: "",
            qty: 1,
            unitMinor: 0,
            taxRatePct: 25,
            discountPct: 0,
        });

        // Save to server to get real ID and calculate lineTotalMinor
        try {
            const { computeLineTotals } = await import("@/lib/money");
            const { totalMinor } = computeLineTotals({
                qty: 1,
                unitMinor: 0,
                taxRatePct: 25,
                discountPct: 0,
            });

            const result = await upsertLine.mutateAsync({
                description: "",
                qty: 1,
                unitMinor: 0,
                taxRatePct: 25,
                discountPct: 0,
                lineTotalMinor: totalMinor,
            });

            // Update with the real ID from the server
            if (result) {
                lineItems.setLines(
                    lineItems.lines.map((line) =>
                        line.id === tempId ? { ...line, id: result.id } : line
                    )
                );
            }
        } catch (error) {
            // Remove the temp line if save failed
            lineItems.deleteLine(tempId);
            throw error;
        }
    };

    // Handle PDF generation
    const handlePdfGenerated = async () => {
        try {
            await logPdfGenerated("order", order!.id);
        } catch (error) {
            logger.warn("Failed to log PDF generation:", error);
        }
    };

    // Handle convert to invoice
    const handleConvertToInvoice = async () => {
        try {
            const { ensureInvoiceForOrder } = await import("@/services/conversions");
            const { id: invoiceId } = await ensureInvoiceForOrder(order!.id);

            // Show success toast
            const { toastBus } = await import("@/lib/toastBus");
            toastBus.emit({
                title: "Invoice Created",
                description: `Invoice #${invoiceId} has been created from this order.`,
                variant: "success"
            });

            // Update order status to invoiced
            updateHeader.mutate({ status: "invoiced" });
        } catch (error) {
            logger.warn("Failed to convert order to invoice:", error);
            const { toastBus } = await import("@/lib/toastBus");
            toastBus.emit({
                title: "Invoice Creation Failed",
                description: "Failed to create invoice from order. Please try again.",
                variant: "destructive"
            });
        }
    };

    if (isLoading) return <div className="p-6">Loading order...</div>;
    if (error || !order)
        return (
            <div className="p-6 text-destructive" role="alert">
                Could not load order
            </div>
        );

    return (
        <div className="space-y-6 p-6">
            <PageHeader
                title={`Order ${order.number ?? generateFriendlyNumber(order.id, 'order')}`}
                subtitle={order.company_id ? `Company: ${getCompanyName(order.company_id)}` : ""}
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={async () => {
                                try {
                                    // Import conversion function
                                    const { ensureInvoiceForOrder } = await import("@/services/conversions");
                                    await ensureInvoiceForOrder(order.id);

                                    // Update order status to invoiced
                                    updateHeader.mutate({ status: "invoiced" });

                                    // Show success message
                                    const { toastBus } = await import("@/lib/toastBus");
                                    toastBus.emit({
                                        title: "Invoice Created",
                                        description: "Invoice has been created successfully.",
                                        variant: "success"
                                    });
                                } catch (error) {
                                    logger.error("Failed to create invoice:", error);
                                    const { toastBus } = await import("@/lib/toastBus");
                                    toastBus.emit({
                                        title: "Error",
                                        description: "Failed to create invoice.",
                                        variant: "destructive"
                                    });
                                }
                            }}
                            variant="outline"
                            size="sm"
                            disabled={order.status === "invoiced"}
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            {order.status === "invoiced" ? "Already Invoiced" : "Convert to Invoice"}
                        </Button>
                        <OpenPdfButton
                            onGetUrl={() => getOrderPdfUrl(order.id)}
                            onLogged={handlePdfGenerated}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsDeleteDialogOpen(true)}
                            className="text-destructive hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </Button>
                    </div>
                }
            />

            {/* Linked Deal Panel */}
            {order.deal_id && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Linked Deal</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Link
                            to={`/deals/${order.deal_id}`}
                            className="text-[#7a9db3] hover:text-[#6a8da3] underline"
                        >
                            View Deal
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Header Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormRow
                            label="Order Date"
                            control={
                                <Input
                                    type="date"
                                    value={orderDate}
                                    onChange={(e) => {
                                        setOrderDate(e.target.value);
                                        handleHeaderChange("order_date", e.target.value);
                                    }}
                                />
                            }
                        />

                        <FormRow
                            label="Status"
                            control={
                                <div className="space-y-2">
                                    <Select
                                        value={status}
                                        onValueChange={(value) => {
                                            setStatus(value);
                                            handleHeaderChange("status", value);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="accepted">Accepted</SelectItem>
                                            <SelectItem value="confirmed">Confirmed</SelectItem>
                                            <SelectItem value="processing">Processing</SelectItem>
                                            <SelectItem value="fulfilled">Fulfilled (auto-creates invoice)</SelectItem>
                                            <SelectItem value="shipped">Shipped</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                            <SelectItem value="backorder">Backorder</SelectItem>
                                            <SelectItem value="invoiced">Invoiced</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        💡 Tip: Use "Convert to Invoice" button above or set status to "Fulfilled" to create an invoice
                                    </p>
                                </div>
                            }
                        />

                        <FormRow
                            label="Currency"
                            control={
                                <Select
                                    value={currency}
                                    onValueChange={(value) => {
                                        setCurrency(value);
                                        handleHeaderChange("currency", value);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DKK">DKK</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                    </SelectContent>
                                </Select>
                            }
                        />
                    </div>

                    <FormRow
                        label="Notes"
                        control={
                            <Textarea
                                value={notes}
                                onChange={(e) => {
                                    setNotes(e.target.value);
                                    handleHeaderChange("notes", e.target.value);
                                }}
                                placeholder="Add notes..."
                                rows={3}
                            />
                        }
                    />
                </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Line Items</CardTitle>
                        <Button onClick={handleAddLine} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Line
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {lineItems.lines.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                            No line items yet
                        </div>
                    ) : (
                        <LineItemsTable
                            currency={currency}
                            lines={lineItems.lines.map((line) => ({
                                id: line.id,
                                sku: line.sku ?? null,
                                description: line.description,
                                qty: line.qty,
                                unitMinor: line.unitMinor,
                                taxRatePct: line.taxRatePct,
                                discountPct: line.discountPct,
                            }))}
                            showSku={false}
                            onPatch={(lineId, patch) => {
                                // Use the hook's patchLine which handles validation and saving
                                lineItems.patchLine(lineId, patch);
                            }}
                            onDelete={(lineId) => {
                                // Use the hook's deleteLine which handles deletion
                                lineItems.deleteLine(lineId);
                            }}
                            labels={{
                                description: "Description",
                                qty: "Qty",
                                unit: "Unit",
                                discount_pct: "Discount %",
                                tax_pct: "Tax %",
                                line_total: "Total",
                            }}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Totals */}
            <Card>
                <CardHeader>
                    <CardTitle>Totals</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>{formatMoneyMinor(totals.subtotal, currency)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tax:</span>
                            <span>{formatMoneyMinor(totals.tax, currency)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total:</span>
                            <span>{formatMoneyMinor(totals.total, currency)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Back to Orders */}
            <div className="flex justify-start">
                <Button variant="outline" asChild>
                    <Link to="/orders">← Back to Orders</Link>
                </Button>
            </div>

            {order && (
                <ConfirmationDialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                    title="Delete Order"
                    description={`Are you sure you want to delete order ${order.number || order.id}? This will be moved to trash and can be restored from Settings > Trash Bin.`}
                    confirmText="Delete"
                    cancelText="Cancel"
                    onConfirm={handleDelete}
                    variant="destructive"
                />
            )}
        </div>
    );
}
