import React, { useState, useEffect } from "react";
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
import { useUpdateInvoice, useDeleteInvoice } from "@/services/invoices";
import { toastBus } from "@/lib/toastBus";
import { useI18n } from "@/lib/i18n";
import { Invoice } from "@/services/invoices";
import { CompanySelect } from "@/components/selects/CompanySelect";

interface EditInvoiceDialogProps {
    invoice: Invoice;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInvoiceUpdated?: () => void;
}

export function EditInvoiceDialog({ invoice, open, onOpenChange, onInvoiceUpdated }: EditInvoiceDialogProps) {
    const { t } = useI18n();
    const updateInvoice = useUpdateInvoice();
    const deleteInvoice = useDeleteInvoice();

    // Form state
    const [number, setNumber] = useState(invoice.number || "");
    const [status, setStatus] = useState(invoice.status);
    const [currency, setCurrency] = useState(invoice.currency);
    const [issueDate, setIssueDate] = useState(invoice.issue_date ? invoice.issue_date.split('T')[0] : "");
    const [dueDate, setDueDate] = useState(invoice.due_date ? invoice.due_date.split('T')[0] : "");
    const [notes, setNotes] = useState(invoice.notes || "");
    const [companyId, setCompanyId] = useState(invoice.company_id || "");

    // Initialize form with invoice data
    useEffect(() => {
        if (invoice) {
            setNumber(invoice.number || "");
            setStatus(invoice.status);
            setCurrency(invoice.currency);
            setIssueDate(invoice.issue_date ? invoice.issue_date.split('T')[0] : "");
            setDueDate(invoice.due_date ? invoice.due_date.split('T')[0] : "");
            setNotes(invoice.notes || "");
            setCompanyId(invoice.company_id || "");
        }
    }, [invoice]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!issueDate || !dueDate || !companyId) {
            toastBus.emit({
                title: "Validation Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        try {
            await updateInvoice.mutateAsync({
                id: invoice.id,
                payload: {
                    number: number.trim() || undefined,
                    status,
                    currency,
                    issue_date: issueDate,
                    due_date: dueDate,
                    notes: notes.trim() || undefined,
                    company_id: companyId,
                }
            });

            toastBus.emit({
                title: "Invoice Updated",
                description: "Invoice has been updated successfully",
                variant: "success"
            });

            onOpenChange(false);
            onInvoiceUpdated?.();
        } catch (error) {
            console.error('Failed to update invoice:', error);
            toastBus.emit({
                title: "Error",
                description: "Failed to update invoice. Please try again.",
                variant: "destructive"
            });
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
            return;
        }

        try {
            await deleteInvoice.mutateAsync(invoice.id);

            toastBus.emit({
                title: "Invoice Deleted",
                description: "Invoice has been deleted successfully",
                variant: "success"
            });

            onOpenChange(false);
            onInvoiceUpdated?.();
        } catch (error) {
            console.error('Failed to delete invoice:', error);
            toastBus.emit({
                title: "Error",
                description: "Failed to delete invoice. Please try again.",
                variant: "destructive"
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <AccessibleDialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Edit Invoice</DialogTitle>
                    <DialogDescription>
                        Update invoice details and settings.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Invoice Number */}
                        <div>
                            <Label htmlFor="number">Invoice Number</Label>
                            <Input
                                id="number"
                                value={number}
                                onChange={(e) => setNumber(e.target.value)}
                                placeholder="Auto-generated if empty"
                            />
                        </div>

                        {/* Status */}
                        <div>
                            <Label htmlFor="status">Status</Label>
                            <Select value={status} onValueChange={(value: Invoice["status"]) => setStatus(value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="sent">Sent</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="overdue">Overdue</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Currency */}
                        <div>
                            <Label htmlFor="currency">Currency</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DKK">DKK</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="SEK">SEK</SelectItem>
                                    <SelectItem value="NOK">NOK</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Company */}
                        <div className="md:col-span-2">
                            <Label>Company *</Label>
                            <CompanySelect
                                value={companyId}
                                onChange={setCompanyId}
                            />
                        </div>

                        {/* Issue Date */}
                        <div>
                            <Label htmlFor="issueDate">Issue Date *</Label>
                            <Input
                                id="issueDate"
                                type="date"
                                value={issueDate}
                                onChange={(e) => setIssueDate(e.target.value)}
                                required
                            />
                        </div>

                        {/* Due Date */}
                        <div>
                            <Label htmlFor="dueDate">Due Date *</Label>
                            <Input
                                id="dueDate"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                required
                            />
                        </div>

                        {/* Notes */}
                        <div className="md:col-span-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Additional notes..."
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex justify-between">
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={updateInvoice.isPending || deleteInvoice.isPending}
                        >
                            {deleteInvoice.isPending ? "Deleting..." : "Delete Invoice"}
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={updateInvoice.isPending || deleteInvoice.isPending}
                            >
                                {updateInvoice.isPending ? "Updating..." : "Update Invoice"}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </AccessibleDialogContent>
        </Dialog>
    );
}
