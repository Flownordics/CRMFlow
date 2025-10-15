import { useDeals } from "@/services/deals";
import { usePipelines, useStageProbabilities } from "@/services/pipelines";
import { KanbanBoard } from "@/components/deals/KanbanBoard";
import { CreateDealModal } from "@/components/deals/CreateDealModal";
import { EditDealDrawer } from "@/components/deals/EditDealDrawer";
import { CreateQuoteModal } from "@/components/quotes/CreateQuoteModal";
import { CreateOrderModal } from "@/components/orders/CreateOrderModal";
import { DealsKpiHeader } from "@/components/deals/DealsKpiHeader";
import { DealsStageLegend } from "@/components/deals/DealsStageLegend";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useHotkeys } from "@/lib/useHotkeys";
import { useCreateQuoteFromDeal, useCreateOrderFromDeal, buildPrefillFromDeal, type DealData as ConversionDealData } from "@/services/conversions";
import { toastBus } from "@/lib/toastBus";
import { useI18n } from "@/lib/i18n";
import { Deal } from "@/services/deals";
import { useDealsBoardData } from "@/hooks/useDealsBoardData";
import { isIdempotent, markIdempotent, clearIdempotent, generateAutomationKey } from "@/services/idempotency";
import { logActivity } from "@/services/activity";
import { useRef } from "react";
import { logger } from '@/lib/logger';
import { AnalyticsCard, AnalyticsCardGrid } from "@/components/common/charts/AnalyticsCard";
import { DealValueDistributionChart } from "@/components/deals/DealValueDistributionChart";
import { WinRateTrendChart } from "@/components/deals/WinRateTrendChart";
import { DealVelocityCard } from "@/components/analytics/DealVelocityCard";
import { PieChart as PieChartIcon, TrendingUp as TrendingUpIcon, Zap } from "lucide-react";

interface LineItem {
  unitMinor: number;
  qty: number;
}

interface DealData {
  id: string;
  title: string;
  stageId: string;
  expectedValue?: number;
  amountMinor?: number;
  currency?: string;
  closeDate?: string | null;
  lines?: LineItem[];
  companyId?: string;
  contactId?: string;
  // Additional fields for better prefill
  ownerUserId?: string;
  probability?: number;
  notes?: string;
  taxPct?: number;
}

export default function DealsBoard() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [stageForNew, setStageForNew] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);

  // Use the centralized hook for all deals board data
  const {
    deals,
    stages,
    stageTotalsMinor,
    isLoading,
    error
  } = useDealsBoardData({
    // Add any filters here if needed
    stage_id: activeStageId || undefined,
  });

  // Debug logging
  logger.debug("[DealsBoard] Data loaded:", {
    dealsCount: deals?.length || 0,
    stagesCount: stages?.length || 0,
    stages: stages?.map(s => ({ id: s.id, name: s.name })),
    isLoading,
    error: error?.message
  });

  // Automation state
  const [automation, setAutomation] = useState<{
    type: 'quote' | 'order',
    deal: DealData,
    quoteData?: any // Add quote data for editing
  } | null>(null);
  const lastAutomationRef = useRef<{ id: string; at: number } | null>(null);

  // Modal states (legacy - keeping for backward compatibility)
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [prefillDeal, setPrefillDeal] = useState<DealData | null>(null);

  // Edit drawer state
  const [editOpen, setEditOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  // Conversion hooks
  const createQuoteFromDeal = useCreateQuoteFromDeal();
  const createOrderFromDeal = useCreateOrderFromDeal();

  // Handle opening edit drawer
  const handleOpenEdit = (dealData: DealData) => {
    // Find the full deal object from the deals array
    const fullDeal = deals.find(d => d.id === dealData.id);
    if (fullDeal) {
      setSelectedDeal(fullDeal);
      setEditOpen(true);
    }
  };

  // Transform deals to match the expected interface for child components
  const transformedDeals = useMemo(() => {
    return deals.map(deal => ({
      ...deal,
      stageId: deal.stage_id, // Map stage_id to stageId for compatibility
      lines: [], // Add empty lines array for compatibility
    }));
  }, [deals]);

  useHotkeys([{ combo: "mod+n", handler: () => setOpen(true) }]);

  // Filter stages for KPI (exclude "qualified" stage)
  const kpiStages = stages.filter(s => s.name.toLowerCase() !== "qualified");

  // Helper to lookup stage names from IDs
  const stageById = useMemo(() => {
    const m: Record<string, { id: string; name: string }> = {};
    for (const s of stages) m[s.id] = { id: s.id, name: s.name };
    return m;
  }, [stages]);

  // Handle stage changes and trigger automation
  const handleStageChange = ({ deal, fromStageId, toStageId, toStageName }: { deal: DealData; fromStageId: string; toStageId: string; toStageName: string }) => {
    logger.debug("[DealsBoard] handleStageChange called:", {
      dealId: deal.id,
      dealTitle: deal.title,
      fromStageId,
      toStageId,
      toStageName,
      dealCompanyId: deal.companyId
    });

    const now = Date.now();

    // Idempotency guard: prevent duplicate automation for same deal within 1 second
    if (lastAutomationRef.current &&
      lastAutomationRef.current.id === deal.id &&
      now - lastAutomationRef.current.at < 1000) {
      logger.debug("[DealsBoard] Idempotency guard triggered, skipping");
      return;
    }

    const name = (toStageName ?? '').toLowerCase();
    logger.debug("[DealsBoard] Stage name check:", { name, toStageName });

    // Check for automation triggers
    const isProposal = ["proposal", "tilbud", "quote", "quotation", "offer"].includes(name);
    const isWon = ["won", "vundet", "closed won", "closed", "sold", "completed"].includes(name);

    logger.debug("[DealsBoard] Automation check:", { isProposal, isWon, name });

    if (isProposal || isWon) {
      logger.debug("[DealsBoard] Automation trigger detected!");

      // Check if deal has a company (required for documents)
      if (!deal.companyId) {
        logger.debug("[DealsBoard] No company ID, showing error");
        toastBus.emit({
          variant: "destructive",
          title: t("missing_company"),
          description: t("please_add_company_first")
        });
        return;
      }

      // Generate automation key for idempotency
      const automationType = isProposal ? 'quote' : 'order';
      const automationKey = generateAutomationKey(automationType, deal.id);

      // Check if this automation was already triggered recently
      if (isIdempotent(automationKey, 2 * 60 * 1000)) { // 2 minutes
        logger.debug(`[DealsBoard] Automation ${automationType} for deal ${deal.id} already triggered recently, skipping`);
        return;
      }

      // Mark as triggered
      markIdempotent(automationKey, 2 * 60 * 1000);
      lastAutomationRef.current = { id: deal.id, at: now };

      logger.debug("[DealsBoard] Setting automation state:", { type: automationType, dealId: deal.id });

      // Set automation state
      if (isProposal) {
        setAutomation({ type: 'quote', deal });
      } else if (isWon) {
        setAutomation({ type: 'order', deal });
      }
    } else {
      logger.debug("[DealsBoard] No automation trigger for stage:", name);
    }
  };

  const filteredStages = useMemo(() =>
    (activeStageId ? kpiStages.filter(s => s.id === activeStageId) : kpiStages),
    [kpiStages, activeStageId]
  );

  const map = useMemo(() => {
    const m: Record<string, DealData[]> = {};

    // Safety check: ensure stages are loaded before processing deals
    if (!stages || stages.length === 0) {
      return m;
    }

    // Initialize ALL stages (including "Qualified") to handle moves from any stage
    for (const s of stages) {
      m[s.id] = [];
    }

    // Keep track of processed deals to avoid duplicates
    const processedDeals = new Set<string>();
    const skippedDeals: Array<{ id: string; stage_id: string; title: string }> = [];

    for (const d of deals) {
      // If filtering by stage, only include deals from that stage
      if (activeStageId && d.stage_id !== activeStageId) continue;

      // Skip if we've already processed this deal
      if (processedDeals.has(d.id)) {
        continue;
      }
      processedDeals.add(d.id);

      // Use expected_value_minor if available, otherwise fall back to 0
      const valueMinor = d.expected_value_minor || 0;

      const dealData = {
        id: d.id,
        title: d.title,
        stageId: d.stage_id,
        amountMinor: valueMinor,
        closeDate: d.close_date,
        currency: d.currency || "DKK", // Use currency from schema or default
        companyId: d.company_id,
        contactId: d.contact_id,
        expectedValue: d.expected_value_minor,
        // Additional fields for better prefill
        ownerUserId: d.owner_user_id,
        probability: d.probability,
        // We'll add notes and taxPct later when they're available in the schema
      };

      // Safety check: only add deal if the stage exists in our stages array
      if (m[d.stage_id]) {
        m[d.stage_id].push(dealData);
      } else {
        logger.warn(`Deal ${d.id} has invalid stage_id: ${d.stage_id}. This deal belongs to a different pipeline and will not be displayed.`);
        skippedDeals.push({ id: d.id, stage_id: d.stage_id, title: d.title });
        // Optionally, we could add it to a special "Other Pipeline" section
        // For now, we'll just skip it to maintain the current behavior
      }
    }

    logger.debug("[DealsBoard] Map created:", {
      stageKeys: Object.keys(m),
      stageCounts: Object.fromEntries(
        Object.entries(m).map(([stageId, deals]) => [stageId, deals.length])
      ),
      skippedDeals: skippedDeals.length > 0 ? skippedDeals : undefined
    });

    if (skippedDeals.length > 0) {
      logger.warn(`[DealsBoard] Skipped ${skippedDeals.length} deals from other pipelines:`, skippedDeals);
    }

    return m;
  }, [deals, stages, activeStageId]);

  if (isLoading) return <div className="p-6">Indlæser deals…</div>;
  if (error)
    return (
      <div role="alert" className="p-6 text-danger">
        Kunne ikke hente deals
      </div>
    );
  if (stages.length === 0) return <div className="p-6">Ingen pipeline konfigureret.</div>;

  return (
    <div className="space-y-6 p-6 max-w-full overflow-x-hidden">
      <PageHeader
        title="Deals"
        subtitle="Track your pipeline, forecast and progression."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
            Add Deal
          </Button>
        }
      />

      <div className="h-0.5 w-full bg-gradient-to-r from-accent/30 via-primary/30 to-transparent rounded-full" aria-hidden="true" />

      {kpiStages.length > 8 && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          💡 <strong>Tip:</strong> Zoom out to see all columns comfortably
        </div>
      )}

      <DealsKpiHeader
        params={{
          stage_id: activeStageId || undefined,
        }}
        currency="DKK"
      />

      <DealsStageLegend
        stages={kpiStages}
        deals={transformedDeals}
        activeStageId={activeStageId ?? undefined}
        onStageToggle={(sId) => setActiveStageId(prev => prev === sId ? null : sId)}
        stageTotalsMinor={stageTotalsMinor}
      />

      {activeStageId && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filter:</span>
          <Badge variant="secondary" className="flex items-center gap-1">
            {kpiStages.find(s => s.id === activeStageId)?.name}
            <button
              className="ml-1 hover:bg-secondary-foreground/20 rounded-full w-4 h-4 flex items-center justify-center text-xs"
              aria-label="Clear filter"
              onClick={() => setActiveStageId(null)}
            >
              ✕
            </button>
          </Badge>
        </div>
      )}

      {/* Analytics Charts */}
      <AnalyticsCardGrid columns={3}>
        <AnalyticsCard
          title="Deal Value by Stage"
          description="Pipeline distribution"
          icon={PieChartIcon}
          chartName="Deal Value Distribution"
        >
          <DealValueDistributionChart
            data={kpiStages.map((stage) => ({
              stageName: stage.name,
              value: stageTotalsMinor[stage.id] || 0,
            }))}
          />
        </AnalyticsCard>

        <AnalyticsCard
          title="Win Rate Trend"
          description="Monthly win rate over time"
          icon={TrendingUpIcon}
          chartName="Win Rate Trend"
        >
          <WinRateTrendChart
            deals={deals}
            getStageName={(stageId) => stageById[stageId]?.name || 'Unknown'}
          />
        </AnalyticsCard>

        <AnalyticsCard
          title="Deal Velocity"
          description="Time in each stage"
          icon={Zap}
          chartName="Deal Velocity"
        >
          <div className="h-[300px] overflow-y-auto">
            <DealVelocityCard />
          </div>
        </AnalyticsCard>
      </AnalyticsCardGrid>

      <div className="w-full overflow-hidden">
        <KanbanBoard
          stages={filteredStages}
          dealsByStage={map}
          onCreateInStage={(sId) => {
            setStageForNew(sId);
            setOpen(true);
          }}
          onStageChange={handleStageChange}
          onOpenEdit={handleOpenEdit}
        />
      </div>

      <CreateDealModal
        open={open}
        onOpenChange={setOpen}
        defaultStageId={stageForNew ?? undefined}
      />

      {/* Automation Modals */}
      {automation && (
        <>
          {logger.debug("[DealsBoard] Rendering automation modal:", automation)}
          {automation.type === 'quote' && (
            <CreateQuoteModal
              open={true}
              onOpenChange={(open) => {
                if (!open) {
                  setAutomation(null);
                  // Clear idempotency key when modal is closed
                  const key = generateAutomationKey('quote', automation.deal.id);
                  clearIdempotent(key);
                }
              }}
              defaultDealId={automation.deal.id}
              defaultCompanyId={automation.deal.companyId}
              defaultContactId={automation.deal.contactId}
              defaultCurrency={automation.deal.currency || "DKK"}
              expectedValueMinor={automation.deal.amountMinor}
              defaultTitle={automation.deal.title}
              defaultNotes={automation.deal.notes}
              defaultTaxPct={automation.deal.taxPct}
              defaultValidUntil={automation.deal.closeDate}
              defaultQuote={automation.quoteData} // Pass quote data if available
              onSuccess={(quote) => {
                toastBus.emit({
                  title: t("quote_created"),
                  description: t("quote_created_from_deal")
                });
                // Log activity
                logActivity({
                  type: 'quote_created_from_deal',
                  dealId: automation.deal.id,
                  meta: { quoteId: quote.id }
                });
                setAutomation(null);
                // Clear idempotency key on success
                const key = generateAutomationKey('quote', automation.deal.id);
                clearIdempotent(key);
              }}
            />
          )}

          {automation.type === 'order' && (
            <CreateOrderModal
              open={true}
              onOpenChange={(open) => {
                if (!open) {
                  setAutomation(null);
                  // Clear idempotency key when modal is closed
                  const key = generateAutomationKey('order', automation.deal.id);
                  clearIdempotent(key);
                }
              }}
              defaultDealId={automation.deal.id}
              defaultCompanyId={automation.deal.companyId}
              defaultContactId={automation.deal.contactId}
              defaultCurrency={automation.deal.currency || "DKK"}
              fromQuoteId={undefined}
              expectedValueMinor={automation.deal.amountMinor}
              defaultTitle={automation.deal.title}
              defaultNotes={automation.deal.notes}
              defaultTaxPct={automation.deal.taxPct}
              defaultDeliveryDate={automation.deal.closeDate}
              onSuccess={(order) => {
                toastBus.emit({
                  title: t("order_created"),
                  description: t("order_created_from_deal")
                });
                // Log activity
                logActivity({
                  type: 'order_created_from_deal',
                  dealId: automation.deal.id,
                  meta: { orderId: order.id }
                });
                setAutomation(null);
                // Clear idempotency key on success
                const key = generateAutomationKey('order', automation.deal.id);
                clearIdempotent(key);
              }}
            />
          )}
        </>
      )}

      {/* Legacy Modals (keeping for backward compatibility) */}
      {prefillDeal && (
        <CreateQuoteModal
          open={quoteOpen}
          onOpenChange={(v) => { setQuoteOpen(v); if (!v) setPrefillDeal(null); }}
          defaultDealId={prefillDeal.id}
          defaultCompanyId={prefillDeal.companyId}
          defaultContactId={prefillDeal.contactId}
          defaultCurrency={prefillDeal.currency || "DKK"}
          expectedValueMinor={prefillDeal.amountMinor}
          defaultTitle={prefillDeal.title}
          defaultNotes={prefillDeal.notes}
          defaultTaxPct={prefillDeal.taxPct}
          defaultValidUntil={prefillDeal.closeDate}
        />
      )}

      {prefillDeal && (
        <CreateOrderModal
          open={orderOpen}
          onOpenChange={(v) => { setOrderOpen(v); if (!v) setPrefillDeal(null); }}
          defaultDealId={prefillDeal.id}
          defaultCompanyId={prefillDeal.companyId}
          defaultContactId={prefillDeal.contactId}
          defaultCurrency={prefillDeal.currency || "DKK"}
          fromQuoteId={undefined}
          expectedValueMinor={prefillDeal.amountMinor}
          defaultTitle={prefillDeal.title}
          defaultNotes={prefillDeal.notes}
          defaultTaxPct={prefillDeal.taxPct}
          defaultDeliveryDate={prefillDeal.closeDate}
        />
      )}

      <EditDealDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        deal={selectedDeal}
        stages={kpiStages}
        stageProbPctById={{}}
      />
    </div>
  );
}
