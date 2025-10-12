import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { apiClient, normalizeApiData } from "@/lib/api";
import { handleError } from "@/lib/errorHandler";
import { logger } from "@/lib/logger";

export interface CompanyRevenue {
  totalDealsValue: number;
  wonDealsValue: number;
  activePipelineValue: number;
  averageDealSize: number;
  dealWinRate: number;
  totalDeals: number;
  wonDeals: number;
  activeDeals: number;
  lostDeals: number;
  lastDealDate: string | null;
}

// Fetch company revenue analytics
export async function fetchCompanyRevenue(companyId: string): Promise<CompanyRevenue> {
  try {
    // Fetch all deals for the company
    const response = await apiClient.get(
      `/deals?company_id=eq.${companyId}&select=id,expected_value_minor,stage_id,created_at,stages(name)`
    );
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      return {
        totalDealsValue: 0,
        wonDealsValue: 0,
        activePipelineValue: 0,
        averageDealSize: 0,
        dealWinRate: 0,
        totalDeals: 0,
        wonDeals: 0,
        activeDeals: 0,
        lostDeals: 0,
        lastDealDate: null,
      };
    }

    const deals = Array.isArray(raw) ? raw : [];

    // Calculate metrics
    const totalDeals = deals.length;
    const totalDealsValue = deals.reduce((sum, deal) => sum + (deal.expected_value_minor || 0), 0);

    // Identify won and lost deals based on stage name
    const wonDeals = deals.filter(deal => 
      deal.stages?.name?.toLowerCase().includes('won') || 
      deal.stages?.name?.toLowerCase().includes('closed won')
    );
    const lostDeals = deals.filter(deal => 
      deal.stages?.name?.toLowerCase().includes('lost') || 
      deal.stages?.name?.toLowerCase().includes('closed lost')
    );
    const activeDeals = deals.filter(deal => 
      !deal.stages?.name?.toLowerCase().includes('won') &&
      !deal.stages?.name?.toLowerCase().includes('lost') &&
      !deal.stages?.name?.toLowerCase().includes('closed')
    );

    const wonDealsValue = wonDeals.reduce((sum, deal) => sum + (deal.expected_value_minor || 0), 0);
    const activePipelineValue = activeDeals.reduce((sum, deal) => sum + (deal.expected_value_minor || 0), 0);
    const averageDealSize = totalDeals > 0 ? totalDealsValue / totalDeals : 0;
    const dealWinRate = (wonDeals.length + lostDeals.length) > 0 
      ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100 
      : 0;

    // Get last deal date (most recent created_at)
    const sortedDeals = [...deals].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const lastDealDate = sortedDeals.length > 0 ? sortedDeals[0].created_at : null;

    return {
      totalDealsValue,
      wonDealsValue,
      activePipelineValue,
      averageDealSize,
      dealWinRate,
      totalDeals,
      wonDeals: wonDeals.length,
      activeDeals: activeDeals.length,
      lostDeals: lostDeals.length,
      lastDealDate,
    };
  } catch (error) {
    logger.error("Failed to fetch company revenue", { error, companyId }, 'CompanyRevenue');
    // Return zero values on error
    return {
      totalDealsValue: 0,
      wonDealsValue: 0,
      activePipelineValue: 0,
      averageDealSize: 0,
      dealWinRate: 0,
      totalDeals: 0,
      wonDeals: 0,
      activeDeals: 0,
      lostDeals: 0,
      lastDealDate: null,
    };
  }
}

// React Query hook
export function useCompanyRevenue(companyId: string) {
  return useQuery({
    queryKey: [...qk.companyDeals(companyId), 'revenue'],
    queryFn: () => fetchCompanyRevenue(companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

