import { api, apiClient } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { z } from "zod";
import { USE_MOCKS } from "@/lib/debug";
import { toastBus } from "@/lib/toastBus";
import { logActivity } from "./activity";
import { useCompanies } from "./companies";
import { usePeople } from "./people";
import { createOrder, fetchOrder } from "./orders";
import { fetchQuote } from "./quotes";
import { createInvoice } from "./invoices";

// Conversion response schemas
export const QuoteResponse = z.object({
  id: z.string().uuid(),
  dealId: z.string().uuid(),
  // Add other quote fields as needed
});

export const OrderResponse = z.object({
  id: z.string().uuid(),
  dealId: z.string().uuid(),
  // Add other order fields as needed
});

export const InvoiceResponse = z.object({
  id: z.string().uuid(),
  dealId: z.string().uuid(),
  // Add other invoice fields as needed
});

export type QuoteResponse = z.infer<typeof QuoteResponse>;
export type OrderResponse = z.infer<typeof OrderResponse>;
export type InvoiceResponse = z.infer<typeof InvoiceResponse>;

// Quote to Order conversion
export async function ensureOrderForQuote(quoteId: string): Promise<{ id: string }> {
  try {
    // 1) Check if order already exists for this quote
    const { data: existing } = await apiClient.get(`/orders?quote_id=eq.${quoteId}&select=id&limit=1`);
    if (Array.isArray(existing) && existing.length > 0) {
      console.log(`[ensureOrderForQuote] Order already exists for quote ${quoteId}:`, existing[0].id);
      return { id: existing[0].id };
    }

    // 2) Fetch quote with lines
    const quote = await fetchQuote(quoteId);
    console.log(`[ensureOrderForQuote] Fetched quote ${quoteId}:`, quote);

    // 3) Build order payload (only fields that exist in orders table)
    const orderPayload = {
      status: "accepted", // Orders created from quotes are automatically accepted
      currency: quote.currency,
      order_date: new Date().toISOString().split('T')[0], // Today's date
      notes: quote.notes || `Order created from quote ${quote.number || quoteId}`,
      company_id: quote.company_id,
      contact_id: quote.contact_id || null,
      deal_id: quote.deal_id || null,
      quote_id: quote.id,
      subtotal_minor: quote.subtotal_minor,
      tax_minor: quote.tax_minor,
      total_minor: quote.total_minor,
      lines: quote.lines.map(line => ({
        description: line.description,
        qty: line.qty,
        unitMinor: line.unitMinor,
        taxRatePct: line.taxRatePct || 0,
        discountPct: line.discountPct || 0,
        sku: line.sku || null,
      })),
    };

    console.log(`[ensureOrderForQuote] Creating order with payload:`, orderPayload);

    // 4) Create order
    const order = await createOrder(orderPayload);
    console.log(`[ensureOrderForQuote] Order created:`, order.id);

    // 5) Log activity (best effort)
    try {
      await logActivity({
        type: "order_created_from_quote",
        dealId: quote.deal_id || null,
        meta: { quoteId: quote.id, orderId: order.id }
      });
    } catch (e) {
      console.warn("[ensureOrderForQuote] Activity logging failed:", e);
    }

    // 6) Delete the converted quote to avoid storage waste and confusion
    try {
      console.log(`[ensureOrderForQuote] Deleting converted quote: ${quote.id}`);
      await apiClient.delete(`/quotes?id=eq.${quote.id}`);
      console.log(`[ensureOrderForQuote] Quote deleted successfully`);
    } catch (e) {
      console.warn("[ensureOrderForQuote] Failed to delete converted quote:", e);
      // Don't throw - order creation was successful, quote deletion is cleanup
    }

    return { id: order.id };
  } catch (error) {
    console.error(`[ensureOrderForQuote] Failed to create order for quote ${quoteId}:`, error);
    throw new Error(`Failed to create order from quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Order to Invoice conversion
export async function ensureInvoiceForOrder(orderId: string): Promise<{ id: string }> {
  try {
    // 1) Check if invoice already exists for this order
    const { data: existing } = await apiClient.get(`/invoices?order_id=eq.${orderId}&select=id&limit=1`);
    if (Array.isArray(existing) && existing.length > 0) {
      console.log(`[ensureInvoiceForOrder] Invoice already exists for order ${orderId}:`, existing[0].id);
      return { id: existing[0].id };
    }

    // 2) Fetch order with lines
    const order = await fetchOrder(orderId);
    console.log(`[ensureInvoiceForOrder] Fetched order ${orderId}:`, order);

    // 3) Build invoice payload
    const invoicePayload = {
      currency: order.currency,
      issue_date: new Date().toISOString().split('T')[0], // Today's date
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      notes: order.notes || `Invoice created from order ${order.number || orderId}`,
      company_id: order.company_id,
      contact_id: order.contact_id || null,
      deal_id: order.deal_id || null,
      order_id: order.id,
      subtotal_minor: order.subtotalMinor,
      tax_minor: order.taxMinor,
      total_minor: order.totalMinor,
      lines: order.lines.map(line => ({
        description: line.description,
        qty: line.qty,
        unitMinor: line.unitMinor,
        taxRatePct: line.taxRatePct || 0,
        discountPct: line.discountPct || 0,
        sku: line.sku || null,
      })),
    };

    console.log(`[ensureInvoiceForOrder] Creating invoice with payload:`, invoicePayload);

    // 4) Create invoice (assuming we have a createInvoice function similar to createOrder)
    const invoice = await createInvoice(invoicePayload);
    console.log(`[ensureInvoiceForOrder] Invoice created:`, invoice.id);

    // 5) Log activity (best effort)
    try {
      await logActivity({
        type: "invoice_created_from_order",
        dealId: order.deal_id || null,
        meta: { orderId: order.id, invoiceId: invoice.id }
      });
    } catch (e) {
      console.warn("[ensureInvoiceForOrder] Activity logging failed:", e);
    }

    return { id: invoice.id };
  } catch (error) {
    console.error(`[ensureInvoiceForOrder] Failed to create invoice for order ${orderId}:`, error);
    throw new Error(`Failed to create invoice from order: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate idempotency key
function generateIdempotencyKey(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create quote from deal
export async function createQuoteFromDeal(dealId: string): Promise<QuoteResponse> {
  const idempotencyKey = generateIdempotencyKey();

  if (USE_MOCKS) {
    const { data } = await api.post(`/deals/${dealId}/convert/quote`, {}, {
      headers: { 'Idempotency-Key': idempotencyKey }
    });
    return QuoteResponse.parse(data);
  }

  try {
    const response = await apiClient.post(`/deals/${dealId}/convert/quote`, {}, {
      headers: { 'Idempotency-Key': idempotencyKey }
    });

    const quote = response.data || response;
    return QuoteResponse.parse(quote);
  } catch (error) {
    console.error(`Failed to create quote from deal ${dealId}:`, error);
    throw new Error("Failed to create quote from deal");
  }
}

// Create order from deal
export async function createOrderFromDeal(dealId: string): Promise<OrderResponse> {
  const idempotencyKey = generateIdempotencyKey();

  if (USE_MOCKS) {
    const { data } = await api.post(`/deals/${dealId}/convert/order`, {}, {
      headers: { 'Idempotency-Key': idempotencyKey }
    });
    return OrderResponse.parse(data);
  }

  try {
    const response = await apiClient.post(`/deals/${dealId}/convert/order`, {}, {
      headers: { 'Idempotency-Key': idempotencyKey }
    });

    const order = response.data || response;
    return OrderResponse.parse(order);
  } catch (error) {
    console.error(`Failed to create order from deal ${dealId}:`, error);
    throw new Error("Failed to create order from deal");
  }
}

// Create invoice from deal
export async function createInvoiceFromDeal(dealId: string): Promise<InvoiceResponse> {
  const idempotencyKey = generateIdempotencyKey();

  if (USE_MOCKS) {
    const { data } = await api.post(`/deals/${dealId}/convert/invoice`, {}, {
      headers: { 'IdempotencyKey': idempotencyKey }
    });
    return InvoiceResponse.parse(data);
  }

  try {
    const response = await apiClient.post(`/deals/${dealId}/convert/invoice`, {}, {
      headers: { 'Idempotency-Key': idempotencyKey }
    });

    const invoice = response.data || response;
    return InvoiceResponse.parse(invoice);
  } catch (error) {
    console.error(`Failed to create invoice from deal ${dealId}:`, error);
    throw new Error("Failed to create invoice from deal");
  }
}

// React Query hooks
export function useCreateQuoteFromDeal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createQuoteFromDeal,
    onSuccess: async (quote, dealId) => {
      // Invalidate relevant queries
      qc.invalidateQueries({ queryKey: qk.quotes(dealId) });
      qc.invalidateQueries({ queryKey: qk.deal(dealId) });

      // Log activity
      try {
        await logActivity({
          type: "doc_created",
          dealId,
          meta: { docType: "quote", id: quote.id }
        });
      } catch (error) {
        console.error("Failed to log activity:", error);
      }

      toastBus.emit({
        title: "Quote Created",
        description: "Quote has been created successfully from the deal.",
        variant: "success"
      });
    },
    onError: (error) => {
      toastBus.emit({
        title: "Quote Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create quote from deal",
        variant: "destructive"
      });
    }
  });
}

export function useCreateOrderFromDeal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createOrderFromDeal,
    onSuccess: async (order, dealId) => {
      // Invalidate relevant queries
      qc.invalidateQueries({ queryKey: qk.orders(dealId) });
      qc.invalidateQueries({ queryKey: qk.deal(dealId) });

      // Log activity
      try {
        await logActivity({
          type: "doc_created",
          dealId,
          meta: { docType: "order", id: order.id }
        });
      } catch (error) {
        console.error("Failed to log activity:", error);
      }

      toastBus.emit({
        title: "Order Created",
        description: "Order has been created successfully from the deal.",
        variant: "success"
      });
    },
    onError: (error) => {
      toastBus.emit({
        title: "Order Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create order from deal",
        variant: "destructive"
      });
    }
  });
}

export function useCreateInvoiceFromDeal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createInvoiceFromDeal,
    onSuccess: async (invoice, dealId) => {
      // Invalidate relevant queries
      qc.invalidateQueries({ queryKey: qk.invoices(dealId) });
      qc.invalidateQueries({ queryKey: qk.deal(dealId) });

      // Log activity
      try {
        await logActivity({
          type: "doc_created",
          dealId,
          meta: { docType: "invoice", id: invoice.id }
        });
      } catch (error) {
        console.error("Failed to log activity:", error);
      }

      toastBus.emit({
        title: "Invoice Created",
        description: "Invoice has been created successfully from the deal.",
        variant: "success"
      });
    },
    onError: (error) => {
      toastBus.emit({
        title: "Invoice Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create invoice from deal",
        variant: "destructive"
      });
    }
  });
}

/** Valgfri: opdatér et dokument senere med nyeste Deal snapshot */
export async function syncDocumentFromDeal(
  docType: "quote" | "order" | "invoice",
  docId: string,
) {
  const { data } = await api.post(`/documents/${docType}/${docId}/sync-from-deal`);
  return data;
}

// Prefill data types for modals
export interface QuotePrefill {
  companyId: string;
  companyName?: string;
  contactId?: string;
  contactName?: string;
  currency: string;
  amountMinor: number;
  title: string;
  notes?: string;
  taxPct?: number;
  validUntil?: string;
}

export interface OrderPrefill {
  companyId: string;
  companyName?: string;
  contactId?: string;
  contactName?: string;
  currency: string;
  amountMinor: number;
  title: string;
  notes?: string;
  taxPct?: number;
  deliveryDate?: string;
}

// Deal data interface for prefill
export interface DealData {
  id: string;
  title: string;
  companyId?: string;
  contactId?: string;
  currency?: string;
  amountMinor?: number;
  expectedValue?: number;
  closeDate?: string | null;
  notes?: string;
  taxPct?: number;
}

/**
 * Build prefill data from deal for quote/order modals
 * Fetches company/contact data if not already available
 */
export async function buildPrefillFromDeal(
  deal: DealData,
  company?: { id: string; name: string } | null,
  contact?: { id: string; name: string } | null
): Promise<QuotePrefill | OrderPrefill> {
  // Use expectedValue first, fallback to amountMinor
  const valueMinor =
    (typeof deal.expectedValue === "number" && deal.expectedValue > 0)
      ? deal.expectedValue
      : (deal.amountMinor ?? 0);

  // Build base prefill
  const basePrefill = {
    companyId: deal.companyId || "",
    companyName: company?.name,
    contactId: deal.contactId,
    contactName: contact?.name,
    currency: deal.currency || "DKK",
    amountMinor: valueMinor,
    title: deal.title,
    notes: deal.notes || `Converted from deal: ${deal.title}`,
    taxPct: deal.taxPct || 25,
  };

  // If we have companyId but no company name, try to fetch it
  if (deal.companyId && !company?.name) {
    try {
      const response = await apiClient.get(`/companies?id=eq.${deal.companyId}&select=id,name`);
      if (response.data && response.data.length > 0) {
        basePrefill.companyName = response.data[0].name;
      }
    } catch (error) {
      console.warn('[Conversions] Failed to fetch company name:', error);
    }
  }

  // If we have contactId but no contact name, try to fetch it
  if (deal.contactId && !contact?.name) {
    try {
      const response = await apiClient.get(`/people?id=eq.${deal.contactId}&select=id,name`);
      if (response.data && response.data.length > 0) {
        basePrefill.contactName = response.data[0].name;
      }
    } catch (error) {
      console.warn('[Conversions] Failed to fetch contact name:', error);
    }
  }

  // Add deal-specific fields
  if (deal.closeDate) {
    return {
      ...basePrefill,
      validUntil: deal.closeDate,
      deliveryDate: deal.closeDate,
    };
  }

  return basePrefill;
}
