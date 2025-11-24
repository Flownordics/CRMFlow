import { useParams, Link, useNavigate } from "react-router-dom";
import { useDeal, useUpdateDeal, syncDealToOwnerCalendar, removeDealFromOwnerCalendar } from "@/services/deals";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/DataTable";
import { LineItemsTable } from "@/components/lines/LineItemsTable";
import { createQuoteFromDeal, createOrderFromDeal, createInvoiceFromDeal } from "@/services/conversions";
import { useState, useEffect } from "react";
import { toastBus } from "@/lib/toastBus";
import { logActivity } from "@/services/activity";
import { DealActivityList } from "@/components/deals/DealActivityList";
import { formatMoneyMinor } from "@/lib/money";
import { format } from "date-fns";
import { useI18n } from "@/lib/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { useCompanies } from "@/services/companies";
import { logger } from '@/lib/logger';
import { DealAccountingSummary } from "@/components/deals/DealAccountingSummary";
import { RelatedTasksList } from "@/components/tasks/RelatedTasksList";
import { useProjectFromDeal } from "@/services/projects";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { FolderKanban, FileText, ShoppingCart } from "lucide-react";
import { useQuotes } from "@/services/quotes";
import { useOrders } from "@/services/orders";

export default function DealDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { t } = useI18n();
  const { data: deal, isLoading, error } = useDeal(id);
  const { data: company } = useCompanies({ q: deal?.company_id });
  const updateDeal = useUpdateDeal(id);
  const [busy, setBusy] = useState<null | "quote" | "order" | "invoice">(null);
  const [closeDate, setCloseDate] = useState<Date | null>(deal?.close_date ? new Date(deal.close_date) : null);
  const { data: project, isLoading: isLoadingProject } = useProjectFromDeal(deal?.id);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  
  // Check if deal already has a quote or order
  const { data: quotesData } = useQuotes({ dealId: deal?.id });
  const { data: ordersData } = useOrders({ dealId: deal?.id });
  const existingQuote = quotesData?.data?.[0];
  const existingOrder = ordersData?.data?.[0];

  // Update local state when deal data changes
  useEffect(() => {
    if (deal?.close_date) {
      setCloseDate(new Date(deal.close_date));
    } else {
      setCloseDate(null);
    }
  }, [deal?.close_date]);

  // Handle close date change
  const handleCloseDateChange = async (newDate: Date | null) => {
    if (!deal) return;

    try {
      setCloseDate(newDate);

      // Update deal in database
      await updateDeal.mutateAsync({
        close_date: newDate?.toISOString().split('T')[0] ?? null
      });

      // Sync to calendar if there's a close date and owner
      if (newDate && deal.owner_user_id) {
        try {
          const companyName = company?.data?.[0]?.name;
          await syncDealToOwnerCalendar(deal, companyName);
          toastBus.emit({
            title: "Calendar synced",
            description: "Deal close date has been updated"
          });
        } catch (calendarError) {
          logger.error("Failed to sync to calendar:", calendarError);
          toastBus.emit({
            title: "Calendar sync failed",
            description: "Failed to update deal in calendar. Please check your settings.",
            variant: "destructive"
          });
        }
      } else if (!newDate && deal.owner_user_id) {
        // Remove from calendar if close date is cleared
        try {
          await removeDealFromOwnerCalendar(deal.id, deal.owner_user_id);
          toastBus.emit({
            title: "Calendar updated",
            description: "Deal has been removed from calendar"
          });
        } catch (calendarError) {
          logger.error("Failed to remove from calendar:", calendarError);
        }
      }

      toastBus.emit({
        title: "Deal updated",
        description: "Close date has been updated successfully"
      });
    } catch (error) {
      logger.error("Failed to update deal:", error);
      toastBus.emit({
        title: "Update failed",
        description: "Failed to update deal close date",
        variant: "destructive"
      });
      // Revert local state on error
      setCloseDate(deal.close_date ? new Date(deal.close_date) : null);
    }
  };

  if (isLoading) return <div className="p-6">Indlæser deal…</div>;
  if (error || !deal)
    return (
      <div className="p-6 text-destructive" role="alert">
        Kunne ikke hente deal
      </div>
    );

  async function handleCreate(type: "quote" | "order" | "invoice") {
    if (!deal) return;

    try {
      setBusy(type);
      if (type === "quote") {
        const { id: quoteId } = await createQuoteFromDeal(deal.id);
        toastBus.emit({ title: "Quote created", description: "Opening editor…" });
        await logActivity({ dealId: deal.id, type: "doc_created", meta: { docType: "quote", quoteId } });
        nav(`/quotes/${quoteId}`);
      } else if (type === "order") {
        const { id: orderId } = await createOrderFromDeal(deal.id);
        toastBus.emit({ title: "Order created", description: "Opening editor…" });
        await logActivity({ dealId: deal.id, type: "doc_created", meta: { docType: "order", orderId } });
        nav(`/orders/${orderId}`);
      } else {
        const { id: invoiceId } = await createInvoiceFromDeal(deal.id);
        toastBus.emit({ title: "Invoice created", description: "Opening editor…" });
        await logActivity({ dealId: deal.id, type: "doc_created", meta: { docType: "invoice", invoiceId } });
        nav(`/invoices/${invoiceId}`);
      }
    } catch (error) {
      logger.error(`Failed to create ${type}:`, error);
      toastBus.emit({
        title: `Failed to create ${type}`,
        description: error instanceof Error ? error.message : `Failed to create ${type}`,
        variant: "destructive"
      });
    } finally {
      setBusy(null);
    }
  }

  // Simple CTA-regler (MVP) – vis hvilke næste steps, baseret på stage-navn
  // Only show "Create Quote" if no quote exists yet
  const showQuote = (!existingQuote && (/proposal|offer|tilbud/i.test(deal.stage_id ?? "") || true));
  // Only show "Create Order" if no order exists yet
  const showOrder = (!existingOrder && /won|accepted|vundet/i.test(deal.stage_id ?? ""));
  const showInvoice = /fulfilled|delivered|leveret|won/i.test(deal.stage_id ?? "");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1">{deal.title}</h1>
        <div className="flex gap-2">
          {deal && !isLoadingProject && (
            project ? (
              <Button variant="outline" onClick={() => nav(`/projects/${project.id}`)}>
                <FolderKanban className="h-4 w-4 mr-2" />
                View Project
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setCreateProjectDialogOpen(true)}>
                <FolderKanban className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            )
          )}
          {existingQuote ? (
            <Button variant="outline" onClick={() => nav(`/quotes/${existingQuote.id}`)}>
              <FileText className="h-4 w-4 mr-2" />
              View Quote
            </Button>
          ) : showQuote && (
            <Button onClick={() => handleCreate("quote")} disabled={!!busy}>
              {busy === "quote" ? "Opretter…" : "Create Quote"}
            </Button>
          )}
          {existingOrder ? (
            <Button variant="outline" onClick={() => nav(`/orders/${existingOrder.id}`)}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              View Order
            </Button>
          ) : showOrder && (
            <Button variant="outline" onClick={() => handleCreate("order")} disabled={!!busy}>
              {busy === "order" ? "Opretter…" : "Create Order"}
            </Button>
          )}
          {showInvoice && (
            <Button variant="outline" onClick={() => handleCreate("invoice")} disabled={!!busy}>
              {busy === "invoice" ? "Opretter…" : "Create Invoice"}
            </Button>
          )}
        </div>
      </div>

      {deal && (
        <CreateProjectDialog
          open={createProjectDialogOpen}
          onOpenChange={setCreateProjectDialogOpen}
          dealId={deal.id}
        />
      )}

      <div className="rounded-2xl border p-4 shadow-card">
        <div className="text-sm text-muted-foreground mb-2">
          Company: {deal.company_id} · Contact: {deal.contact_id ?? "-"} · Currency: {deal.currency}
        </div>

        {/* Deal metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
          {typeof deal.expected_value_minor === "number" && deal.expected_value_minor > 0 && (
            <div>
              <span className="font-medium">{t("expected_value")}: </span>
              <span>{deal.expected_value_minor.toLocaleString('da-DK')} {deal.currency}</span>
            </div>
          )}
          <div>
            <span className="font-medium">{t("close_date")}: </span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="ml-2 h-8 px-2">
                  {closeDate ? format(closeDate, "PPP") : <span>Set close date</span>}
                  <CalendarIcon className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={closeDate ?? undefined}
                  onSelect={(date) => handleCloseDateChange(date ?? null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          {deal.owner_user_id && (
            <div>
              <span className="font-medium">Owner: </span>
              <span>{deal.owner_user_id}</span>
            </div>
          )}
        </div>
      </div>

      {/* Deal to Cash Summary */}
      <DealAccountingSummary dealId={deal.id} currency={deal.currency} />

      {/* (Næste punkt) Activity timeline UI */}
      <div className="rounded-2xl border p-4 shadow-card">
        <h2 className="text-lg font-semibold mb-2">Activity</h2>
        <DealActivityList dealId={deal.id} />
      </div>

      {/* Tasks Section */}
      <RelatedTasksList
        relatedType="deal"
        relatedId={deal.id}
        relatedTitle={deal.title}
      />

      <div className="text-sm">
        <Link className="underline" to="/deals">
          ← Back to deals
        </Link>
      </div>
    </div>
  );
}
