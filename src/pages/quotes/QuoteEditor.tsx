import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  useQuote,
  useUpdateQuoteHeader,
  useUpsertQuoteLine,
  useDeleteQuoteLine,
  useDeleteQuote,
} from "@/services/quotes";
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
import { StatusBadge } from "@/components/ui/status-badge";
import { getQuotePdfUrl } from "@/services/pdf";
import { logPdfGenerated } from "@/services/activity";
import { Plus, Mail, Trash2, Save, AlertTriangle, ShoppingCart, Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { SendQuoteDialog } from "@/components/quotes/SendQuoteDialog";
import { EmailLogs } from "@/components/quotes/EmailLogs";
import { OpenPdfButton } from "@/components/common/OpenPdfButton";
// Google integration removed - starting fresh
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from '@/lib/logger';
import { toastBus } from '@/lib/toastBus';
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { RelatedTasksList } from "@/components/tasks/RelatedTasksList";
import { useProjectFromDeal } from "@/services/projects";
import { FolderKanban } from "lucide-react";
import { LineItemsTable } from "@/components/lines/LineItemsTable";
import { useConvertQuoteToOrder } from "@/services/conversions";
import { CreateEventDialog } from "@/components/calendar/CreateEventDialog";
import { SectionErrorBoundary } from "@/components/fallbacks/SectionErrorBoundary";
import { useLineItems } from "@/hooks/useLineItems";
import { useCompanyLookup } from "@/hooks/useCompanyLookup";

export default function QuoteEditor() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: quote, isLoading, error } = useQuote(id);
  const updateHeader = useUpdateQuoteHeader(id);
  const upsertLine = useUpsertQuoteLine(id);
  const deleteLine = useDeleteQuoteLine(id);
  const deleteQuote = useDeleteQuote();
  const { t } = useI18n();
  const { data: project } = useProjectFromDeal(quote?.deal_id);
  const { getCompanyName } = useCompanyLookup();
  // Google integration removed - starting fresh

  const [creating, setCreating] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [scheduleMeetingDialogOpen, setScheduleMeetingDialogOpen] = useState(false);
  const [pendingHeaderChanges, setPendingHeaderChanges] = useState(false);
  const convertToOrder = useConvertQuoteToOrder();

  // Use the new line items hook
  const lineItems = useLineItems({
    initialLines: quote?.lines || [],
    onPatch: async (lineId, patch) => {
      // Check if this is a real line (not a temp one)
      const isRealLine = quote?.lines?.some((l) => l.id === lineId) ?? false;
      if (isRealLine) {
        await upsertLine.mutateAsync({ id: lineId, ...patch });
      }
    },
    onDelete: async (lineId) => {
      const isRealLine = quote?.lines?.some((l) => l.id === lineId) ?? false;
      if (isRealLine) {
        await deleteLine.mutateAsync(lineId);
      }
    },
  });

  // Sync lines when quote changes
  useEffect(() => {
    if (quote?.lines) {
      lineItems.setLines(quote.lines);
    }
  }, [quote?.lines, quote?.id]);

  // Track original quote data for comparison
  const originalQuoteRef = useRef(quote);

  // Update original quote ref when quote changes
  useEffect(() => {
    if (quote) {
      originalQuoteRef.current = quote;
      // Reset change tracking when quote data is refreshed
      setPendingHeaderChanges(false);
      lineItems.resetPendingChanges();
    }
  }, [quote?.id]);

  // Compute hasChanges from header and line changes
  const hasChanges = pendingHeaderChanges || lineItems.hasPendingChanges;

  // Handle beforeunload event for browser navigation (page refresh/close/tab close)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        // Modern browsers ignore custom messages, but we still need to set returnValue
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasChanges]);

  // Note: With BrowserRouter, we can't block internal navigation programmatically
  // The beforeunload handler will warn on browser navigation
  // For internal navigation, users should save changes before navigating

  // Use totals from the hook
  const totals = lineItems.totals;

  if (isLoading) return <div className="p-6">{t("loading_quote")}</div>;
  if (error || !quote)
    return (
      <div className="p-6 text-destructive" role="alert">
        {t("error_fetching_quote")}
      </div>
    );

  const onHeaderChange = (patch: any) => {
    updateHeader.mutate(patch, {
      onSuccess: () => {
        setPendingHeaderChanges(false);
      },
      onError: () => {
        // Keep pending state on error
      },
    });
    setPendingHeaderChanges(true);
  };

  const handleSaveQuote = async () => {
    try {
      // Force save any pending line changes
      // The hook already handles saving via onPatch, but we ensure all are saved
      for (const line of lineItems.lines) {
        // Check if this is a real line (not a temp one)
        const isRealLine = quote?.lines?.some((l) => l.id === line.id) ?? false;
        if (isRealLine) {
          await upsertLine.mutateAsync({
            id: line.id,
            description: line.description,
            qty: line.qty,
            unitMinor: line.unitMinor,
            taxRatePct: line.taxRatePct,
            discountPct: line.discountPct,
          });
        }
      }

      // Clear all pending changes
      setPendingHeaderChanges(false);
      lineItems.resetPendingChanges();

      toastBus.emit({
        title: "Quote saved",
        description: "All changes have been saved successfully.",
        variant: "success",
      });
    } catch (error) {
      logger.error("Failed to save quote:", error);
      toastBus.emit({
        title: "Save failed",
        description: "Could not save all changes. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteQuote = async () => {
    try {
      await deleteQuote.mutateAsync(id);
      toastBus.emit({
        title: "Quote Deleted",
        description: "Quote has been moved to trash.",
        variant: "success",
        action: {
          label: "Restore",
          onClick: () => {
            window.location.href = "/settings?tab=trash";
          }
        }
      });
      navigate("/quotes");
    } catch (error) {
      logger.error("Failed to delete quote:", error);
    }
  };

  const handleConvertToOrder = async () => {
    try {
      const result = await convertToOrder.mutateAsync(id);
      // Navigate to the created order
      navigate(`/orders/${result.id}`);
    } catch (error) {
      logger.error("Failed to convert quote to order:", error);
      // Error toast is already handled by the hook
    }
  };

  const addEmptyLine = async () => {
    setCreating(true);
    try {
      const tempId = lineItems.addLine({
        description: t("description"),
        qty: 1,
        unitMinor: 0,
        taxRatePct: 25,
        discountPct: 0,
      });

      // Save to server to get real ID
      try {
        const result = await upsertLine.mutateAsync({
          description: t("description"),
          qty: 1,
          unitMinor: 0,
          taxRatePct: 25,
          discountPct: 0,
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
    } finally {
      setCreating(false);
    }
  };



  return (
    <div className="space-y-6 p-6">
      {hasChanges && (
        <div className="rounded-lg border border-[#e8dac8] bg-[#faf5ef] p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#9d855e]" />
            <span className="text-sm text-[#7d6a4a]">
              You have unsaved changes. Click "Save" to save your changes.
            </span>
          </div>
        </div>
      )}
      {quote.status === "accepted" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Quote Accepted</p>
                <p className="text-sm text-green-700">
                  This quote has been accepted. Convert it to an order to proceed.
                </p>
              </div>
            </div>
            <Button
              variant="default"
              onClick={() => setConvertDialogOpen(true)}
              disabled={convertToOrder.isPending}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <ShoppingCart className="h-4 w-4" />
              {convertToOrder.isPending ? "Converting..." : "Convert to Order"}
            </Button>
          </div>
        </div>
      )}
      <PageHeader
        showBreadcrumbs={true}
        title={`Quote ${quote.number ?? ""}`}
        subtitle={quote.company_id ? `Company: ${getCompanyName(quote.company_id)}` : ""}
        actions={
          <div className="flex items-center gap-2">
            {quote.deal_id && project && (
              <Button
                variant="outline"
                onClick={() => navigate(`/projects/${project.id}`)}
                className="flex items-center gap-2"
              >
                <FolderKanban className="h-4 w-4" />
                View Project
              </Button>
            )}
            <StatusBadge
              intent={
                quote.status === "draft"
                  ? "draft"
                  : quote.status === "sent"
                    ? "active"
                    : quote.status === "accepted"
                      ? "active"
                      : quote.status === "declined"
                        ? "closed"
                        : "closed"
              }
            >
              {quote.status}
            </StatusBadge>
            {quote.status === "accepted" && (
              <Button
                variant="default"
                onClick={() => setConvertDialogOpen(true)}
                disabled={convertToOrder.isPending}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <ShoppingCart className="h-4 w-4" />
                {convertToOrder.isPending ? "Converting..." : "Convert to Order"}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleSaveQuote}
              disabled={!hasChanges}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
            <OpenPdfButton
              onGetUrl={() => getQuotePdfUrl(quote.id)}
              onLogged={(url) => logPdfGenerated("quote", quote.id, quote.deal_id || undefined, url)}
              label="Generate PDF"
            />
            <Button
              variant="outline"
              onClick={() => setScheduleMeetingDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Schedule Meeting
            </Button>
            <Button
              variant="default"
              onClick={() => setSendDialogOpen(true)}
              disabled={quote.status === "sent"}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Send
            </Button>
            <Button 
              variant="destructive" 
              className="flex items-center gap-2"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            {deleteDialogOpen && (
              <ConfirmationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title="Delete Quote"
                description="This quote will be moved to trash. You can restore it from Settings > Trash Bin."
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={handleDeleteQuote}
                variant="destructive"
              />
            )}
            {convertDialogOpen && (
              <ConfirmationDialog
                open={convertDialogOpen}
                onOpenChange={setConvertDialogOpen}
                title="Convert Quote to Order"
                description="This quote will be converted to an order. The quote will be removed after conversion. Continue?"
                confirmText="Convert to Order"
                cancelText="Cancel"
                onConfirm={handleConvertToOrder}
                variant="default"
              />
            )}
          </div>
        }
      />

      {/* Linked Deal information */}
      {quote.deal_id && (
        <div className="rounded-2xl border bg-muted/30 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Linked deal:{" "}
              <a
                className="underline hover:text-foreground"
                href={`/deals/${quote.deal_id}`}
              >
                {quote.deal_id}
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
            label={t("issue_date")}
            control={
              <Input
                type="date"
                defaultValue={quote.issue_date ?? ""}
                onBlur={(e) =>
                  onHeaderChange({ issue_date: e.target.value || null })
                }
              />
            }
          />
          <FormRow
            label={t("valid_until")}
            control={
              <Input
                type="date"
                defaultValue={quote.valid_until ?? ""}
                onBlur={(e) =>
                  onHeaderChange({ valid_until: e.target.value || null })
                }
              />
            }
          />
          <FormRow
            label={t("status")}
            control={
              <Select
                defaultValue={quote.status}
                onValueChange={(v) => onHeaderChange({ status: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t("draft")}</SelectItem>
                  <SelectItem value="sent">{t("sent")}</SelectItem>
                  <SelectItem value="accepted">{t("accepted")}</SelectItem>
                  <SelectItem value="declined">{t("declined")}</SelectItem>
                  <SelectItem value="expired">{t("expired")}</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          <FormRow
            label={t("notes")}
            control={
              <Textarea
                defaultValue={quote.notes ?? ""}
                onBlur={(e) =>
                  onHeaderChange({ notes: e.target.value || null })
                }
              />
            }
          />
        </div>
      </div>

      {/* Line Items */}
      <SectionErrorBoundary sectionName="Line Items">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Line Items</span>
              <Button onClick={addEmptyLine} disabled={creating}>
                <Plus
                  aria-hidden="true"
                  focusable="false"
                  className="mr-1 h-4 w-4"
                />
                {t("add_line")}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lineItems.lines.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {t("no_lines_yet")}
              </div>
            ) : (
              <LineItemsTable
                currency={quote.currency}
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
                  tax_pct: "VAT %",
                  line_total: "Total",
                }}
              />
            )}
          </CardContent>
        </Card>
      </SectionErrorBoundary>

      {/* Totals */}
      <div className="flex flex-col items-end gap-1">
        <div className="grid w-full grid-cols-2 gap-x-8 gap-y-1 text-sm sm:w-auto">
          <div className="text-muted-foreground">{t("subtotal")}</div>
          <div className="text-right">
            {formatMoneyMinor(totals.subtotal, quote.currency)}
          </div>
          <div className="text-muted-foreground">{t("tax")}</div>
          <div className="text-right">
            {formatMoneyMinor(totals.tax, quote.currency)}
          </div>
          <div className="font-semibold">{t("total")}</div>
          <div className="text-right font-semibold">
            {formatMoneyMinor(totals.total, quote.currency)}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Shown incl. tax on line totals
        </div>
      </div>

      {/* Email Activity */}
      <SectionErrorBoundary sectionName="Email Logs">
        <EmailLogs quoteId={id} />
      </SectionErrorBoundary>

      {/* Tasks Section */}
      <SectionErrorBoundary sectionName="Related Tasks">
        <RelatedTasksList
          relatedType="quote"
          relatedId={quote.id}
          relatedTitle={`Quote ${quote.number ?? ""}`}
        />
      </SectionErrorBoundary>

      <div className="text-sm">
        <Link to="/quotes" className="underline">
          {t("back_to_quotes")}
        </Link>
      </div>

      {/* Send Quote Dialog */}
      <SendQuoteDialog
        quoteId={id}
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        onQuoteSent={() => {
          // Quote status is already optimistically updated via useSendQuoteEmail
          // This callback can be used for additional UI updates if needed
        }}
      />

      {/* Schedule Meeting Dialog */}
      <CreateEventDialog
        open={scheduleMeetingDialogOpen}
        onOpenChange={setScheduleMeetingDialogOpen}
        onEventCreated={() => {
          toastBus.emit({
            title: "Meeting scheduled",
            description: "Follow-up meeting has been scheduled successfully",
            variant: "success",
          });
        }}
        defaultCompanyId={quote.company_id || undefined}
        defaultQuoteId={quote.id}
        defaultDealId={quote.deal_id || undefined}
        defaultTitle={`Follow-up: Quote ${quote.number ?? ""}`}
      />
    </div>
  );
}
