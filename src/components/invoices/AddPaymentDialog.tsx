import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AccessibleDialogContent } from "@/components/ui/accessible-dialog";
import { useAddPayment } from "@/services/invoices";
import { toastBus } from "@/lib/toastBus";
import { useI18n } from "@/lib/i18n";
import { formatMoneyMinor } from "@/lib/money";
import { Invoice } from "@/services/invoices";

interface AddPaymentDialogProps {
    invoice: Invoice;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPaymentAdded?: () => void;
}

export function AddPaymentDialog({ invoice, open, onOpenChange, onPaymentAdded }: AddPaymentDialogProps) {
    const { t } = useI18n();
    const addPayment = useAddPayment();

    // Form state
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState<'bank' | 'card' | 'cash' | 'other'>('bank');
    const [note, setNote] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || !date) {
            toastBus.emit({
                title: "Validation Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        try {
            const amountMinor = Math.round(parseFloat(amount) * 100); // Convert to minor units

            await addPayment.mutateAsync({
                invoiceId: invoice.id,
                payload: {
                    amountMinor,
                    date,
                    method,
                    note: note.trim() || undefined
                }
            });

            toastBus.emit({
                title: "Payment Added",
                description: `Payment of ${formatMoneyMinor(amountMinor)} has been recorded`,
                variant: "success"
            });

            // Reset form
            setAmount("");
            setDate(new Date().toISOString().split('T')[0]);
            setMethod('bank');
            setNote("");

            onOpenChange(false);
            onPaymentAdded?.();
        } catch (error) {
            console.error('Failed to add payment:', error);
            toastBus.emit({
                title: "Error",
                description: "Failed to add payment. Please try again.",
                variant: "destructive"
            });
        }
    };

    const remainingBalance = invoice.total_minor - invoice.paid_minor;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <AccessibleDialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Payment</DialogTitle>
                    <DialogDescription>
                        Record a payment for invoice {invoice.number || invoice.id}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Invoice Info */}
                    <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Amount:</span>
                            <span className="font-medium">{formatMoneyMinor(invoice.total_minor)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Already Paid:</span>
                            <span className="font-medium">{formatMoneyMinor(invoice.paid_minor)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium border-t pt-2">
                            <span>Remaining Balance:</span>
                            <span className={remainingBalance > 0 ? "text-destructive" : "text-success"}>
                                {formatMoneyMinor(remainingBalance)}
                            </span>
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <Label htmlFor="amount">Amount *</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={remainingBalance / 100}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Maximum: {formatMoneyMinor(remainingBalance)}
                        </p>
                    </div>

                    {/* Date */}
                    <div>
                        <Label htmlFor="date">Payment Date *</Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>

                    {/* Payment Method */}
                    <div>
                        <Label htmlFor="method">Payment Method</Label>
                        <Select value={method} onValueChange={(value: 'bank' | 'card' | 'cash' | 'other') => setMethod(value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bank">Bank Transfer</SelectItem>
                                <SelectItem value="card">Credit/Debit Card</SelectItem>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Note */}
                    <div>
                        <Label htmlFor="note">Note</Label>
                        <Textarea
                            id="note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Optional payment note..."
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={addPayment.isPending}
                        >
                            {addPayment.isPending ? "Adding Payment..." : "Add Payment"}
                        </Button>
                    </DialogFooter>
                </form>
            </AccessibleDialogContent>
        </Dialog>
    );
}
