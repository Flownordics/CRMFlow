import { api, apiClient } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { z } from "zod";
import { USE_MOCKS } from "@/lib/debug";

// Activity schema
export const Activity = z.object({
  id: z.string(), // Allow any string, not just UUID
  type: z.string(),
  dealId: z.string().uuid().nullable(), // Allow null for dealId (e.g., when deal is deleted)
  userId: z.string().uuid().nullable(), // Allow null for userId
  meta: z.record(z.any()).optional(),
  createdAt: z.string(),
});

export type Activity = z.infer<typeof Activity>;

// Activity create schema
export const ActivityCreate = z.object({
  type: z.string(),
  dealId: z.string().uuid().nullable(), // Allow null for dealId (e.g., when deal is deleted)
  meta: z.record(z.any()).optional(),
});

export type ActivityCreate = z.infer<typeof ActivityCreate>;

// Log activity
export async function logActivity(activity: ActivityCreate): Promise<Activity> {
  if (USE_MOCKS) {
    const { data } = await api.post("/activities", activity);
    return Activity.parse(data);
  }

  try {
    // Convert camelCase to snake_case for database
    const dbActivity = {
      type: activity.type,
      deal_id: activity.dealId, // Can be null for deleted deals
      user_id: null, // Will be set by database trigger or default
      meta: activity.meta
    };

    const response = await apiClient.post("/activities", dbActivity);

    console.log("🔍 Activity API Response:", response);
    console.log("🔍 Response status:", response.status);

    // Handle 201 Created with empty response body (like companies)
    let result;
    if (response.status === 201 && (!response.data || response.data === "")) {
      // For 201 responses, we need to fetch the created activity
      // Since we don't have an ID yet, we'll create a fallback response
      result = {
        id: `temp_${Date.now()}`, // Temporary ID
        type: dbActivity.type,
        deal_id: dbActivity.deal_id,
        user_id: dbActivity.user_id,
        meta: dbActivity.meta,
        created_at: new Date().toISOString()
      };
    } else {
      result = response.data || response;
    }

    // Convert snake_case response back to camelCase for Zod schema
    const camelCaseResult = {
      id: result.id,
      type: result.type,
      dealId: result.deal_id,
      userId: result.user_id,
      meta: result.meta,
      createdAt: result.created_at
    };

    console.log("🔍 CamelCase Result:", camelCaseResult);

    return Activity.parse(camelCaseResult);
  } catch (error) {
    console.error("Failed to log activity:", error);

    // Fallback: log to console as a structured log
    const fallbackActivity = {
      id: `fallback_${Date.now()}`,
      type: activity.type,
      dealId: activity.dealId,
      userId: 'unknown',
      meta: activity.meta,
      createdAt: new Date().toISOString(),
      _fallback: true
    };

    console.log("📝 Activity Log (Fallback):", {
      timestamp: fallbackActivity.createdAt,
      type: fallbackActivity.type,
      dealId: fallbackActivity.dealId,
      meta: fallbackActivity.meta,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Return fallback activity for consistency
    return fallbackActivity as Activity;
  }
}

// Fetch activities for a deal
export async function fetchActivities(dealId: string): Promise<Activity[]> {
  if (USE_MOCKS) {
    const { data } = await api.get("/activities", { params: { dealId } });
    return z.array(Activity).parse(data);
  }

  try {
    const response = await apiClient.get(`/activities?deal_id=eq.${dealId}`);
    const activities = response.data || response;

    // Convert snake_case responses back to camelCase for Zod schema
    const camelCaseActivities = activities.map((activity: any) => ({
      id: activity.id,
      type: activity.type,
      dealId: activity.deal_id,
      userId: activity.user_id,
      meta: activity.meta,
      createdAt: activity.created_at
    }));

    return z.array(Activity).parse(camelCaseActivities);
  } catch (error) {
    console.error(`Failed to fetch activities for deal ${dealId}:`, error);

    // Return empty array on error to prevent UI crashes
    return [];
  }
}

// React Query hooks
export function useActivities(dealId: string | null) {
  return useQuery({
    queryKey: qk.activities({ dealId: dealId || '' }),
    queryFn: () => dealId ? fetchActivities(dealId) : Promise.resolve([]),
    enabled: !!dealId,
    // Retry with exponential backoff for activity fetching
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false;
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useLogActivity() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: logActivity,
    onSuccess: (activity) => {
      // Invalidate activities for the specific deal
      if (activity.dealId) {
        qc.invalidateQueries({ queryKey: qk.activities({ dealId: activity.dealId }) });
        // Also invalidate the deal to refresh any activity counts
        qc.invalidateQueries({ queryKey: qk.deal(activity.dealId) });
      }
    },
    onError: (error) => {
      // Error is already handled in logActivity function
      console.error("Activity logging failed:", error);
    }
  });
}

// Helper functions for specific activity types
export function logDealUpdated(id: string, changed: string[]) {
  return logActivity({
    type: "deal_updated",
    dealId: id,
    meta: { changed }
  });
}

export function logDealDeleted(id: string) {
  return logActivity({
    type: "deal_deleted",
    dealId: null, // Don't reference deleted deal
    meta: { deletedDealId: id }
  });
}

export function logEmailSent(quoteId: string, dealId?: string, to?: string, provider?: string) {
  return logActivity({
    type: "email_sent",
    dealId: dealId ?? null,
    meta: { quoteId, to, provider }
  });
}

// Enhanced email logging helper
export async function logEmailSentEnhanced(entity: "quote", entityId: string, meta: any) {
  return logActivity({
    type: "email_sent",
    dealId: meta.dealId || null,
    meta: { entity, entityId, ...meta }
  });
}

// Calendar event activity logging
export async function logEventActivity(kind: "created" | "updated" | "deleted", eventId: string, meta?: any) {
  return logActivity({
    type: `calendar_${kind}`,
    dealId: meta?.dealId || null,
    meta: { eventId, ...(meta || {}) }
  });
}

export async function logPdfGenerated(entity: "quote" | "order" | "invoice", id: string, dealId?: string, url?: string) {
  return logActivity({
    type: "pdf_generated",
    dealId: dealId ?? null,
    meta: { entity, id, url },
  });
}
