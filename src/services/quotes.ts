import { apiClient, normalizeApiData } from "@/lib/api";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";

// Adapter functions for DB ↔ UI conversion
const lineDbToUi = (l: any) => ({
  id: l.id || `temp_${Date.now()}_${Math.random()}`,
  description: l.description,
  qty: Number(l.qty ?? 0),
  unitMinor: Number(l.unit_minor ?? 0),
  taxRatePct: Number(l.tax_rate_pct ?? 0),
  discountPct: Number(l.discount_pct ?? 0),
  lineTotalMinor: Number(l.line_total_minor ?? (Number(l.qty ?? 0) * Number(l.unit_minor ?? 0))),
  sku: l.sku ?? null,
});

const lineUiToDb = (l: any) => ({
  id: l.id,
  description: l.description,
  qty: l.qty,
  unit_minor: l.unitMinor,
  tax_rate_pct: l.taxRatePct ?? 0,
  discount_pct: l.discountPct ?? 0,
  sku: l.sku ?? null,
});

const quoteDbToUi = (q: any) => ({
  ...q,
  lines: Array.isArray(q.lines) ? q.lines.map(lineDbToUi) : [],
});

const quoteUiToDb = (q: any) => ({
  ...q,
  lines: Array.isArray(q.lines) ? q.lines.map(lineUiToDb) : [],
});

// UI Types (camelCase)
export type QuoteLineUI = {
  id: string;
  description: string;
  qty: number;
  unitMinor: number;
  taxRatePct: number;
  discountPct: number;
  lineTotalMinor: number;
  sku?: string | null;
};

export type QuoteUI = {
  id: string;
  number?: string | null;
  status: "draft" | "sent" | "accepted" | "declined" | "expired";
  currency: "DKK" | "EUR" | "USD";
  issue_date?: string | null;
  valid_until?: string | null;
  notes?: string | null;
  deal_id?: string | null;
  company_id: string;
  contact_id?: string | null;
  subtotal_minor: number;
  tax_minor: number;
  total_minor: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  lines: QuoteLineUI[];
};

// Schemas
export const QuoteLine = z.object({
  id: z.string(),
  sku: z.string().optional().nullable(),
  description: z.string(),
  qty: z.number(), // e.g. 1.00
  unitMinor: z.number().int().nonnegative(), // 19900 = 199.00 DKK
  taxRatePct: z.number().default(25), // 25 (DK)
  discountPct: z.number().default(0), // 0..100
  lineTotalMinor: z.number().int().nonnegative(),
});

export const Quote = z.object({
  id: z.string(),
  number: z.string().nullable().optional(),
  status: z.enum(["draft", "sent", "accepted", "declined", "expired"]),
  currency: z.string().default("DKK"),
  issue_date: z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  company_id: z.string().nullable().optional(),
  contact_id: z.string().nullable().optional(),
  deal_id: z.string().nullable().optional(), // Link to source Deal
  subtotal_minor: z.number().int().nonnegative().default(0),
  tax_minor: z.number().int().nonnegative().default(0),
  total_minor: z.number().int().nonnegative().default(0),
  created_by: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  lines: z.array(QuoteLine).optional().default([]),
});
export type Quote = z.infer<typeof Quote>;
export type QuoteLine = z.infer<typeof QuoteLine>;

// API
export async function fetchQuotes(params: {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  company_id?: string;
} = {}): Promise<{ data: QuoteUI[]; total: number }> {
  const { page = 1, limit = 20, q = "", status, company_id } = params;

  try {
    // Build query string for filtering
    const queryParams = new URLSearchParams();
    // Supabase uses offset instead of page for pagination
    const offset = (page - 1) * limit;
    queryParams.append('offset', offset.toString());
    queryParams.append('limit', limit.toString());

    // Supabase uses 'search' for text search, not 'q'
    if (q) queryParams.append('search', q);

    // Apply company filter if provided
    if (company_id) {
      queryParams.append('company_id', `eq.${company_id}`);
    }

    // Apply status filter if provided, otherwise exclude accepted quotes
    if (status) {
      queryParams.append('status', `eq.${status}`);
    } else {
      // Always exclude accepted quotes since they become orders
      queryParams.append('status', `neq.accepted`);
    }

    const url = `/quotes?${queryParams.toString()}`;
    const response = await apiClient.get(url);
    const raw = response.data;

    if (typeof raw === "string") {
      throw new Error("[quotes] Non-JSON response. Check Network: status/content-type/om der er redirect.");
    }

    // Handle both array and paginated response formats
    let quotes: Quote[];
    let total = 0;

    if (Array.isArray(raw)) {
      quotes = raw;
      total = raw.length;
    } else if (raw && typeof raw === 'object' && 'data' in raw) {
      quotes = Array.isArray(raw.data) ? raw.data : [];
      total = raw.total || quotes.length;
    } else {
      quotes = [];
      total = 0;
    }

    // Convert each quote from DB format to UI format
    const uiQuotes = quotes.map(quote => quoteDbToUi(quote));

    return {
      data: uiQuotes as QuoteUI[],
      total
    };
  } catch (error) {
    console.error("Failed to fetch quotes:", error);
    throw new Error("Failed to fetch quotes");
  }
}

// Get counts for all quote statuses (excluding accepted quotes since they become orders)
export async function fetchQuoteStatusCounts(): Promise<Record<string, number>> {
  try {
    const response = await apiClient.get('/quotes?select=status');
    const raw = response.data;

    if (typeof raw === "string") {
      throw new Error("[quotes] Non-JSON response. Check Network: status/content-type/om der er redirect.");
    }

    const quotes = Array.isArray(raw) ? raw : [];

    // Count quotes by status (excluding accepted quotes)
    const counts: Record<string, number> = {
      draft: 0,
      sent: 0,
      declined: 0,
      expired: 0,
    };

    quotes.forEach(quote => {
      // Skip accepted quotes since they become orders
      if (quote.status === "accepted") {
        return;
      }

      if (quote.status && counts.hasOwnProperty(quote.status)) {
        counts[quote.status]++;
      }
    });

    return counts;
  } catch (error) {
    console.error("Failed to fetch quote status counts:", error);
    return {
      draft: 0,
      sent: 0,
      declined: 0,
      expired: 0,
    };
  }
}

export async function fetchQuote(id: string): Promise<QuoteUI> {
  try {
    console.log(`[fetchQuote] Fetching quote with ID: ${id}`);

    // Fetch the quote first
    const response = await apiClient.get(`/quotes?id=eq.${id}`);

    console.log("[fetchQuote] API Response:", {
      status: response.status,
      data: response.data,
      dataLength: response.data?.length,
      isArray: Array.isArray(response.data)
    });

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const quote = response.data[0];

      console.log("[fetchQuote] Raw quote data:", quote);

      // Fetch line items for this quote
      try {
        console.log("[fetchQuote] Fetching line items for quote:", quote.id);
        const lineItemsUrl = `/line_items?parent_type=eq.quote&parent_id=eq.${quote.id}&order=position.asc`;
        const linesResponse = await apiClient.get(lineItemsUrl);

        if (linesResponse.data && Array.isArray(linesResponse.data)) {
          console.log("[fetchQuote] Lines fetched:", linesResponse.data);
          quote.lines = linesResponse.data;
        } else {
          console.log("[fetchQuote] No line items found");
          quote.lines = [];
        }
      } catch (linesError: any) {
        console.log("[fetchQuote] Failed to fetch line items:", linesError.message);
        quote.lines = [];
      }

      console.log("[fetchQuote] Quote after processing lines:", quote);

      try {
        // Convert DB format to UI format using adapter
        const uiQuote = quoteDbToUi(quote);
        console.log("[fetchQuote] Successfully converted to UI format:", uiQuote);
        return uiQuote as QuoteUI;
      } catch (parseError: any) {
        console.error("[fetchQuote] Conversion error:", parseError);
        console.error("[fetchQuote] Quote that failed to convert:", quote);
        throw new Error(`Failed to convert quote: ${parseError.message}`);
      }
    }

    console.log("[fetchQuote] No quote found in response");
    throw new Error(`Quote with ID ${id} not found`);
  } catch (error: any) {
    console.error("[fetchQuote] Failed to fetch quote:", error.message);
    throw new Error(`Failed to fetch quote: ${error.message}`);
  }
}

export async function updateQuoteHeader(
  id: string,
  payload: Partial<
    Pick<Quote, "issue_date" | "valid_until" | "notes" | "status">
  >,
) {
  const response = await apiClient.patch(`/quotes?id=eq.${id}`, payload);
  const raw = normalizeApiData(response);

  if (typeof raw === "string") {
    throw new Error("[quote] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
  }

  // PostgREST returns arrays, so we need to handle that
  const quoteData = Array.isArray(raw) ? raw[0] : raw;

  if (!quoteData) {
    // If no data returned (204 response), fetch the updated quote
    console.log("[updateQuoteHeader] No data in response, fetching updated quote");
    return await fetchQuote(id);
  }

  return quoteDbToUi(quoteData) as QuoteUI;
}

export async function upsertQuoteLine(
  quoteId: string,
  line: Partial<QuoteLineUI> & { id?: string },
) {
  // Convert UI format to DB format
  const dbLine = lineUiToDb(line);

  // If line.id exists → PATCH; else → POST
  if (dbLine.id) {
    const response = await apiClient.patch(
      `/line_items?id=eq.${dbLine.id}`,
      dbLine,
    );
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[line_item] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
    }

    // PostgREST returns arrays, so we need to handle that
    const lineData = Array.isArray(raw) ? raw[0] : raw;

    if (!lineData) {
      throw new Error("[line_item] No line data returned from API");
    }

    return lineDbToUi(lineData);
  } else {
    const response = await apiClient.post(`/line_items`, {
      ...dbLine,
      parent_type: 'quote',
      parent_id: quoteId,
    });
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[line_item] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
    }

    // PostgREST returns arrays, so we need to handle that
    const lineData = Array.isArray(raw) ? raw[0] : raw;

    if (!lineData) {
      throw new Error("[line_item] No line data returned from API");
    }

    return lineDbToUi(lineData);
  }
}

export async function deleteQuoteLine(quoteId: string, lineId: string) {
  await apiClient.delete(`/line_items?id=eq.${lineId}`);
  return { ok: true };
}

export async function createQuote(payload: {
  number?: string;
  status: string;
  currency: string;
  issue_date: string;
  valid_until?: string | null;
  notes?: string;
  company_id: string;
  contact_id?: string | null;
  deal_id?: string | null;
  subtotal_minor: number;
  tax_minor: number;
  total_minor: number;
  lines: Array<{
    description: string;
    qty: number;
    unit_minor: number;
    tax_rate_pct: number;
    discount_pct: number;
  }>;
}): Promise<QuoteUI> {
  console.log("[createQuote] Starting createQuote with payload:", {
    ...payload,
    linesCount: payload.lines?.length || 0,
    lines: payload.lines?.map(l => ({ description: l.description, qty: l.qty, unit_minor: l.unit_minor }))
  });
  try {
    // Extract lines from payload since quotes table doesn't have lines column
    const { lines, ...quotePayload } = payload;

    // Remove empty number field to let API generate it automatically
    if (!quotePayload.number || quotePayload.number.trim() === '') {
      delete quotePayload.number;
    }

    console.log("[createQuote] Sending payload:", quotePayload);

    // Create the quote first (without line items)
    const response = await apiClient.post("/quotes", quotePayload);

    console.log("[createQuote] API Response:", {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers,
      location: response.headers?.location,
      hasData: !!response.data,
      hasLocation: !!response.headers?.location,
      payloadSent: quotePayload
    });

    let quote: Quote | undefined;

    // Handle different response scenarios
    if (response.status === 201) {
      if (response.data && response.data.id) {
        // Response contains the created quote data
        quote = Quote.parse(response.data);
      } else if (response.headers?.location) {
        // Response has location header, fetch the quote
        const location = response.headers.location;
        const quoteId = location.split('/').pop();
        if (quoteId) {
          quote = await fetchQuote(quoteId);
        } else {
          throw new Error("Invalid location header format");
        }
      } else {
        // Supabase returns 201 with empty body - we need to find the created quote
        console.log("[createQuote] 201 response with no data, attempting to find created quote...");

        // Try to find the quote by deal_id and recent timestamp
        if (quotePayload.deal_id) {
          try {
            console.log("[createQuote] Searching for quote by deal_id:", quotePayload.deal_id);

            // Get the most recent quote for this deal
            const searchResponse = await apiClient.get(`/quotes?deal_id=eq.${quotePayload.deal_id}&order=created_at.desc&limit=1`);

            if (searchResponse.data && searchResponse.data.length > 0) {
              const foundQuote = searchResponse.data[0];
              console.log("[createQuote] Found created quote:", foundQuote.id);
              quote = Quote.parse(foundQuote);
            } else {
              console.log("[createQuote] No quote found for deal_id:", quotePayload.deal_id);
            }
          } catch (searchError) {
            console.log("[createQuote] Error searching for quote:", searchError);
          }
        }

        // If still no quote, try to find by company_id and recent timestamp
        if (!quote && quotePayload.company_id) {
          try {
            console.log("[createQuote] Searching for quote by company_id:", quotePayload.company_id);

            // Get the most recent quote for this company
            const searchResponse = await apiClient.get(`/quotes?company_id=eq.${quotePayload.company_id}&order=created_at.desc&limit=1`);

            if (searchResponse.data && searchResponse.data.length > 0) {
              const foundQuote = searchResponse.data[0];
              console.log("[createQuote] Found created quote:", foundQuote.id);
              quote = Quote.parse(foundQuote);
            } else {
              console.log("[createQuote] No quote found for company_id:", quotePayload.company_id);
            }
          } catch (searchError) {
            console.log("[createQuote] Error searching for quote:", searchError);
          }
        }

        // If still no quote, we can't proceed
        if (!quote) {
          throw new Error("Failed to create quote: could not find created quote in database");
        }
      }
    } else {
      // Handle other status codes
      quote = Quote.parse(response.data || response);
    }

    // Ensure quote is defined before proceeding
    if (!quote) {
      throw new Error("Failed to create or retrieve quote from API response");
    }

    // Always create line items if we have them (all quotes are now real)
    if (lines && lines.length > 0) {
      console.log("[createQuote] Creating line items for quote:", quote.id);

      for (const line of lines) {
        try {
          const linePayload = {
            parent_type: 'quote' as const,
            parent_id: quote.id,
            description: line.description,
            qty: line.qty,
            unit_minor: line.unit_minor,
            tax_rate_pct: line.tax_rate_pct ?? 0,
            discount_pct: line.discount_pct ?? 0,
            position: lines.indexOf(line), // Add position for ordering
          };

          console.log("[createQuote] Creating line item:", linePayload);
          await apiClient.post(`/line_items`, linePayload);
          console.log("[createQuote] Line item created successfully");
        } catch (lineError: any) {
          console.error("[createQuote] Failed to create line item:", lineError);
          // Continue with other lines even if one fails
        }
      }

      // Don't call fetchQuote again if we already have the quote data
      // Just return the quote with the lines we just created
      return quoteDbToUi(quote) as QuoteUI;
    }

    // Return the quote without lines if it's temporary or no lines
    return quoteDbToUi(quote) as QuoteUI;
  } catch (error) {
    console.error("Failed to create quote:", error);
    throw new Error("Failed to create quote");
  }
}

// Hooks
export function useQuotes(params: {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  company_id?: string;
} = {}) {
  return useQuery<{ data: QuoteUI[]; total: number }>({
    queryKey: qk.quotes(params),
    queryFn: () => fetchQuotes(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useQuoteStatusCounts() {
  return useQuery<Record<string, number>>({
    queryKey: qk.quoteStatusCounts(),
    queryFn: () => fetchQuoteStatusCounts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useQuote(id: string) {
  return useQuery<QuoteUI>({
    queryKey: qk.quote(id),
    queryFn: () => fetchQuote(id),
    enabled: !!id,
  });
}

export function useUpdateQuoteHeader(id: string) {
  const qc = useQueryClient();
  return useMutation<QuoteUI, Error, Parameters<typeof updateQuoteHeader>[1]>({
    mutationFn: (payload: Parameters<typeof updateQuoteHeader>[1]) =>
      updateQuoteHeader(id, payload),
    onSuccess: async (updatedQuote, patch) => {
      qc.invalidateQueries({ queryKey: qk.quote(id) });
      qc.invalidateQueries({ queryKey: qk.quotes() });
      qc.invalidateQueries({ queryKey: qk.quoteStatusCounts() });

      // Check if status changed to 'accepted' and trigger order conversion
      console.log("[useUpdateQuoteHeader] Status update successful, patch:", patch);
      if (patch.status === "accepted") {
        console.log("[useUpdateQuoteHeader] Status is 'accepted', triggering order conversion for quote:", id);
        try {
          // Import the conversion function dynamically to avoid circular dependencies
          const { ensureOrderForQuote } = await import("./conversions");
          const { id: orderId } = await ensureOrderForQuote(id);

          // Show success toast
          const { toastBus } = await import("@/lib/toastBus");
          toastBus.emit({
            title: "Order Created",
            description: `Order #${orderId} has been created from this quote.`,
            variant: "success"
          });

          // Invalidate orders queries to refresh the orders list
          qc.invalidateQueries({ queryKey: qk.orders() });

          // Invalidate quotes queries since the quote was deleted after conversion
          qc.invalidateQueries({ queryKey: qk.quotes() });
          qc.invalidateQueries({ queryKey: qk.quoteStatusCounts() });
        } catch (e) {
          console.warn("[quote→order] conversion failed", e);

          // Show error toast but don't rollback the status change
          const { toastBus } = await import("@/lib/toastBus");
          toastBus.emit({
            title: "Order Creation Failed",
            description: "Quote status was updated, but order creation failed. Please try again.",
            variant: "destructive"
          });
        }
      }
    },
  });
}

export function useUpsertQuoteLine(id: string) {
  const qc = useQueryClient();
  return useMutation<QuoteLineUI, Error, Parameters<typeof upsertQuoteLine>[1]>({
    mutationFn: (line: Parameters<typeof upsertQuoteLine>[1]) =>
      upsertQuoteLine(id, line),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.quote(id) });
      qc.invalidateQueries({ queryKey: qk.quotes() });
    },
  });
}

export function useDeleteQuoteLine(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lineId: string) => deleteQuoteLine(id, lineId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.quote(id) });
      qc.invalidateQueries({ queryKey: qk.quotes() });
    },
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation<QuoteUI, Error, Parameters<typeof createQuote>[0]>({
    mutationFn: createQuote,
    onSuccess: (quote) => {
      qc.invalidateQueries({ queryKey: qk.quotes() });
      qc.invalidateQueries({ queryKey: qk.quoteStatusCounts() });
      qc.setQueryData(qk.quote(quote.id), quote);
    },
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id: string) => apiClient.delete(`/quotes?id=eq.${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.quotes() });
      qc.invalidateQueries({ queryKey: qk.quoteStatusCounts() });
    },
  });
}
