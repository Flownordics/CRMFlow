import { api, apiClient } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { z } from "zod";
import { USE_MOCKS } from "@/lib/debug";
import { toastBus } from "@/lib/toastBus";
import { logActivity } from "./activity";
import { useCompanies, fetchCompany } from "./companies";
import { usePeople } from "./people";
import { createOrder, fetchOrder } from "./orders";
import { fetchQuote } from "./quotes";
import { createInvoice } from "./invoices";
import { triggerDealStageAutomation } from "./dealStageAutomation";
import { logger } from '@/lib/logger';

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
      logger.debug(`[ensureOrderForQuote] Order already exists for quote ${quoteId}:`, existing[0].id);
      return { id: existing[0].id };
    }

    // 2) Fetch quote with lines
    const quote = await fetchQuote(quoteId);
    logger.debug(`[ensureOrderForQuote] Fetched quote ${quoteId}:`, quote);

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

    logger.debug(`[ensureOrderForQuote] Creating order with payload:`, orderPayload);

    // 4) Create order
    const order = await createOrder(orderPayload);
    logger.debug(`[ensureOrderForQuote] Order created:`, order.id);

    // 5) Log activity (best effort)
    try {
      await logActivity({
        type: "order_created_from_quote",
        dealId: quote.deal_id || null,
        meta: { quoteId: quote.id, orderId: order.id }
      });
    } catch (e) {
      logger.warn("[ensureOrderForQuote] Activity logging failed:", e);
    }

    // 6) Trigger deal stage automation (quote converted to order = Closed Won)
    if (quote.deal_id) {
      try {
        await triggerDealStageAutomation('order_created', quote.deal_id, order);
      } catch (e) {
        logger.warn("[ensureOrderForQuote] Deal stage automation failed:", e);
      }
    }

    // 7) Delete the converted quote to avoid storage waste and confusion
    try {
      logger.debug(`[ensureOrderForQuote] Deleting converted quote: ${quote.id}`);
      await apiClient.delete(`/quotes?id=eq.${quote.id}`);
      logger.debug(`[ensureOrderForQuote] Quote deleted successfully`);
    } catch (e) {
      logger.warn("[ensureOrderForQuote] Failed to delete converted quote:", e);
      // Don't throw - order creation was successful, quote deletion is cleanup
    }

    return { id: order.id };
  } catch (error) {
    logger.error(`[ensureOrderForQuote] Failed to create order for quote ${quoteId}:`, error);
    throw new Error(`Failed to create order from quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Order to Invoice conversion
export async function ensureInvoiceForOrder(orderId: string): Promise<{ id: string }> {
  try {
    // 1) Check if invoice already exists for this order
    const { data: existing } = await apiClient.get(`/invoices?order_id=eq.${orderId}&select=id&limit=1`);
    if (Array.isArray(existing) && existing.length > 0) {
      logger.debug(`[ensureInvoiceForOrder] Invoice already exists for order ${orderId}:`, existing[0].id);
      return { id: existing[0].id };
    }

    // 2) Fetch order with lines
    const order = await fetchOrder(orderId);
    logger.debug(`[ensureInvoiceForOrder] Fetched order ${orderId}:`, order);

    // 2.5) Fetch company to get payment_days (if company_id exists)
    let paymentDays = 14; // Default payment terms
    if (order.company_id) {
      try {
        const company = await fetchCompany(order.company_id);
        paymentDays = company.paymentDays || 14;
        logger.debug(`[ensureInvoiceForOrder] Using payment_days from company: ${paymentDays}`);
      } catch (error) {
        logger.warn(`[ensureInvoiceForOrder] Failed to fetch company ${order.company_id}, using default 14 days:`, error);
      }
    }

    // 3) Build invoice payload
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + paymentDays);
    
    const invoicePayload = {
      currency: order.currency,
      issue_date: issueDate.toISOString().split('T')[0], // Today's date
      due_date: dueDate.toISOString().split('T')[0], // Calculated based on company payment_days
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

    logger.debug(`[ensureInvoiceForOrder] Creating invoice with payload:`, invoicePayload);

    // 4) Create invoice (assuming we have a createInvoice function similar to createOrder)
    const invoice = await createInvoice(invoicePayload);
    logger.debug(`[ensureInvoiceForOrder] Invoice created:`, invoice.id);

    // 5) Log activity (best effort)
    try {
      await logActivity({
        type: "invoice_created_from_order",
        dealId: order.deal_id || null,
        meta: { orderId: order.id, invoiceId: invoice.id }
      });
    } catch (e) {
      logger.warn("[ensureInvoiceForOrder] Activity logging failed:", e);
    }

    // 6) Trigger deal stage automation (invoice created = Closed Won)
    if (order.deal_id) {
      try {
        await triggerDealStageAutomation('invoice_created', order.deal_id, invoice);
      } catch (e) {
        logger.warn("[ensureInvoiceForOrder] Deal stage automation failed:", e);
      }
    }

    return { id: invoice.id };
  } catch (error) {
    logger.error(`[ensureInvoiceForOrder] Failed to create invoice for order ${orderId}:`, error);
    throw new Error(`Failed to create invoice from order: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate idempotency key
function generateIdempotencyKey(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create quote from deal
export async function createQuoteFromDeal(dealId: string): Promise<QuoteResponse> {
  // Check if deal already has a quote
  const { data: existingQuotes } = await apiClient.get(`/quotes?deal_id=eq.${dealId}&deleted_at=is.null&limit=1`);
  if (Array.isArray(existingQuotes) && existingQuotes.length > 0) {
    throw new Error("This deal already has a quote. A deal can only have one quote.");
  }

  try {
    // Fetch deal data
    const { data: dealsData, error: dealError } = await apiClient.get(`/deals?id=eq.${dealId}&select=*`);
    
    if (dealError) {
      throw new Error(`Failed to fetch deal: ${dealError.message}`);
    }

    const deals = Array.isArray(dealsData) ? dealsData : (dealsData?.data || []);
    const deal = deals[0];
    
    if (!deal) {
      throw new Error(`Deal not found: ${dealId}`);
    }

    // Check if deal has company (required)
    if (!deal.company_id) {
      throw new Error("Deal must have a company to create a quote");
    }

    // Import createQuote function
    const { createQuote } = await import('./quotes');
    
    // Calculate dates
    const issueDate = new Date().toISOString().split('T')[0];
    const validUntil = deal.close_date 
      ? new Date(deal.close_date).toISOString().split('T')[0]
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days from now

    // Calculate expected value (use expected_value_minor or default to 0)
    const expectedValue = deal.expected_value_minor || 0;
    const taxPct = 25; // Default tax rate
    const subtotalMinor = expectedValue;
    const taxMinor = Math.round(subtotalMinor * (taxPct / 100));
    const totalMinor = subtotalMinor + taxMinor;

    // Create quote with default line item if there's an expected value
    const quotePayload = {
      status: 'draft',
      currency: deal.currency || 'DKK',
      issue_date: issueDate,
      valid_until: validUntil,
      notes: `Quote created from deal: ${deal.title}`,
      company_id: deal.company_id,
      contact_id: deal.contact_id || null,
      deal_id: dealId,
      subtotal_minor: subtotalMinor,
      tax_minor: taxMinor,
      total_minor: totalMinor,
      lines: expectedValue > 0 ? [{
        description: deal.title || 'Quote line item',
        qty: 1,
        unit_minor: subtotalMinor,
        tax_rate_pct: taxPct,
        discount_pct: 0,
      }] : [],
    };

    logger.debug(`[createQuoteFromDeal] Creating quote with payload:`, quotePayload);

    // Create quote using the standard createQuote function
    const quote = await createQuote(quotePayload);

    return {
      id: quote.id,
      dealId: dealId,
    };
  } catch (error: any) {
    logger.error(`Failed to create quote from deal ${dealId}:`, error);
    // Check if error is due to unique constraint violation
    if (error?.message?.includes('unique') || error?.code === '23505' || error?.message?.includes('already has a quote')) {
      throw new Error("This deal already has a quote. A deal can only have one quote.");
    }
    throw new Error(error?.message || "Failed to create quote from deal");
  }
}

// Create order from deal
export async function createOrderFromDeal(dealId: string): Promise<OrderResponse> {
  // Check if deal already has an order
  const { data: existingOrders } = await apiClient.get(`/orders?deal_id=eq.${dealId}&deleted_at=is.null&limit=1`);
  if (Array.isArray(existingOrders) && existingOrders.length > 0) {
    throw new Error("This deal already has an order. A deal can only have one order.");
  }

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
  } catch (error: any) {
    logger.error(`Failed to create order from deal ${dealId}:`, error);
    // Check if error is due to unique constraint violation
    if (error?.message?.includes('unique') || error?.code === '23505') {
      throw new Error("This deal already has an order. A deal can only have one order.");
    }
    throw new Error(error?.message || "Failed to create order from deal");
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
    logger.error(`Failed to create invoice from deal ${dealId}:`, error);
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
        logger.error("Failed to log activity:", error);
      }

      // Trigger deal stage automation (quote created = move to Proposal if in Prospecting)
      try {
        await triggerDealStageAutomation('quote_created', dealId, quote);
      } catch (error) {
        logger.warn("Deal stage automation failed:", error);
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
        logger.error("Failed to log activity:", error);
      }

      // Trigger deal stage automation (order created = Closed Won)
      try {
        await triggerDealStageAutomation('order_created', dealId, order);
      } catch (error) {
        logger.warn("Deal stage automation failed:", error);
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
        logger.error("Failed to log activity:", error);
      }

      // Trigger deal stage automation (invoice created = Closed Won)
      try {
        await triggerDealStageAutomation('invoice_created', dealId, invoice);
      } catch (error) {
        logger.warn("Deal stage automation failed:", error);
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
      logger.warn('[Conversions] Failed to fetch company name:', error);
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
      logger.warn('[Conversions] Failed to fetch contact name:', error);
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
