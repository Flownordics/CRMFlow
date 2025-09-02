import { useParams, Link } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import {
    useOrder,
    useUpdateOrderHeader,
    useUpsertOrderLine,
    useDeleteOrderLine,
} from "@/services/orders";
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

import { getOrderPdfUrl } from "@/services/pdf";
import { logPdfGenerated } from "@/services/activity";
import { Plus, Trash2, FileText } from "lucide-react";
import { generateFriendlyNumber } from "@/lib/friendlyNumbers";

import { OpenPdfButton } from "@/components/common/OpenPdfButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function OrderEditor() {
    const { id = "" } = useParams();

    const { data: order, isLoading, error } = useOrder(id);
    const updateHeader = useUpdateOrderHeader(id);
    const upsertLine = useUpsertOrderLine(id);
    const deleteLine = useDeleteOrderLine(id);


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

    // Compute totals from lines
    const totals = useMemo(() => {
        if (!order?.lines || order.lines.length === 0) return { subtotal: 0, tax: 0, total: 0 };

        const subtotal = order.lines.reduce((acc, l) => {
            const { afterDiscMinor } = computeLineTotals({
                qty: l.qty,
                unitMinor: l.unitMinor,
                discountPct: l.discountPct,
                taxRatePct: l.taxRatePct,
            });
            return acc + afterDiscMinor;
        }, 0);

        const tax = order.lines.reduce((acc, l) => {
            const { taxMinor } = computeLineTotals({
                qty: l.qty,
                unitMinor: l.unitMinor,
                discountPct: l.discountPct,
                taxRatePct: l.taxRatePct,
            });
            return acc + taxMinor;
        }, 0);

        const total = subtotal + tax;

        return { subtotal, tax, total };
    }, [order?.lines]);

    // Handle header field changes
    const handleHeaderChange = (field: string, value: string) => {
        if (!order) return;

        const patch: any = { [field]: value };
        updateHeader.mutate(patch);
    };

    // Handle line item changes
    const handleLineChange = (lineId: string, patch: any) => {
        // Calculate line total if qty, unitMinor, taxRatePct, or discountPct changed
        if (patch.qty !== undefined || patch.unitMinor !== undefined || patch.taxRatePct !== undefined || patch.discountPct !== undefined) {
            const line = order?.lines.find(l => l.id === lineId);
            if (line) {
                const { totalMinor } = computeLineTotals({
                    qty: patch.qty !== undefined ? patch.qty : line.qty,
                    unitMinor: patch.unitMinor !== undefined ? patch.unitMinor : line.unitMinor,
                    discountPct: patch.discountPct !== undefined ? patch.discountPct : line.discountPct,
                    taxRatePct: patch.taxRatePct !== undefined ? patch.taxRatePct : line.taxRatePct,
                });
                patch.lineTotalMinor = totalMinor;
            }
        }
        upsertLine.mutate({ id: lineId, ...patch });
    };

    // Handle line item deletion
    const handleLineDelete = (lineId: string) => {
        deleteLine.mutate(lineId);
    };

    // Handle add new line
    const handleAddLine = () => {
        const { totalMinor } = computeLineTotals({
            qty: 1,
            unitMinor: 0,
            taxRatePct: 25,
            discountPct: 0,
        });

        upsertLine.mutate({
            description: "",
            qty: 1,
            unitMinor: 0,
            taxRatePct: 25,
            discountPct: 0,
            lineTotalMinor: totalMinor,
        });
    };

    // Handle PDF generation
    const handlePdfGenerated = async () => {
        try {
            await logPdfGenerated("order", order!.id);
        } catch (error) {
            console.warn("Failed to log PDF generation:", error);
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
            console.warn("Failed to convert order to invoice:", error);
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
                subtitle={order.company_id ? `Company: ${order.company_id}` : ""}
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
                                    console.error("Failed to create invoice:", error);
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
                            className="text-blue-600 hover:text-blue-800 underline"
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
                    <DataTable
                        data={order.lines || []}
                        columns={[
                            {
                                header: "Description",
                                cell: (line: any) => (
                                    <Input
                                        value={line.description || ""}
                                        onChange={(e) =>
                                            handleLineChange(line.id, { description: e.target.value })
                                        }
                                        placeholder="Enter description"
                                    />
                                ),
                            },
                            {
                                header: "Qty",
                                cell: (line: any) => (
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={line.qty || 0}
                                        onChange={(e) =>
                                            handleLineChange(line.id, { qty: parseFloat(e.target.value) || 0 })
                                        }
                                    />
                                ),
                            },
                            {
                                header: "Unit Price",
                                cell: (line: any) => (
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={line.unitMinor || 0}
                                        onChange={(e) =>
                                            handleLineChange(line.id, { unitMinor: parseFloat(e.target.value) || 0 })
                                        }
                                    />
                                ),
                            },
                            {
                                header: "Tax %",
                                cell: (line: any) => (
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={line.taxRatePct || 0}
                                        onChange={(e) =>
                                            handleLineChange(line.id, { taxRatePct: parseFloat(e.target.value) || 0 })
                                        }
                                    />
                                ),
                            },
                            {
                                header: "Discount %",
                                cell: (line: any) => (
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={line.discountPct || 0}
                                        onChange={(e) =>
                                            handleLineChange(line.id, { discountPct: parseFloat(e.target.value) || 0 })
                                        }
                                    />
                                ),
                            },
                            {
                                header: "Total",
                                cell: (line: any) => (
                                    <span className="font-medium">
                                        {formatMoneyMinor(line.lineTotalMinor || 0, currency)}
                                    </span>
                                ),
                            },
                            {
                                header: "Actions",
                                cell: (line: any) => (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Line Item</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to delete this line item? This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleLineDelete(line.id)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                ),
                            },
                        ]}
                    />
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
        </div>
    );
}
