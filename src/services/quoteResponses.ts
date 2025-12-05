import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";

// Types
export type ResponseType = "accepted" | "rejected";

export interface QuoteResponse {
  id: string;
  quote_id: string;
  token_id: string | null;
  response_type: ResponseType;
  comment: string | null;
  responded_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface SubmitResponseRequest {
  quoteId: string;
  tokenId?: string | null;
  responseType: ResponseType;
  comment?: string | null;
}

/**
 * Submit a customer response (accept/reject) to a quote
 * This function can be called without authentication (public access)
 */
export async function submitResponse(
  request: SubmitResponseRequest
): Promise<QuoteResponse> {
  try {
    // Get IP address and user agent
    const ipAddress = await getClientIpAddress();
    const userAgent = navigator.userAgent;

    // Anonymize IP address for GDPR compliance
    const anonymizedIp = anonymizeIpAddress(ipAddress);

    // Check if response already exists (one response per quote)
    const { data: existingResponse } = await supabase
      .from("quote_responses")
      .select("id")
      .eq("quote_id", request.quoteId)
      .single();

    if (existingResponse) {
      throw new Error("Quote has already been responded to");
    }

    // Insert response
    const { data, error } = await supabase
      .from("quote_responses")
      .insert({
        quote_id: request.quoteId,
        token_id: request.tokenId || null,
        response_type: request.responseType,
        comment: request.comment || null,
        ip_address: anonymizedIp,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (error) {
      logger.error("Failed to submit response:", error);
      throw new Error(`Failed to submit response: ${error.message}`);
    }

    logger.debug("Submitted quote response:", {
      quoteId: request.quoteId,
      responseType: request.responseType,
    });

    return {
      id: data.id,
      quote_id: data.quote_id,
      token_id: data.token_id,
      response_type: data.response_type,
      comment: data.comment,
      responded_at: data.responded_at,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
    };
  } catch (error) {
    logger.error("Error submitting response:", error);
    throw error;
  }
}

/**
 * Get response for a quote (authenticated users only)
 */
export async function getResponse(
  quoteId: string
): Promise<QuoteResponse | null> {
  try {
    const { data, error } = await supabase
      .from("quote_responses")
      .select("*")
      .eq("quote_id", quoteId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      logger.error("Failed to fetch response:", error);
      throw new Error(`Failed to fetch response: ${error.message}`);
    }

    return {
      id: data.id,
      quote_id: data.quote_id,
      token_id: data.token_id,
      response_type: data.response_type,
      comment: data.comment,
      responded_at: data.responded_at,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
    };
  } catch (error) {
    logger.error("Error fetching response:", error);
    throw error;
  }
}

/**
 * Get client IP address (if available)
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
export function useSubmitResponse() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: submitResponse,
    onSuccess: (data) => {
      // Invalidate response query for the quote
      qc.invalidateQueries({ queryKey: ["quote-response", data.quote_id] });
      // Also invalidate quote query to refresh status
      qc.invalidateQueries({ queryKey: qk.quote(data.quote_id) });
    },
  });
}

export function useQuoteResponse(quoteId: string) {
  return useQuery({
    queryKey: ["quote-response", quoteId],
    queryFn: () => getResponse(quoteId),
    enabled: !!quoteId,
  });
}
