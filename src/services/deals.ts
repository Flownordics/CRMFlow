import { z } from "zod";
import { apiClient, apiPostWithReturn, apiPatchWithReturn, normalizeApiData } from "../lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { USE_MOCKS } from "@/lib/debug";
import { syncDealToCalendar, removeDealFromCalendar, DealCalendarEvent } from "@/lib/google-calendar";
import { handleError } from "@/lib/errorHandler";
import { invalidateDealQueries } from "@/lib/queryCache";
import { logger } from "@/lib/logger";
import { executeCalendarSyncWithRecovery } from "@/lib/errorRecovery";
import { isValidUuid } from "@/lib/validation";
import { getPipelineIdFromStageId, getFirstStageIdFromPipeline } from "@/lib/stageHelpers";
import { useAuthStore } from "@/stores/useAuthStore";
import { getEntityCacheConfig, defaultQueryOptions } from "@/lib/queryCacheConfig";
import { supabase } from "@/integrations/supabase/client";

// Response type for paginated results
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const Deal = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  company_id: z.string().uuid(),
  contact_id: z.string().uuid().nullable().optional(),
  stage_id: z.string().uuid(),
  position: z.number().int().default(0),
  currency: z.string().default('DKK'),
  expected_value_minor: z.number().int().nonnegative().default(0), // minor units (fx DKK*100)
  close_date: z.string().nullable().optional(),              // ISO date string
  probability: z.number().min(0).max(1).nullable().optional(), // 0-1, null means use stage default
  owner_user_id: z.string().uuid().nullable().optional(),
  created_by: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Deal = z.infer<typeof Deal>;

export async function fetchDeals(params: {
  page?: number;
  limit?: number;
  q?: string;
  stage_id?: string;
  company_id?: string;
} = {}): Promise<PaginatedResponse<Deal>> {
  const { page = 1, limit = 20, q = "", stage_id, company_id } = params;

  if (USE_MOCKS) {
    // For now, return mock data
    const { mockDeals } = await import("./mockData");
    return {
      data: mockDeals,
      total: mockDeals.length,
      page: 1,
      limit: mockDeals.length,
      totalPages: 1
    } as PaginatedResponse<Deal>;
  }

  try {
    // Build query string for Supabase REST API
    const queryParams = new URLSearchParams();

    // Standard Supabase REST parameters
    queryParams.append('select', '*');
    queryParams.append('order', 'updated_at.desc');
    
    // Filter out soft-deleted records
    queryParams.append('deleted_at', 'is.null');

    // Pagination
    const offset = (page - 1) * limit;
    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());

    // Text search - Supabase uses 'or' with ilike for text search
    if (q) {
      queryParams.append('or', `(title.ilike.%${q}%)`);
    }

    // Stage filter
    if (stage_id) {
      queryParams.append('stage_id', `eq.${stage_id}`);
    }

    // Company filter
    if (company_id) {
      queryParams.append('company_id', `eq.${company_id}`);
    }

    const url = `/deals?${queryParams.toString()}`;
    const response = await apiClient.get(url);
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      // Content var HTML eller plain text → typisk CORS/401/404/HTML-fejl
      throw new Error("[deals] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
    }

    // Parse the deals array
    const deals = z.array(Deal).parse(raw);

    // Read total from x-total-count header (fallback to array length)
    const total = parseInt(response.headers['x-total-count'] || response.headers['content-range']?.split('/')?.[1] || deals.length.toString());

    return {
      data: deals,
      total: total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit)
    } as PaginatedResponse<Deal>;
  } catch (error) {
    throw handleError(error, 'fetchDeals');
  }
}

export async function fetchDeal(id: string): Promise<Deal> {
  if (USE_MOCKS) {
    // For now, return mock data
    const { mockDeals } = await import("./mockData");
    const deal = mockDeals.find(d => d.id === id);
    if (!deal) throw new Error("Deal not found");
    return deal;
  }

  try {
    const response = await apiClient.get(`/deals?id=eq.${id}&deleted_at=is.null&select=*`);
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[deal] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
    }

    // Handle array response from Supabase
    if (Array.isArray(raw)) {
      if (raw.length === 0) {
        throw new Error("Deal not found");
      }
      return Deal.parse(raw[0]);
    }

    return Deal.parse(raw);
  } catch (error) {
    throw handleError(error, `fetchDeal(${id})`);
  }
}

export async function updateDeal(id: string, updates: Partial<Deal>): Promise<Deal> {
  if (USE_MOCKS) {
    // Mock implementation for now
    const { mockDeals } = await import("./mockData");
    const dealIndex = mockDeals.findIndex(d => d.id === id);
    if (dealIndex !== -1) {
      // Note: Mock data structure doesn't match the Deal type exactly
      Object.assign(mockDeals[dealIndex], updates);
      return mockDeals[dealIndex] as any;
    }
    throw new Error("Deal not found");
  }

  try {
    const response = await apiPatchWithReturn(`/deals?id=eq.${id}`, updates);
    const raw = normalizeApiData(response);

    // Handle array response from Supabase
    if (Array.isArray(raw)) {
      if (raw.length === 0) {
        throw new Error("Deal not found");
      }
      return Deal.parse(raw[0]);
    }

    return Deal.parse(raw);
  } catch (error) {
    throw handleError(error, `updateDeal(${id})`);
  }
}

// Soft delete a deal
export async function deleteDeal(id: string): Promise<void> {
  if (USE_MOCKS) {
    // Mock implementation for now
    const { mockDeals } = await import("./mockData");
    const dealIndex = mockDeals.findIndex(d => d.id === id);
    if (dealIndex !== -1) {
      mockDeals.splice(dealIndex, 1);
      return;
    }
    throw new Error("Deal not found");
  }

  try {
    // Soft delete by setting deleted_at timestamp
    await apiClient.patch(`/deals?id=eq.${id}`, {
      deleted_at: new Date().toISOString()
    });

    // Clean up tasks that reference this deal
    // Nulstil related_type og related_id for tasks der refererer til den slettede deal
    const { error: tasksError } = await supabase
      .from('tasks')
      .update({
        related_type: null,
        related_id: null
      })
      .eq('related_type', 'deal')
      .eq('related_id', id);

    if (tasksError) {
      logger.warn(`[deleteDeal] Failed to cleanup tasks for deal ${id}:`, tasksError);
      // Don't throw - deal deletion succeeded, task cleanup is best-effort
    } else {
      logger.debug(`[deleteDeal] Cleaned up task references for deal ${id}`);
    }
  } catch (error) {
    throw handleError(error, `deleteDeal(${id})`);
  }
}

// Restore a soft-deleted deal
export async function restoreDeal(id: string): Promise<void> {
  try {
    await apiClient.patch(`/deals?id=eq.${id}`, {
      deleted_at: null
    });
  } catch (error) {
    throw handleError(error, `restoreDeal(${id})`);
  }
}

// Fetch deleted deals
export async function fetchDeletedDeals(limit: number = 50) {
  try {
    const response = await apiClient.get(
      `/deals?deleted_at=not.is.null&select=*&order=deleted_at.desc&limit=${limit}`
    );
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[deals] Non-JSON response.");
    }

    return z.array(Deal).parse(raw);
  } catch (error) {
    logger.error("Failed to fetch deleted deals", { error }, 'DeletedDeals');
    throw new Error("Failed to fetch deleted deals");
  }
}

// Check deal dependencies before delete
export interface DealDependencies {
  hasActiveItems: boolean;
  activeQuotes: number;
  activeOrders: number;
  activeInvoices: number;
  inactiveQuotes: number;
  inactiveOrders: number;
  inactiveInvoices: number;
}

export async function checkDealDependencies(dealId: string): Promise<DealDependencies> {
  if (USE_MOCKS) {
    // Mock implementation - return empty dependencies
    return {
      hasActiveItems: false,
      activeQuotes: 0,
      activeOrders: 0,
      activeInvoices: 0,
      inactiveQuotes: 0,
      inactiveOrders: 0,
      inactiveInvoices: 0,
    };
  }

  try {
    // Fetch quotes for this deal - explicitly filter out soft-deleted quotes
    // Use both deleted_at=is.null AND ensure we're only getting active records
    const quotesResponse = await apiClient.get(
      `/quotes?deal_id=eq.${dealId}&deleted_at=is.null&select=id,status,deleted_at`
    );
    const quotesRaw = normalizeApiData(quotesResponse);
    const quotes = Array.isArray(quotesRaw) ? quotesRaw : [];
    
    // Double-check: filter out any quotes with deleted_at set (defensive programming)
    const activeQuotesList = quotes.filter((q: any) => 
      !q.deleted_at && (q.status === 'sent' || q.status === 'accepted')
    );
    const activeQuotes = activeQuotesList.length;
    const inactiveQuotes = quotes.filter((q: any) => !q.deleted_at).length - activeQuotes;

    // Log for debugging if we find quotes
    if (quotes.length > 0) {
      logger.debug(`[checkDealDependencies] Found ${quotes.length} quotes for deal ${dealId}`, {
        dealId,
        quotes: quotes.map((q: any) => ({ id: q.id, status: q.status, deleted_at: q.deleted_at }))
      });
    }

    // Fetch orders for this deal - explicitly filter out soft-deleted orders
    const ordersResponse = await apiClient.get(
      `/orders?deal_id=eq.${dealId}&deleted_at=is.null&select=id,status,deleted_at`
    );
    const ordersRaw = normalizeApiData(ordersResponse);
    const orders = Array.isArray(ordersRaw) ? ordersRaw : [];
    
    // Double-check: filter out any orders with deleted_at set
    const activeOrdersList = orders.filter((o: any) => 
      !o.deleted_at && (o.status === 'accepted' || o.status === 'invoiced' || o.status === 'backorder')
    );
    const activeOrders = activeOrdersList.length;
    const inactiveOrders = orders.filter((o: any) => !o.deleted_at).length - activeOrders;

    // Log for debugging if we find orders
    if (orders.length > 0) {
      logger.debug(`[checkDealDependencies] Found ${orders.length} orders for deal ${dealId}`, {
        dealId,
        orders: orders.map((o: any) => ({ id: o.id, status: o.status, deleted_at: o.deleted_at }))
      });
    }

    // Fetch invoices for this deal - explicitly filter out soft-deleted invoices
    const invoicesResponse = await apiClient.get(
      `/invoices?deal_id=eq.${dealId}&deleted_at=is.null&select=id,status,deleted_at`
    );
    const invoicesRaw = normalizeApiData(invoicesResponse);
    const invoices = Array.isArray(invoicesRaw) ? invoicesRaw : [];
    
    // Double-check: filter out any invoices with deleted_at set
    const activeInvoicesList = invoices.filter((inv: any) => {
      if (inv.deleted_at) return false;
      const status = inv.status;
      return status === 'sent' || status === 'paid' || status === 'overdue';
    });
    const activeInvoices = activeInvoicesList.length;
    const inactiveInvoices = invoices.filter((inv: any) => !inv.deleted_at).length - activeInvoices;

    // Log for debugging if we find invoices
    if (invoices.length > 0) {
      logger.debug(`[checkDealDependencies] Found ${invoices.length} invoices for deal ${dealId}`, {
        dealId,
        invoices: invoices.map((inv: any) => ({ id: inv.id, status: inv.status, deleted_at: inv.deleted_at }))
      });
    }

    const hasActiveItems = activeQuotes > 0 || activeOrders > 0 || activeInvoices > 0;

    const result = {
      hasActiveItems,
      activeQuotes,
      activeOrders,
      activeInvoices,
      inactiveQuotes,
      inactiveOrders,
      inactiveInvoices,
    };

    // Log the final result for debugging
    if (hasActiveItems) {
      logger.debug(`[checkDealDependencies] Deal ${dealId} has active items`, result);
    }

    return result;
  } catch (error) {
    logger.error("Failed to check deal dependencies", { error, dealId }, 'DealDependencies');
    throw handleError(error, `checkDealDependencies(${dealId})`);
  }
}

export async function setDealOwner(dealId: string, userId: string): Promise<Deal> {
  if (USE_MOCKS) {
    // Mock implementation for now
    const { mockDeals } = await import("./mockData");
    const dealIndex = mockDeals.findIndex(d => d.id === dealId);
    if (dealIndex !== -1) {
      // Note: Mock data structure doesn't match the Deal type exactly
      (mockDeals[dealIndex] as any).owner_user_id = userId;
      return mockDeals[dealIndex] as any;
    }
    throw new Error("Deal not found");
  }

  try {
    const response = await apiPatchWithReturn(`/deals?id=eq.${dealId}`, {
      owner_user_id: userId
    });
    const raw = normalizeApiData(response);

    // Handle array response from Supabase
    if (Array.isArray(raw)) {
      if (raw.length === 0) {
        throw new Error("Deal not found");
      }
      return Deal.parse(raw[0]);
    }

    return Deal.parse(raw);
  } catch (error) {
    throw handleError(error, `setDealOwner(${dealId}, ${userId})`);
  }
}

/**
 * Sync a deal's close date to the owner's Google Calendar
 */
export async function syncDealToOwnerCalendar(deal: Deal, companyName?: string): Promise<string | null> {
  if (!deal.close_date || !deal.owner_user_id) {
    return null; // No close date or owner, nothing to sync
  }

  try {
    const dealEvent: DealCalendarEvent = {
      deal_id: deal.id,
      title: deal.title,
      close_date: deal.close_date,
      owner_user_id: deal.owner_user_id,
      company_name: companyName,
      expected_value: deal.expected_value_minor > 0 ? deal.expected_value_minor / 100 : undefined,
    };

    return await syncDealToCalendar(dealEvent);
  } catch (error) {
    logger.error("Failed to sync deal to calendar", { error, dealId: deal.id }, 'CalendarSync');

    // Attempt recovery
    const recoverySuccess = await executeCalendarSyncWithRecovery(deal.id, deal.owner_user_id, 'sync');
    if (!recoverySuccess) {
      throw error;
    }
    return null; // Recovery succeeded but no event ID
  }
}

/**
 * Remove a deal's calendar event when it's deleted or close date is removed
 */
export async function removeDealFromOwnerCalendar(dealId: string, ownerUserId: string): Promise<void> {
  if (!ownerUserId) {
    return; // No owner, nothing to remove
  }

  try {
    await removeDealFromCalendar(dealId, ownerUserId);
  } catch (error) {
    logger.error("Failed to remove deal from calendar", { error, dealId, ownerUserId }, 'CalendarSync');

    // Attempt recovery
    const recoverySuccess = await executeCalendarSyncWithRecovery(dealId, ownerUserId, 'remove');
    if (!recoverySuccess) {
      throw error;
    }
  }
}

export async function moveDealStage(id: string, stage_id: string) {
  if (USE_MOCKS) {
    // For now, update mock data
    const { mockDeals } = await import("./mockData");
    const dealIndex = mockDeals.findIndex(d => d.id === id);
    if (dealIndex === -1) throw new Error("Deal not found");

    mockDeals[dealIndex] = { ...mockDeals[dealIndex], stage_id };
    return mockDeals[dealIndex];
  }

  try {
    // Use PATCH instead of POST for updating stage
    const response = await apiPatchWithReturn(`/deals?id=eq.${id}`, { stage_id });
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[deal] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
    }

    // Handle array response from Supabase
    if (Array.isArray(raw)) {
      if (raw.length === 0) {
        throw new Error("Deal not found");
      }
      return Deal.parse(raw[0]);
    }

    return Deal.parse(raw);
  } catch (error) {
    throw handleError(error, `moveDealStage(${id}, ${stage_id})`);
  }
}

export async function createDeal(deal: Omit<Deal, 'id'>) {
  if (USE_MOCKS) {
    // Mock data for now
    const newDeal: Deal = {
      ...deal,
      id: Math.random().toString(36).substr(2, 9), // Generate random ID
    };

    // Add to mock data
    const { mockDeals } = await import("./mockData");
    mockDeals.push(newDeal);

    return newDeal;
  }

  try {
    // Create the deal with return representation
    const response = await apiPostWithReturn("/deals", deal);
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[deal] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
    }

    // PostgREST returns arrays, so we need to handle that
    const createdDeal = Array.isArray(raw) ? raw[0] : raw;

    if (!createdDeal) {
      throw new Error("[deal] No deal data returned from API");
    }

    return Deal.parse(createdDeal);
  } catch (error) {
    throw handleError(error, 'createDeal');
  }
}

/**
 * Duplicate a deal by copying all fields except id, created_at, updated_at
 * Sets the stage to the first stage of the same pipeline
 * @param deal - The deal to duplicate
 * @returns The duplicated deal
 */
export async function duplicateDeal(deal: Deal): Promise<Deal> {
  try {
    // Get pipeline ID from the original deal's stage
    const pipelineId = await getPipelineIdFromStageId(deal.stage_id);
    if (!pipelineId) {
      throw new Error("Could not find pipeline for the original deal's stage");
    }

    // Get first stage from the same pipeline
    const firstStageId = await getFirstStageIdFromPipeline(pipelineId);
    if (!firstStageId) {
      throw new Error("Could not find first stage in the pipeline");
    }

    // Get current user for created_by
    const { user } = useAuthStore.getState();

    // Create new deal with copied fields
    const duplicatedDeal = await createDeal({
      title: `${deal.title} (Copy)`,
      company_id: deal.company_id,
      contact_id: deal.contact_id ?? null,
      stage_id: firstStageId, // Set to first stage
      position: 0, // Will be set by backend
      currency: deal.currency,
      expected_value_minor: deal.expected_value_minor,
      close_date: deal.close_date ?? null,
      probability: deal.probability ?? null,
      owner_user_id: deal.owner_user_id ?? null,
      created_by: user?.id ?? null,
    });

    logger.debug(`[duplicateDeal] Duplicated deal ${deal.id} to ${duplicatedDeal.id}`);
    return duplicatedDeal;
  } catch (error) {
    logger.error(`[duplicateDeal] Failed to duplicate deal ${deal.id}:`, error);
    throw handleError(error, 'duplicateDeal');
  }
}

export async function rpcReorderDeal(dealId: string, newStageId: string, newIndex: number) {
  if (USE_MOCKS) {
    // Mock implementation for now
    const { mockDeals } = await import("./mockData");
    const deal = mockDeals.find(d => d.id === dealId);
    if (deal) {
      // Note: Mock data structure doesn't match the Deal type exactly
      // In real implementation, this would update stage_id and position
      (deal as any).stageId = newStageId;
    }
    return;
  }

  try {
    logger.debug("[rpcReorderDeal] 🚀 MOVING DEAL:", {
      dealId,
      newStageId,
      newIndex,
      note: newIndex === -1 ? "⬇️ Will append to END of target stage" : `📍 Will insert at position ${newIndex}`
    });

    const response = await apiClient.post("/rpc/reorder_deal", {
      p_deal: dealId,
      p_new_stage: newStageId,
      p_new_index: newIndex
    });

    logger.debug("[rpcReorderDeal] ✅ Move completed successfully:", {
      status: response.status,
      data: response.data
    });

    if (response.status !== 200 && response.status !== 204) {
      throw new Error(`Failed to reorder deal: ${response.status}`);
    }
  } catch (error) {
    logger.error("[rpcReorderDeal] ❌ Move FAILED:", error);
    throw handleError(error, `rpcReorderDeal(${dealId})`);
  }
}

export function useDeals(params: {
  page?: number;
  limit?: number;
  q?: string;
  stage_id?: string;
  company_id?: string;
} = {}) {
  const cacheConfig = getEntityCacheConfig('deals');
  return useQuery({
    queryKey: qk.deals(params),
    queryFn: () => fetchDeals(params),
    ...cacheConfig,
    ...defaultQueryOptions,
  });
}

export function useDeal(id: string) {
  const cacheConfig = getEntityCacheConfig('deal');
  return useQuery({
    queryKey: qk.deal(id),
    queryFn: () => fetchDeal(id),
    enabled: !!id && isValidUuid(id),
    ...cacheConfig,
    ...defaultQueryOptions,
    // Don't retry on "not found" errors - these are expected for orphaned references
    retry: (failureCount, error) => {
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
          return false;
        }
      }
      // Use default retry behavior for other errors
      return failureCount < 2;
    },
    // Reduce refetching for not-found deals
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Deal> }) => updateDeal(id, patch),
    onMutate: async ({ id, patch }) => {
      // Cancel any outgoing refetches
      await qc.cancelQueries({ queryKey: qk.deals() });
      await qc.cancelQueries({ queryKey: qk.deal(id) });

      // Snapshot the previous value
      const previousDeals = qc.getQueryData(qk.deals());
      const previousDeal = qc.getQueryData(qk.deal(id));

      // Optimistically update to the new value
      qc.setQueryData(qk.deals(), (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((deal: Deal) =>
            deal.id === id ? { ...deal, ...patch } : deal
          )
        };
      });

      qc.setQueryData(qk.deal(id), (old: any) => {
        if (!old) return old;
        return { ...old, ...patch };
      });

      // Return a context object with the snapshotted value
      return { previousDeals, previousDeal };
    },
    onError: (_err, { id }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousDeals) {
        qc.setQueryData(qk.deals(), context.previousDeals);
      }
      if (context?.previousDeal) {
        qc.setQueryData(qk.deal(id), context.previousDeal);
      }
    },
    onSuccess: () => {
      // Activity logging is handled in the component
    },
    onSettled: (_data, _error, { id }) => {
      // Use optimized invalidation
      invalidateDealQueries(qc, id);
    },
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteDeal,
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await qc.cancelQueries({ queryKey: qk.deals() });

      // Snapshot the previous value
      const previousDeals = qc.getQueryData(qk.deals());

      // Optimistically remove the deal
      qc.setQueryData(qk.deals(), (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((deal: Deal) => deal.id !== id)
        };
      });

      // Return a context object with the snapshotted value
      return { previousDeals };
    },
    onError: (_err, id, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousDeals) {
        qc.setQueryData(qk.deals(), context.previousDeals);
      }
    },
    onSuccess: () => {
      // Activity logging is handled in the component
    },
    onSettled: (_data, _error, id) => {
      // Use optimized invalidation
      invalidateDealQueries(qc, id);
      // Invalidate tasks queries since task references have been cleaned up
      qc.invalidateQueries({ queryKey: qk.tasks.all() });
    },
  });
}

export function useRestoreDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: restoreDeal,
    onSuccess: (_, id) => {
      invalidateDealQueries(qc, id);
    },
  });
}

export function useDeletedDeals() {
  return useQuery({
    queryKey: ['deleted-deals'],
    queryFn: () => fetchDeletedDeals(50)
  });
}

export function useMoveDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dealId, stageId, index }: { dealId: string; stageId: string; index: number }) => {
      logger.debug("[useMoveDeal] mutationFn called with:", { dealId, stageId, index });
      return rpcReorderDeal(dealId, stageId, index);
    },
    onSuccess: (_data, variables) => {
      logger.debug("[useMoveDeal] Mutation succeeded, invalidating queries for deal:", variables.dealId);
      qc.invalidateQueries({ queryKey: qk.deals() });
      // Invalidate any stage summary hooks if they exist
      qc.invalidateQueries({ queryKey: qk.pipelines() });
    },
    onError: (error: unknown, variables) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("[useMoveDeal] Mutation failed for deal:", variables.dealId, errorMessage);
    }
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDeal,
    onMutate: async (newDeal) => {
      // Cancel any outgoing refetches
      await qc.cancelQueries({ queryKey: qk.deals() });
      
      // If deal has company_id, also cancel company deals query
      if (newDeal.company_id) {
        await qc.cancelQueries({ queryKey: qk.companyDeals(newDeal.company_id) });
      }

      // Snapshot the previous values
      const previousDeals = qc.getQueryData(qk.deals());
      const previousCompanyDeals = newDeal.company_id 
        ? qc.getQueryData(qk.companyDeals(newDeal.company_id))
        : undefined;

      // Optimistically create a temporary deal object
      // We'll use a placeholder until we get the real response
      // Note: We need to ensure company_id is not null for Deal type
      if (!newDeal.company_id) {
        // If no company_id, we can't create optimistic deal for company deals
        // Just return context without optimistic update
        return { previousDeals, previousCompanyDeals: undefined, companyId: undefined };
      }

      const optimisticDeal: Deal = {
        id: `temp-${Date.now()}`,
        title: newDeal.title,
        stage_id: newDeal.stage_id,
        company_id: newDeal.company_id, // Required field
        contact_id: newDeal.contact_id || null,
        position: 0,
        currency: newDeal.currency || "DKK",
        expected_value_minor: newDeal.expected_value_minor || 0,
        close_date: newDeal.close_date || null,
        owner_user_id: newDeal.owner_user_id || null,
        probability: null,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Optimistically update deals list
      qc.setQueryData(qk.deals(), (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: [optimisticDeal, ...old.data]
        };
      });

      // Optimistically update company deals if company_id exists
      if (newDeal.company_id) {
        qc.setQueryData(qk.companyDeals(newDeal.company_id), (old: Deal[] | undefined) => {
          if (!old) return [optimisticDeal];
          return [optimisticDeal, ...old];
        });
      }

      // Return context for rollback
      return { previousDeals, previousCompanyDeals, companyId: newDeal.company_id };
    },
    onError: (_err, _newDeal, context) => {
      // Rollback on error
      if (context?.previousDeals) {
        qc.setQueryData(qk.deals(), context.previousDeals);
      }
      if (context?.companyId && context?.previousCompanyDeals) {
        qc.setQueryData(qk.companyDeals(context.companyId), context.previousCompanyDeals);
      }
    },
    onSuccess: (data, variables) => {
      // Replace optimistic deal with real data
      qc.setQueryData(qk.deals(), (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((deal: Deal) => 
            deal.id.startsWith('temp-') && deal.title === variables.title
              ? data
              : deal
          )
        };
      });

      // Update company deals with real data
      if (variables.company_id) {
        qc.setQueryData(qk.companyDeals(variables.company_id), (old: Deal[] | undefined) => {
          if (!old) return [data];
          return old.map((deal: Deal) => 
            deal.id.startsWith('temp-') && deal.title === variables.title
              ? data
              : deal
          );
        });
      }

      // Invalidate to ensure consistency
      qc.invalidateQueries({ queryKey: qk.deals() });
      if (variables.company_id) {
        qc.invalidateQueries({ queryKey: qk.companyDeals(variables.company_id) });
      }

      // Log activity for deal creation
      import("@/services/activity").then(({ logActivity }) => {
        logActivity({
          type: "deal_created",
          dealId: data.id,
          meta: { title: data.title }
        });
      });
    }
  });
}

export function useDuplicateDeal() {
  const qc = useQueryClient();
  return useMutation<Deal, Error, Deal>({
    mutationFn: duplicateDeal,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.deals() });
      // Log activity for deal duplication
      import("@/services/activity").then(({ logActivity }) => {
        logActivity({
          type: "deal_created",
          dealId: data.id,
          meta: {
            title: data.title,
            companyId: data.company_id,
            duplicated: true,
          },
        }).catch((err) => logger.error("Failed to log deal duplication activity", err));
      });
    },
  });
}

// Search function for deals
export async function searchDeals(query: string, companyId?: string): Promise<Array<{ id: string; label: string; subtitle?: string }>> {
  try {
    const result = await fetchDeals({ q: query, limit: 20, company_id: companyId });
    return result.data.map(deal => ({
      id: deal.id,
      label: deal.title
    }));
  } catch (error) {
    handleError(error, 'searchDeals');
    return [];
  }
}
