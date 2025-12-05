import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";

// Types
export interface QuotePublicToken {
  id: string;
  quote_id: string;
  token: string;
  recipient_email: string;
  expires_at: string | null;
  created_at: string;
  last_accessed_at: string | null;
  access_count: number;
}

export interface GenerateTokenRequest {
  quoteId: string;
  recipientEmail: string;
  expiresInDays?: number; // Default: 30 days
}

export interface ValidateTokenResult {
  valid: boolean;
  quoteId: string | null;
  tokenId: string | null; // ID from quote_public_tokens table
  recipientEmail: string | null;
  expired: boolean;
  error?: string;
}

/**
 * Generate a secure token for public quote access
 * Creates a new token record in quote_public_tokens table
 */
export async function generateToken(
  request: GenerateTokenRequest
): Promise<QuotePublicToken> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Generate secure token (UUID v4)
    const token = crypto.randomUUID();

    // Calculate expiration (default: 30 days from now)
    const expiresInDays = request.expiresInDays ?? 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Insert token record
    const { data, error } = await supabase
      .from("quote_public_tokens")
      .insert({
        quote_id: request.quoteId,
        token: token,
        recipient_email: request.recipientEmail,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error("Failed to generate quote token:", error);
      throw new Error(`Failed to generate token: ${error.message}`);
    }

    logger.debug("Generated quote public token:", {
      quoteId: request.quoteId,
      recipientEmail: request.recipientEmail,
      tokenId: data.id,
    });

    return {
      id: data.id,
      quote_id: data.quote_id,
      token: data.token,
      recipient_email: data.recipient_email,
      expires_at: data.expires_at,
      created_at: data.created_at,
      last_accessed_at: data.last_accessed_at,
      access_count: data.access_count,
    };
  } catch (error) {
    logger.error("Error generating quote token:", error);
    throw error;
  }
}

/**
 * Validate a public token and return quote info
 * This function can be called without authentication (public access)
 */
export async function validateToken(token: string): Promise<ValidateTokenResult> {
  try {
    // Use anon client for public access
    const { data, error } = await supabase
      .from("quote_public_tokens")
      .select("id, quote_id, recipient_email, expires_at")
      .eq("token", token)
      .single();

    if (error || !data) {
      return {
        valid: false,
        quoteId: null,
        tokenId: null,
        recipientEmail: null,
        expired: false,
        error: "Invalid token",
      };
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
    const expired = expiresAt ? expiresAt < now : false;

    if (expired) {
      return {
        valid: false,
        quoteId: data.quote_id,
        tokenId: data.id,
        recipientEmail: data.recipient_email,
        expired: true,
        error: "Token has expired",
      };
    }

    // Update last_accessed_at and access_count (async, don't wait)
    // Use RPC function for atomic increment
    supabase
      .rpc('increment_token_access', { token_value: token })
      .then(() => {
        logger.debug("Updated token access info:", { token });
      })
      .catch((err) => {
        logger.warn("Failed to update token access info:", err);
      });

    return {
      valid: true,
      quoteId: data.quote_id,
      tokenId: data.id,
      recipientEmail: data.recipient_email,
      expired: false,
    };
  } catch (error) {
    logger.error("Error validating token:", error);
    return {
      valid: false,
      quoteId: null,
      tokenId: null,
      recipientEmail: null,
      expired: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all tokens for a quote (authenticated users only)
 */
export async function getTokensByQuote(quoteId: string): Promise<QuotePublicToken[]> {
  try {
    const { data, error } = await supabase
      .from("quote_public_tokens")
      .select("*")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Failed to fetch tokens:", error);
      throw new Error(`Failed to fetch tokens: ${error.message}`);
    }

    return (data || []).map((token) => ({
      id: token.id,
      quote_id: token.quote_id,
      token: token.token,
      recipient_email: token.recipient_email,
      expires_at: token.expires_at,
      created_at: token.created_at,
      last_accessed_at: token.last_accessed_at,
      access_count: token.access_count,
    }));
  } catch (error) {
    logger.error("Error fetching tokens:", error);
    throw error;
  }
}

/**
 * Revoke a token (set expiration to now)
 */
export async function revokeToken(tokenId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase
      .from("quote_public_tokens")
      .update({
        expires_at: new Date().toISOString(),
      })
      .eq("id", tokenId);

    if (error) {
      logger.error("Failed to revoke token:", error);
      throw new Error(`Failed to revoke token: ${error.message}`);
    }

    logger.debug("Revoked token:", { tokenId });
  } catch (error) {
    logger.error("Error revoking token:", error);
    throw error;
  }
}

/**
 * Generate public URL for a token
 */
export function generatePublicUrl(token: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/quote/${token}`;
}

// React Query Hooks
export function useGenerateToken() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: generateToken,
    onSuccess: (data) => {
      // Invalidate tokens query for the quote
      qc.invalidateQueries({ queryKey: ["quote-tokens", data.quote_id] });
    },
  });
}

export function useTokensByQuote(quoteId: string) {
  return useQuery({
    queryKey: ["quote-tokens", quoteId],
    queryFn: () => getTokensByQuote(quoteId),
    enabled: !!quoteId,
  });
}
