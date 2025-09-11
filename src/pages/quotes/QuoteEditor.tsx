import { useParams, Link, useNavigate } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import {
  useQuote,
  useUpdateQuoteHeader,
  useUpsertQuoteLine,
  useDeleteQuoteLine,
  useDeleteQuote,
} from "@/services/quotes";
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
import { getQuotePdfUrl } from "@/services/pdf";
import { logPdfGenerated } from "@/services/activity";
import { Plus, Mail, Trash2, Save, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { SendQuoteDialog } from "@/components/quotes/SendQuoteDialog";
import { EmailLogs } from "@/components/quotes/EmailLogs";
import { OpenPdfButton } from "@/components/common/OpenPdfButton";
// Google integration removed - starting fresh
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

export default function QuoteEditor() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: quote, isLoading, error } = useQuote(id);
  const updateHeader = useUpdateQuoteHeader(id);
  const upsertLine = useUpsertQuoteLine(id);
  const deleteLine = useDeleteQuoteLine(id);
  const deleteQuote = useDeleteQuote();
  const { t } = useI18n();
  // Google integration removed - starting fresh

  const [creating, setCreating] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentLines, setCurrentLines] = useState(quote?.lines || []);
  const [hasChanges, setHasChanges] = useState(false);

  // Update currentLines when quote changes
  useEffect(() => {
    if (quote?.lines) {
      setCurrentLines(quote.lines);
    }
  }, [quote?.lines]);

  const totals = useMemo(() => {
    if (!currentLines.length) return { subtotal: 0, tax: 0, total: 0 };
    const subtotal = currentLines.reduce((acc, l) => {
      const { afterDiscMinor } = computeLineTotals({
        qty: l.qty,
        unitMinor: l.unitMinor,
        discountPct: l.discountPct,
        taxRatePct: l.taxRatePct,
      });
      return acc + afterDiscMinor;
    }, 0);
    const tax = currentLines.reduce((acc, l) => {
      const { taxMinor } = computeLineTotals({
        qty: l.qty,
        unitMinor: l.unitMinor,
        discountPct: l.discountPct,
        taxRatePct: l.taxRatePct,
      });
      return acc + taxMinor;
    }, 0);
    return { subtotal, tax, total: subtotal + tax };
  }, [currentLines]);

  if (isLoading) return <div className="p-6">{t("loading_quote")}</div>;
  if (error || !quote)
    return (
      <div className="p-6 text-destructive" role="alert">
        {t("error_fetching_quote")}
      </div>
    );

  const onHeaderChange = (patch: any) => {
    updateHeader.mutate(patch);
    setHasChanges(true);
  };

  const handleSaveQuote = async () => {
    try {
      // Line items are already saved automatically on blur
      // Just mark as no changes
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save quote:", error);
    }
  };

  const handleDeleteQuote = async () => {
    try {
      await deleteQuote.mutateAsync(id);
      navigate("/quotes");
    } catch (error) {
      console.error("Failed to delete quote:", error);
    }
  };

  const addEmptyLine = async () => {
    setCreating(true);
    try {
      const newLine = {
        id: `temp_${Date.now()}_${Math.random()}`,
        description: t("description"),
        qty: 1,
        unitMinor: 0,
        taxRatePct: 25,
        discountPct: 0,
        lineTotalMinor: 0,
      };

      // Add to current lines immediately for UI responsiveness
      setCurrentLines(prev => [...prev, newLine]);
      setHasChanges(true);

      const result = await upsertLine.mutateAsync({
        description: t("description"),
        qty: 1,
        unitMinor: 0,
        taxRatePct: 25,
        discountPct: 0,
      });

      // Update with the real ID from the server
      if (result) {
        setCurrentLines(prev => prev.map(line =>
          line.id === newLine.id ? { ...line, id: result.id } : line
        ));
      }
    } finally {
      setCreating(false);
    }
  };

  const updateCurrentLine = (lineId: string, updates: Partial<any>) => {
    setCurrentLines(prev => prev.map(line =>
      line.id === lineId ? { ...line, ...updates } : line
    ));
    setHasChanges(true);
  };

  const isRealLine = (lineId: string) => {
    // Check if the line exists in the original quote data
    return quote?.lines?.some(line => line.id === lineId) ?? false;
  };

  const saveLineToServer = (lineId: string, updates: any) => {
    if (isRealLine(lineId)) {
      upsertLine.mutate({ id: lineId, ...updates });
      // Mark as saved after successful server call
      setHasChanges(false);
    }
  };



  return (
    <div className="space-y-6 p-6">
      {hasChanges && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              You have unsaved changes. Click "Save" to save your changes.
            </span>
          </div>
        </div>
      )}
      <PageHeader
        title={`Quote ${quote.number ?? ""}`}
        actions={
          <div className="flex items-center gap-2">
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
              variant="default"
              onClick={() => setSendDialogOpen(true)}
              disabled={quote.status === "sent"}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Send
            </Button>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Quote</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this quote? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteQuote}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
          {currentLines.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {t("no_lines_yet")}
            </div>
          ) : (
            <div className="space-y-3">
              {currentLines.map((line, index) => {
                const { totalMinor } = computeLineTotals({
                  qty: line.qty,
                  unitMinor: line.unitMinor,
                  discountPct: line.discountPct,
                  taxRatePct: line.taxRatePct,
                });

                return (
                  <div key={line.id} className="grid grid-cols-[auto_80px_120px_80px_80px_80px_auto] md:grid-cols-[auto_100px_140px_100px_100px_100px_auto] gap-2 items-center p-3 border rounded-lg">
                    <Input
                      defaultValue={line.description}
                      placeholder="Description"
                      className="col-span-1"
                      onChange={(e) => updateCurrentLine(line.id, { description: e.target.value })}
                      onBlur={(e) =>
                        saveLineToServer(line.id, { description: e.target.value })
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={line.qty}
                      placeholder="Qty"
                      className="col-span-1"
                      onChange={(e) => updateCurrentLine(line.id, { qty: Number(e.target.value) })}
                      onBlur={(e) =>
                        saveLineToServer(line.id, { qty: Number(e.target.value) })
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={line.unitMinor / 100}
                      placeholder="Unit"
                      className="col-span-1"
                      onChange={(e) => updateCurrentLine(line.id, { unitMinor: Math.round(Number(e.target.value || 0) * 100) })}
                      onBlur={(e) =>
                        saveLineToServer(line.id, {
                          unitMinor: Math.round(Number(e.target.value || 0) * 100)
                        })
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      defaultValue={line.taxRatePct ?? 25}
                      placeholder="VAT %"
                      className="col-span-1"
                      onChange={(e) => updateCurrentLine(line.id, { taxRatePct: Number(e.target.value || 0) })}
                      onBlur={(e) =>
                        saveLineToServer(line.id, { taxRatePct: Number(e.target.value || 0) })
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      defaultValue={line.discountPct ?? 0}
                      placeholder="Discount %"
                      className="col-span-1"
                      onChange={(e) => updateCurrentLine(line.id, { discountPct: Number(e.target.value || 0) })}
                      onBlur={(e) =>
                        saveLineToServer(line.id, { discountPct: Number(e.target.value || 0) })
                      }
                    />
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium min-w-[80px] text-right">
                        {formatMoneyMinor(totalMinor, quote.currency)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete line"
                        onClick={() => {
                          setCurrentLines(prev => prev.filter(l => l.id !== line.id));
                          setHasChanges(true);
                          if (isRealLine(line.id)) {
                            deleteLine.mutate(line.id);
                          }
                        }}
                      >
                        <Trash2
                          aria-hidden="true"
                          focusable="false"
                          className="h-4 w-4"
                        />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
      <EmailLogs quoteId={id} />

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
      />
    </div>
  );
}
