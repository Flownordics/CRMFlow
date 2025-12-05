import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogContent } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useSendQuoteEmail } from "@/services/email";
import { useQuote } from "@/services/quotes";
import { useCompanies } from "@/services/companies";
import { usePeople } from "@/services/people";
import { getQuotePdfUrl } from "@/services/pdf";
import { logEmailSent } from "@/services/activity";
import { isGmailAvailable } from "@/services/email";
import { toastBus } from "@/lib/toastBus";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Send, CheckCircle, Download, Mail } from "lucide-react";
import { logger } from '@/lib/logger';
import { generateFriendlyNumber } from "@/lib/friendlyNumbers";

interface SendQuoteDialogProps {
    quoteId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onQuoteSent?: () => void;
}

export function SendQuoteDialog({ quoteId, open, onOpenChange, onQuoteSent }: SendQuoteDialogProps) {
    const navigate = useNavigate();
    const { t } = useI18n();
    const [to, setTo] = useState("");
    const [cc, setCc] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [attachPdf, setAttachPdf] = useState(false); // Default: use public link (not PDF attachment)
    const [error, setError] = useState<string | null>(null);
    const [idempotencyKey, setIdempotencyKey] = useState<string>("");
    const [publicLink, setPublicLink] = useState<string | null>(null);

    const { data: quote } = useQuote(quoteId);
    const { data: companies } = useCompanies();
    const { data: people } = usePeople();

    // Check Gmail integration status
    const { data: gmailAvailable } = useQuery({
        queryKey: ['gmail-available'],
        queryFn: isGmailAvailable,
        enabled: open,
    });

    const sendEmail = useSendQuoteEmail();

    // Pre-fill email fields when quote data is available
    useEffect(() => {
        if (quote && open) {
            // Try to find company email
            let companyEmail = "";
            if (quote.company_id && companies?.data) {
                const company = companies.data.find((c: any) => c.id === quote.company_id);
                companyEmail = company?.email || "";
            }

            // Try to find contact email
            let contactEmail = "";
            if (quote.contact_id && people?.data) {
                const contact = people.data.find((p: any) => p.id === quote.contact_id);
                contactEmail = contact?.email || "";
            }

            // Pre-fill 'to' field
            setTo(contactEmail || companyEmail || "");

            // Pre-fill subject
            setSubject(`Your quote ${quote.number || quoteId}`);

            // Pre-fill body
            setBody(`Dear Customer,

You can view your quote online by clicking the link in this email. You can also download it as PDF from the online view.

Best regards,
Your Sales Team`);
        }
    }, [quote, companies, people, open, quoteId]);

    // Reset error and generate idempotency key when dialog opens
    useEffect(() => {
        if (open) {
            setError(null);
            setIdempotencyKey(`send_quote_${crypto.randomUUID()}`);
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!to.trim()) {
            setError("Please enter a recipient email address");
            return;
        }

        setError(null);

        try {
            // Generate public link preview (will be generated in email service)
            // For now, we'll just send the email - the service will generate the token
            const result = await sendEmail.mutateAsync({
                quoteId,
                to: to.trim(),
                subject: subject.trim() || `Quote ${quote?.number || generateFriendlyNumber(quoteId, 'quote')}`,
                message: body.trim() || undefined,
                attachPdf: attachPdf, // Pass attachPdf flag
            });

            // Log activity if quote has a deal
            if (quote?.deal_id) {
                try {
                    await logEmailSent(quoteId, quote.deal_id, to.trim(), 'manual');
                } catch (activityError) {
                    logger.warn('Failed to log email activity:', activityError);
                }
            }

            // Close dialog on success
            onOpenChange(false);

            // Notify parent component
            onQuoteSent?.();

            // Reset form
            setTo("");
            setCc("");
            setSubject("");
            setBody("");
            setAttachPdf(true);
        } catch (error: any) {
            if (error.name === 'EmailNotConnectedError') {
                setError('EMAIL_NOT_CONNECTED');
            } else {
                // Extract detailed error message
                let errorMessage = error.message || 'Failed to send email';
                
                // Include Google OAuth error details if available
                const googleError = error.details?.googleError || error.errorData?.details?.googleError;
                if (googleError) {
                    if (googleError.error === 'invalid_grant') {
                        errorMessage = 'Gmail refresh token is invalid or expired. Please reconnect your Gmail account in Settings > Integrations.';
                    } else if (googleError.error_description) {
                        errorMessage = `${errorMessage}: ${googleError.error_description}`;
                    } else if (googleError.error) {
                        errorMessage = `${errorMessage}: ${googleError.error}`;
                    }
                }
                
                // Check if requires reconnect
                if (error.errorData?.requiresReconnect || googleError?.error === 'invalid_grant') {
                    errorMessage = 'Gmail refresh token is invalid. Please reconnect your Gmail account in Settings > Integrations.';
                }
                
                logger.error('Send quote error details:', {
                    error: error.message,
                    details: error.details,
                    errorData: error.errorData
                });
                
                setError(errorMessage);
            }
        }
    };

    const handleDownloadPdf = async () => {
        try {
            const pdfUrl = await getQuotePdfUrl(quoteId);
            window.open(pdfUrl, '_blank');
        } catch (error) {
            toastBus.emit({
                title: "Failed to download PDF",
                description: "Please try again",
                variant: "destructive"
            });
        }
    };


    // Google integration removed - starting fresh

    // Google integration removed - starting fresh

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]" data-testid="send-quote-dialog">
                <DialogHeader>
                    <DialogTitle>Send tilbud</DialogTitle>
                    <DialogDescription>
                        Send tilbuddet til kunden. Du kan downloade PDF og sende manuelt.
                    </DialogDescription>
                </DialogHeader>

                {/* Google integration removed - starting fresh */}

                {/* Error Alert */}
                {error && (
                    <Alert className="mb-4 border-destructive/50 bg-destructive/10">
                        <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
                        <AlertDescription className="text-destructive">
                            {error === 'EMAIL_NOT_CONNECTED' ? (
                                <div className="flex items-center justify-between">
                                    <span>Email service not available. Please download PDF and send manually.</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <span>We couldn't send the email: {error}</span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setError(null);
                                                handleSubmit(new Event('submit') as any);
                                            }}
                                        >
                                            Try again
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`Idempotency Key: ${idempotencyKey}`);
                                                toastBus.emit({
                                                    title: "Debug info copied",
                                                    description: "Idempotency key copied to clipboard",
                                                    variant: "success"
                                                });
                                            }}
                                        >
                                            Copy debug
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Gmail Integration Status */}
                {gmailAvailable === false && (
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            <div className="flex items-center justify-between">
                                <span>Gmail integration not connected</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate('/settings?tab=integrations')}
                                >
                                    Connect Gmail
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" aria-busy={sendEmail.isPending} role="status">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="to">To *</Label>
                            <Input
                                id="to"
                                type="email"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                placeholder="customer@example.com"
                                required
                                disabled={sendEmail.isPending}
                                data-testid="email-to"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cc">CC (comma-separated)</Label>
                            <Input
                                id="cc"
                                type="text"
                                value={cc}
                                onChange={(e) => setCc(e.target.value)}
                                placeholder="colleague@company.com, manager@company.com"
                                disabled={sendEmail.isPending}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input
                                id="subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Your quote subject"
                                disabled={sendEmail.isPending}
                                data-testid="email-subject"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="body">Message</Label>
                            <Textarea
                                id="body"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Your message to the customer"
                                rows={6}
                                disabled={sendEmail.isPending}
                                data-testid="email-body"
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="attachPdf"
                                checked={attachPdf}
                                onCheckedChange={(checked) => setAttachPdf(checked as boolean)}
                                disabled={sendEmail.isPending}
                            />
                            <Label htmlFor="attachPdf">
                                Attach PDF (legacy mode - not recommended)
                            </Label>
                            <p className="text-xs text-muted-foreground ml-2">
                                By default, quote will be sent with a secure online link. Check this to attach PDF instead.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleDownloadPdf}
                            disabled={sendEmail.isPending}
                            className="flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" aria-hidden="true" />
                            Download PDF
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={sendEmail.isPending}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            disabled={sendEmail.isPending || !to.trim()}
                            className="flex items-center gap-2"
                        >
                            {sendEmail.isPending ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" aria-hidden="true" data-testid="send-icon" />
                                    Send Quote
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
