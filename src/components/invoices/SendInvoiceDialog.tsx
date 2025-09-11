import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AccessibleDialogContent } from "@/components/ui/accessible-dialog";
import { sendInvoiceEmail } from "@/services/invoices";
import { useCompanies } from "@/services/companies";
import { usePeople } from "@/services/people";
import { toastBus } from "@/lib/toastBus";
import { useI18n } from "@/lib/i18n";
import { Invoice } from "@/services/invoices";
import { Mail, AlertCircle, CheckCircle } from "lucide-react";

interface SendInvoiceDialogProps {
    invoice: Invoice;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInvoiceSent?: () => void;
}

export function SendInvoiceDialog({ invoice, open, onOpenChange, onInvoiceSent }: SendInvoiceDialogProps) {
    const { t } = useI18n();
    const [to, setTo] = useState("");
    const [subject, setSubject] = useState(`Invoice ${invoice.number || invoice.id}`);
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch company and person data for email pre-filling
    const { data: companies } = useCompanies();
    const { data: people } = usePeople();

    // Pre-fill email fields when invoice data is available
    useEffect(() => {
        if (invoice && open) {
            // Try to find company email (prefer invoiceEmail over email)
            let companyEmail = "";
            if (invoice.company_id && companies?.data) {
                const company = companies.data.find((c: any) => c.id === invoice.company_id);
                companyEmail = company?.invoiceEmail || company?.email || "";
            }

            // Try to find contact email
            let contactEmail = "";
            if (invoice.contact_id && people?.data) {
                const contact = people.data.find((p: any) => p.id === invoice.contact_id);
                contactEmail = contact?.email || "";
            }

            // Pre-fill 'to' field (prefer contact email, fallback to company email)
            setTo(contactEmail || companyEmail || "");

            // Pre-fill subject
            setSubject(`Invoice ${invoice.number || invoice.id}`);

            // Pre-fill message
            setMessage(`Dear Customer,

Please find attached your invoice ${invoice.number || invoice.id}.

Thank you for your business!

Best regards`);
        }
    }, [invoice, open, companies, people]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!to.trim()) {
            setError("Please enter a recipient email address");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await sendInvoiceEmail({
                invoiceId: invoice.id,
                to: to.trim(),
                subject: subject.trim(),
                message: message.trim()
            });

            if (result.success) {
                toastBus.emit({
                    title: "Invoice Sent",
                    description: `Invoice has been sent to ${to.trim()}`,
                    variant: "success"
                });

                onOpenChange(false);
                onInvoiceSent?.();
            } else {
                // Handle error from service
                setError(result.error || 'Failed to send email');
            }
        } catch (error: any) {
            console.error('Failed to send invoice email:', error);

            if (error.name === 'EmailNotConnectedError') {
                setError('EMAIL_NOT_CONNECTED');
            } else {
                setError(error.message || 'Failed to send email');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            setTo("");
            setSubject(`Invoice ${invoice.number || invoice.id}`);
            setMessage("");
            setError(null);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <AccessibleDialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Send Invoice
                    </DialogTitle>
                    <DialogDescription>
                        Send invoice {invoice.number || invoice.id} via email
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Recipient Email */}
                    <div>
                        <Label htmlFor="to">To *</Label>
                        <Input
                            id="to"
                            type="email"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            placeholder="recipient@example.com"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {/* Subject */}
                    <div>
                        <Label htmlFor="subject">Subject *</Label>
                        <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {/* Message */}
                    <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Add a personal message to the invoice..."
                            rows={4}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <div className="flex-1">
                                {error === 'EMAIL_NOT_CONNECTED' ? (
                                    <div>
                                        <p className="text-sm font-medium text-destructive">Gmail not connected</p>
                                        <p className="text-xs text-destructive/80">
                                            Please connect your Gmail account in Settings to send emails.
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm font-medium text-destructive">We couldn't send the email</p>
                                        <p className="text-xs text-destructive/80">{error}</p>
                                        <p className="text-xs text-destructive/60 mt-1">
                                            Check browser console for more details.
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        console.log('Invoice Email Error Details:', {
                                            error,
                                            invoice: invoice.id,
                                            to: to.trim(),
                                            subject: subject.trim()
                                        });
                                    }}
                                >
                                    Log Details
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setError(null)}
                                >
                                    Dismiss
                                </Button>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !to.trim()}
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Invoice
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </AccessibleDialogContent>
        </Dialog>
    );
}
