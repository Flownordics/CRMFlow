import { useMemo } from "react";
import { useDeals } from "@/services/deals";
import { usePipelines } from "@/services/pipelines";
import { useStageProbabilities } from "@/services/pipelines";
import { Deal } from "@/services/deals";
import { isWithinInterval, addDays } from "date-fns";

export interface DealsBoardData {
  // Core data
  deals: Deal[];
  stages: Array<{ id: string; name: string }>;

  // Stage totals (sum per stage) - all deals for display
  stageTotalsMinor: Record<string, number>;

  // Active stage totals (sum per stage) - only active deals for pipeline metrics
  activeStageTotalsMinor: Record<string, number>;

  // Weighted pipeline calculation
  weightedMinor: number;

  // Counts
  counts: {
    perStage: Record<string, number>;
    total: number;
    dueSoon: number;
    thisMonthExpected: number;
  };

  // Loading states
  isLoading: boolean;
  error: Error | null;
}

export interface UseDealsBoardDataParams {
  page?: number;
  limit?: number;
  q?: string;
  stage_id?: string;
  company_id?: string;
  now?: Date;
}

// Helper function to check if a stage is active (not won/lost)
function isActiveStage(stageName: string): boolean {
  const activeStages = ['prospecting', 'proposal', 'negotiation'];
  return activeStages.includes(stageName.toLowerCase());
}

export function useDealsBoardData(params: UseDealsBoardDataParams = {}): DealsBoardData {
  const { now = new Date(), ...dealParams } = params;

  // Fetch ALL deals for accurate KPI calculations (no pagination)
  // Override limit to get all deals
  const { data: dealsData, isLoading: dealsLoading, error: dealsError } = useDeals({
    ...dealParams,
    limit: 9999  // Fetch all deals for KPI calculations
  });

  // Fetch stages and probabilities
  const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines();
  const { data: stageProbabilities = {}, isLoading: probabilitiesLoading } = useStageProbabilities();

  const isLoading = dealsLoading || pipelinesLoading || probabilitiesLoading;
  const error = dealsError;

  // Get the first pipeline's stages (assuming single pipeline for now)
  const stages = useMemo(() => {
    const pipeline = pipelines[0];
    return pipeline?.stages || [];
  }, [pipelines]);

  // Get deals array from the response
  const deals = useMemo(() => {
    return dealsData?.data || [];
  }, [dealsData]);

  // Filter active deals (only deals in active stages for pipeline calculations)
  const activeDeals = useMemo(() => {
    return deals.filter(deal => {
      const stage = stages.find(s => s.id === deal.stage_id);
      return stage && isActiveStage(stage.name);
    });
  }, [deals, stages]);

  // Calculate stage totals (sum per stage) - include all deals for display
  const stageTotalsMinor = useMemo(() => {
    const totals: Record<string, number> = {};

    // Initialize all stages with 0
    stages.forEach(stage => {
      totals[stage.id] = 0;
    });

    // Sum up deal values by stage
    deals.forEach(deal => {
      const dealValue = deal.expected_value_minor || 0;
      totals[deal.stage_id] = (totals[deal.stage_id] || 0) + dealValue;
    });

    return totals;
  }, [deals, stages]);

  // Calculate active stage totals (sum per stage) - only active deals for pipeline metrics
  const activeStageTotalsMinor = useMemo(() => {
    const totals: Record<string, number> = {};

    // Initialize all stages with 0
    stages.forEach(stage => {
      totals[stage.id] = 0;
    });

    // Sum up deal values by stage (only active deals)
    activeDeals.forEach(deal => {
      const dealValue = deal.expected_value_minor || 0;
      totals[deal.stage_id] = (totals[deal.stage_id] || 0) + dealValue;
    });

    return totals;
  }, [activeDeals, stages]);

  // Calculate weighted pipeline - only active deals
  const weightedMinor = useMemo(() => {
    return activeDeals.reduce((acc, deal) => {
      const dealValue = deal.expected_value_minor || 0;

      // Get probability: deal.probability or stage default
      let probability = deal.probability;
      if (probability === null || probability === undefined) {
        const stageProbPct = stageProbabilities[deal.stage_id] || 50;
        probability = stageProbPct / 100; // Convert from 0-100 to 0-1
      }

      return acc + (dealValue * probability);
    }, 0);
  }, [activeDeals, stageProbabilities]);

  // Calculate counts - only active deals for pipeline metrics
  const counts = useMemo(() => {
    const perStage: Record<string, number> = {};
    let total = 0;
    let dueSoon = 0;
    let thisMonthExpected = 0;

    // Initialize all stages with 0
    stages.forEach(stage => {
      perStage[stage.id] = 0;
    });

    // Count deals by stage and calculate other metrics
    deals.forEach(deal => {
      // Count by stage (all deals for display)
      perStage[deal.stage_id] = (perStage[deal.stage_id] || 0) + 1;

      // Only count active deals for pipeline metrics
      const stage = stages.find(s => s.id === deal.stage_id);
      if (stage && isActiveStage(stage.name)) {
        total++;

        // Due soon (≤ 7 days) - only active deals
        if (deal.close_date) {
          const closeDate = new Date(deal.close_date);
          const daysDiff = Math.ceil((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff >= 0 && daysDiff <= 7) {
            dueSoon++;
          }

          // This month expected - only active deals
          if (closeDate.getMonth() === now.getMonth() && closeDate.getFullYear() === now.getFullYear()) {
            thisMonthExpected++;
          }
        }
      }
    });

    return {
      perStage,
      total,
      dueSoon,
      thisMonthExpected
    };
  }, [deals, stages, now]);

  return {
    deals,
    stages,
    stageTotalsMinor,
    activeStageTotalsMinor,
    weightedMinor,
    counts,
    isLoading,
    error
  };
}
