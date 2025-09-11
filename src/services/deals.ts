import { z } from "zod";
import { LineItem } from "@/lib/schemas/lineItem";
import { apiClient, api, apiPostWithReturn, normalizeApiData } from "../lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { USE_MOCKS } from "@/lib/debug";
import { syncDealToCalendar, removeDealFromCalendar, DealCalendarEvent } from "@/lib/google-calendar";

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
} = {}) {
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
    console.error("Failed to fetch deals:", error);
    throw new Error("Failed to fetch deals");
  }
}

export async function fetchDeal(id: string) {
  if (USE_MOCKS) {
    // For now, return mock data
    const { mockDeals } = await import("./mockData");
    const deal = mockDeals.find(d => d.id === id);
    if (!deal) throw new Error("Deal not found");
    return deal;
  }

  try {
    const response = await apiClient.get(`/deals?id=eq.${id}&select=*`);
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
    console.error(`Failed to fetch deal ${id}:`, error);
    throw new Error("Failed to fetch deal");
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
    const response = await apiClient.patch(`/deals?id=eq.${id}`, updates);
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
    console.error("Failed to update deal:", error);
    throw new Error("Failed to update deal");
  }
}

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
    await apiClient.delete(`/deals?id=eq.${id}`);
  } catch (error) {
    console.error("Failed to delete deal:", error);
    throw new Error("Failed to delete deal");
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
    const response = await apiClient.patch(`/deals?id=eq.${dealId}`, {
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
    console.error("Failed to set deal owner:", error);
    throw new Error("Failed to set deal owner");
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
    console.error("Failed to sync deal to calendar:", error);
    throw error;
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
    console.error("Failed to remove deal from calendar:", error);
    throw error;
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
    const response = await apiClient.patch(`/deals?id=eq.${id}`, { stage_id });
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
    console.error(`Failed to move deal ${id} to stage ${stage_id}:`, error);
    throw new Error("Failed to move deal stage");
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
    console.error("Failed to create deal:", error);
    throw new Error("Failed to create deal");
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
    const response = await apiClient.post("/rpc/reorder_deal", {
      p_deal: dealId,
      p_new_stage: newStageId,
      p_new_index: newIndex
    });

    if (response.status !== 200 && response.status !== 204) {
      throw new Error(`Failed to reorder deal: ${response.status}`);
    }
  } catch (error) {
    console.error(`Failed to reorder deal ${dealId}:`, error);
    throw new Error("Failed to reorder deal");
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
    queryFn: () => fetchDeals(params)
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: qk.deal(id),
    queryFn: () => fetchDeal(id),
    enabled: !!id,
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
      // Always refetch after error or success
      qc.invalidateQueries({ queryKey: qk.deals() });
      qc.invalidateQueries({ queryKey: qk.deal(id) });
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
    onSettled: () => {
      // Always refetch after error or success
      qc.invalidateQueries({ queryKey: qk.deals() });
    },
  });
}

export function useMoveDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dealId, stageId, index }: { dealId: string; stageId: string; index: number }) => {
      return rpcReorderDeal(dealId, stageId, index);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.deals() });
      // Invalidate any stage summary hooks if they exist
      qc.invalidateQueries({ queryKey: qk.pipelines() });
    },
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
export async function searchDeals(query: string): Promise<Array<{ id: string; label: string; subtitle?: string }>> {
  try {
    const result = await fetchDeals({ q: query, limit: 20 });
    return result.data.map(deal => ({
      id: deal.id,
      label: deal.title,
      subtitle: deal.company_name ? `(${deal.company_name})` : undefined
    }));
  } catch (error) {
    console.error("Failed to search deals:", error);
    return [];
  }
}
