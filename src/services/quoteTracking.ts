import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Types
export type TrackingEventType = "viewed" | "downloaded" | "accepted" | "rejected";

export interface QuoteTrackingEvent {
  id: string;
  quote_id: string;
  token_id: string | null;
  event_type: TrackingEventType;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface TrackEventRequest {
  quoteId: string;
  tokenId?: string | null;
  eventType: TrackingEventType;
  metadata?: Record<string, any>;
}

export interface TrackingStats {
  views: number;
  downloads: number;
  responses: number;
  firstViewAt: string | null;
  lastAccessAt: string | null;
}

/**
 * Track a quote event (can be called without authentication)
 * This function anonymizes IP addresses for GDPR compliance
 */
export async function trackEvent(request: TrackEventRequest): Promise<void> {
  try {
    // Get IP address and user agent from browser
    const ipAddress = await getClientIpAddress();
    const userAgent = navigator.userAgent;

    // Anonymize IP address (remove last octet for GDPR compliance)
    const anonymizedIp = anonymizeIpAddress(ipAddress);

    // Insert tracking event
    const { error } = await supabase.from("quote_tracking").insert({
      quote_id: request.quoteId,
      token_id: request.tokenId || null,
      event_type: request.eventType,
      ip_address: anonymizedIp,
      user_agent: userAgent,
      metadata: request.metadata || {},
    });

    if (error) {
      logger.error("Failed to track event:", error);
      // Don't throw - tracking failures shouldn't break the UI
      return;
    }

    logger.debug("Tracked quote event:", {
      quoteId: request.quoteId,
      eventType: request.eventType,
    });
  } catch (error) {
    logger.error("Error tracking event:", error);
    // Don't throw - tracking failures shouldn't break the UI
  }
}

/**
 * Get tracking events for a quote (authenticated users only)
 */
export async function getTrackingEvents(
  quoteId: string
): Promise<QuoteTrackingEvent[]> {
  try {
    const { data, error } = await supabase
      .from("quote_tracking")
      .select("*")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Failed to fetch tracking events:", error);
      throw new Error(`Failed to fetch tracking events: ${error.message}`);
    }

    return (data || []).map((event) => ({
      id: event.id,
      quote_id: event.quote_id,
      token_id: event.token_id,
      event_type: event.event_type,
      ip_address: event.ip_address,
      user_agent: event.user_agent,
      metadata: event.metadata || {},
      created_at: event.created_at,
    }));
  } catch (error) {
    logger.error("Error fetching tracking events:", error);
    throw error;
  }
}

/**
 * Get tracking statistics for a quote
 */
export async function getTrackingStats(quoteId: string): Promise<TrackingStats> {
  try {
    const { data, error } = await supabase
      .from("quote_tracking")
      .select("event_type, created_at")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("Failed to fetch tracking stats:", error);
      throw new Error(`Failed to fetch tracking stats: ${error.message}`);
    }

    const events = data || [];
    const views = events.filter((e) => e.event_type === "viewed").length;
    const downloads = events.filter((e) => e.event_type === "downloaded").length;
    const responses = events.filter(
      (e) => e.event_type === "accepted" || e.event_type === "rejected"
    ).length;

    const firstView = events.find((e) => e.event_type === "viewed");
    const lastEvent = events[events.length - 1];

    return {
      views,
      downloads,
      responses,
      firstViewAt: firstView?.created_at || null,
      lastAccessAt: lastEvent?.created_at || null,
    };
  } catch (error) {
    logger.error("Error fetching tracking stats:", error);
    throw error;
  }
}

/**
 * Get client IP address (if available)
 * Note: This may not work in all environments
 */
async function getClientIpAddress(): Promise<string | null> {
  try {
    // Try to get IP from a public IP service (optional)
    // For now, return null - we'll rely on server-side IP detection if needed
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Anonymize IP address for GDPR compliance
 * Removes the last octet of IPv4 addresses
 */
function anonymizeIpAddress(ip: string | null): string | null {
  if (!ip) return null;

  // IPv4: 192.168.1.100 -> 192.168.1.0
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }

  // IPv6: Keep first 64 bits, zero out last 64 bits
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 4) {
      return `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}::`;
    }
  }

  return ip;
}

// React Query Hooks
export function useTrackEvent() {
  return useMutation({
    mutationFn: trackEvent,
    // Don't invalidate queries - tracking is fire-and-forget
  });
}

export function useTrackingEvents(quoteId: string) {
  return useQuery({
    queryKey: ["quote-tracking", quoteId],
    queryFn: () => getTrackingEvents(quoteId),
    enabled: !!quoteId,
  });
}

export function useTrackingStats(quoteId: string) {
  return useQuery({
    queryKey: ["quote-tracking-stats", quoteId],
    queryFn: () => getTrackingStats(quoteId),
    enabled: !!quoteId,
  });
}

// Extended tracking event with quote and company info
export interface TrackingEventWithQuote extends QuoteTrackingEvent {
  quote_number: string | null;
  company_id: string | null;
  company_name: string | null;
}

/**
 * Get recent tracking events across all quotes with company information
 */
export async function getRecentTrackingEventsWithQuote(limit: number = 10): Promise<TrackingEventWithQuote[]> {
  try {
    // Fetch recent tracking events
    const { data: events, error: eventsError } = await supabase
      .from("quote_tracking")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (eventsError) {
      logger.error("Failed to fetch tracking events:", eventsError);
      throw new Error(`Failed to fetch tracking events: ${eventsError.message}`);
    }

    if (!events || events.length === 0) {
      return [];
    }

    // Get unique quote IDs
    const quoteIds = [...new Set(events.map((e: any) => e.quote_id))];

    // Batch fetch quotes with company info
    const quoteData: Record<string, { number: string | null; company_id: string | null }> = {};
    if (quoteIds.length > 0) {
      const { data: quotesData } = await supabase
        .from("quotes")
        .select("id, number, company_id")
        .in("id", quoteIds);

      quotesData?.forEach((quote) => {
        quoteData[quote.id] = { number: quote.number, company_id: quote.company_id };
      });
    }

    // Get unique company IDs
    const companyIds = new Set<string>();
    Object.values(quoteData).forEach((quote) => {
      if (quote.company_id) {
        companyIds.add(quote.company_id);
      }
    });

    // Batch fetch company names
    const companyData: Record<string, string> = {};
    if (companyIds.size > 0) {
      const { data: companies } = await supabase
        .from("companies")
        .select("id, name")
        .in("id", Array.from(companyIds));

      companies?.forEach((company) => {
        companyData[company.id] = company.name;
      });
    }

    // Map events with quote and company info
    const eventsWithQuote: TrackingEventWithQuote[] = events.map((event: any) => {
      const quote = quoteData[event.quote_id];
      const companyId = quote?.company_id || null;
      const companyName = companyId && companyData[companyId] ? companyData[companyId] : null;

      return {
        id: event.id,
        quote_id: event.quote_id,
        token_id: event.token_id,
        event_type: event.event_type,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        metadata: event.metadata || {},
        created_at: event.created_at,
        quote_number: quote?.number || null,
        company_id: companyId,
        company_name: companyName,
      };
    });

    return eventsWithQuote;
  } catch (error) {
    logger.error("Error in getRecentTrackingEventsWithQuote:", error);
    throw error;
  }
}

// React Query hook for recent tracking events with quote info
export function useRecentTrackingEventsWithQuote(limit: number = 10) {
  return useQuery({
    queryKey: ["quote-tracking", "recent", limit],
    queryFn: () => getRecentTrackingEventsWithQuote(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
