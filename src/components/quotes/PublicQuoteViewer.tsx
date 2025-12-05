import { useQuote } from "@/services/quotes";
import { useCompany } from "@/services/companies";
import { usePerson } from "@/services/people";
import { formatMoneyMinor } from "@/lib/money";
import { computeLineTotals } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { QuoteAcceptRejectForm } from "./QuoteAcceptRejectForm";
import { QuoteResponse } from "@/services/quoteResponses";
import { getQuotePdfUrl } from "@/services/pdf";
import { trackEvent } from "@/services/quoteTracking";
import { logger } from "@/lib/logger";
import { toastBus } from "@/lib/toastBus";
import { useMemo } from "react";

interface PublicQuoteViewerProps {
  quoteId: string;
  tokenId: string | null;
  existingResponse?: QuoteResponse;
}

export function PublicQuoteViewer({
  quoteId,
  tokenId,
  existingResponse,
}: PublicQuoteViewerProps) {
  const { data: quote, isLoading, error } = useQuote(quoteId);
  const { data: company } = useCompany(quote?.company_id || "");
  const { data: contact } = usePerson(quote?.contact_id || "");

  // Calculate totals
  const totals = useMemo(() => {
    if (!quote?.lines || quote.lines.length === 0) {
      return { subtotal: 0, tax: 0, total: 0 };
    }
    const subtotal = quote.lines.reduce((acc, l) => {
      const { afterDiscMinor } = computeLineTotals({
        qty: l.qty,
        unitMinor: l.unitMinor,
        discountPct: l.discountPct,
        taxRatePct: l.taxRatePct,
      });
      return acc + afterDiscMinor;
    }, 0);
    const tax = quote.lines.reduce((acc, l) => {
      const { taxMinor } = computeLineTotals({
        qty: l.qty,
        unitMinor: l.unitMinor,
        discountPct: l.discountPct,
        taxRatePct: l.taxRatePct,
      });
      return acc + taxMinor;
    }, 0);
    return { subtotal, tax, total: subtotal + tax };
  }, [quote?.lines]);

  const handleDownloadPdf = async () => {
    try {
      // Track download event
      await trackEvent({
        quoteId,
        tokenId: tokenId || null,
        eventType: "downloaded",
        metadata: { pdf_version: "1.0" },
      });

      // Get PDF URL and open in new tab
      const pdfUrl = await getQuotePdfUrl(quoteId);
      window.open(pdfUrl, "_blank");
    } catch (error) {
      logger.error("Failed to download PDF:", error);
      toastBus.emit({
        title: "Failed to download PDF",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading quote...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">
            Unable to load quote
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Please contact support if this problem persists.
          </p>
        </div>
      </div>
    );
  }

  const hasResponded = !!existingResponse;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Quote {quote.number || quoteId}</h1>
              <p className="text-muted-foreground mt-1">
                {quote.issue_date
                  ? new Date(quote.issue_date).toLocaleDateString("da-DK", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "No date"}
              </p>
            </div>
            <Badge
              variant={
                quote.status === "accepted"
                  ? "default"
                  : quote.status === "declined"
                    ? "destructive"
                    : "secondary"
              }
            >
              {quote.status}
            </Badge>
          </div>

          {/* Company & Contact Info */}
          <div className="grid gap-4 md:grid-cols-2 mt-6">
            <div>
              <h3 className="font-semibold mb-2">Bill To</h3>
              {company && (
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{company.name}</p>
                  {company.address && <p>{company.address}</p>}
                  {company.zip && company.city && (
                    <p>
                      {company.zip} {company.city}
                    </p>
                  )}
                  {company.country && <p>{company.country}</p>}
                </div>
              )}
            </div>
            {contact && (
              <div>
                <h3 className="font-semibold mb-2">Contact</h3>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">
                    {contact.first_name} {contact.last_name}
                  </p>
                  {contact.email && <p>{contact.email}</p>}
                  {contact.phone && <p>{contact.phone}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Valid Until */}
          {quote.valid_until && (
            <div className="mt-4 text-sm text-muted-foreground">
              Valid until:{" "}
              {new Date(quote.valid_until).toLocaleDateString("da-DK", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          )}
        </div>

        {/* Line Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            {quote.lines && quote.lines.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Description</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-right p-2">Unit Price</th>
                      <th className="text-right p-2">Discount</th>
                      <th className="text-right p-2">VAT</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.lines.map((line) => {
                      const { afterDiscMinor, taxMinor, totalMinor } =
                        computeLineTotals({
                          qty: line.qty,
                          unitMinor: line.unitMinor,
                          discountPct: line.discountPct,
                          taxRatePct: line.taxRatePct,
                        });
                      return (
                        <tr key={line.id} className="border-b">
                          <td className="p-2">{line.description}</td>
                          <td className="text-right p-2">{line.qty}</td>
                          <td className="text-right p-2">
                            {formatMoneyMinor(line.unitMinor, quote.currency)}
                          </td>
                          <td className="text-right p-2">
                            {line.discountPct > 0
                              ? `${line.discountPct}%`
                              : "-"}
                          </td>
                          <td className="text-right p-2">
                            {line.taxRatePct}%
                          </td>
                          <td className="text-right p-2 font-medium">
                            {formatMoneyMinor(totalMinor, quote.currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No line items
              </p>
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-full max-w-md">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatMoneyMinor(totals.subtotal, quote.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatMoneyMinor(totals.tax, quote.currency)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                <span>Total</span>
                <span>{formatMoneyMinor(totals.total, quote.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={handleDownloadPdf}
            variant="outline"
            size="lg"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>

          {hasResponded ? (
            <div className="flex items-center gap-2 text-sm">
              {existingResponse.response_type === "accepted" ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-600 font-medium">
                    Quote Accepted
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-600 font-medium">
                    Quote Rejected
                  </span>
                </>
              )}
              {existingResponse.comment && (
                <p className="text-muted-foreground mt-2">
                  {existingResponse.comment}
                </p>
              )}
            </div>
          ) : (
            <QuoteAcceptRejectForm
              quoteId={quoteId}
              tokenId={tokenId}
              quoteStatus={quote.status}
            />
          )}
        </div>
      </div>
    </div>
  );
}
