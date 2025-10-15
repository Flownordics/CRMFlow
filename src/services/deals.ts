import { z } from "zod";
import { LineItem } from "@/lib/schemas/lineItem";
import { apiClient, api, apiPostWithReturn, apiPatchWithReturn, normalizeApiData } from "../lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { USE_MOCKS } from "@/lib/debug";
import { syncDealToCalendar, removeDealFromCalendar, DealCalendarEvent } from "@/lib/google-calendar";
import { handleError, createBusinessLogicError, createAPIError } from "@/lib/errorHandler";
import { invalidateDealQueries, createOptimizedQueryClient } from "@/lib/queryCache";
import { logger } from "@/lib/logger";
import { normalizeApiResponse, handleApiError, createMockResponse, handleMockApiCall } from "@/lib/sharedUtils";
import { executeApiWithRecovery, executeCalendarSyncWithRecovery } from "@/lib/errorRecovery";
import { isValidUuid } from "@/lib/validation";

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

// Robust response schema that handles multiple formats
const DealsResponse = z.union([
  z.array(Deal),
  z.object({ data: z.array(Deal), total: z.number().optional(), page: z.number().optional(), limit: z.number().optional(), totalPages: z.number().optional() }),
  z.object({ items: z.array(Deal) }),
  z.object({ results: z.array(Deal) }),
]);

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
    logger.debug("[rpcReorderDeal] Calling API with params:", {
      dealId,
      newStageId,
      newIndex
    });

    const response = await apiClient.post("/rpc/reorder_deal", {
      p_deal: dealId,
      p_new_stage: newStageId,
      p_new_index: newIndex
    });

    logger.debug("[rpcReorderDeal] API response:", {
      status: response.status,
      data: response.data
    });

    if (response.status !== 200 && response.status !== 204) {
      throw new Error(`Failed to reorder deal: ${response.status}`);
    }
  } catch (error) {
    logger.error("[rpcReorderDeal] Error:", error);
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
  return useQuery({
    queryKey: qk.deals(params),
    queryFn: () => fetchDeals(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: qk.deal(id),
    queryFn: () => fetchDeal(id),
    enabled: !!id && isValidUuid(id),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
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
    onError: (err, { id }, context) => {
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
    onSettled: (data, error, { id }) => {
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
    onError: (err, id, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousDeals) {
        qc.setQueryData(qk.deals(), context.previousDeals);
      }
    },
    onSuccess: () => {
      // Activity logging is handled in the component
    },
    onSettled: (data, error, id) => {
      // Use optimized invalidation
      invalidateDealQueries(qc, id);
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
    onSuccess: (data, variables) => {
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
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.deals() });
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
