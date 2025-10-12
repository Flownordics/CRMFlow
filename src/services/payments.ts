import { apiClient, normalizeApiData } from "@/lib/api";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { logger } from "@/lib/logger";

// Payment schema
export const Payment = z.object({
  id: z.string(),
  invoice_id: z.string(),
  amount_minor: z.number().int().nonnegative(),
  date: z.string(),
  method: z.enum(['bank', 'card', 'cash', 'other']),
  note: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Payment = z.infer<typeof Payment>;

// Payment with invoice details for display
export const PaymentWithInvoice = Payment.extend({
  invoice_number: z.string().nullable().optional(),
  company_id: z.string().nullable().optional(),
  company_name: z.string().optional(),
  currency: z.string().default("DKK"),
});

export type PaymentWithInvoice = z.infer<typeof PaymentWithInvoice>;

// Fetch all payments with invoice details
export async function fetchPayments(params?: {
  limit?: number;
  offset?: number;
  invoice_id?: string;
  company_id?: string;
  from_date?: string;
  to_date?: string;
  method?: string;
}): Promise<{ data: PaymentWithInvoice[]; total: number }> {
  try {
    const { limit = 50, offset = 0, invoice_id, company_id, from_date, to_date, method } = params || {};

    // Build query params
    const queryParams: Record<string, string> = {
      select: "*, invoices!inner(number, company_id, currency)",
      order: "date.desc,created_at.desc",
      limit: limit.toString(),
      offset: offset.toString(),
    };

    if (invoice_id) {
      queryParams.invoice_id = `eq.${invoice_id}`;
    }

    if (from_date) {
      queryParams.date = `gte.${from_date}`;
    }

    if (to_date) {
      const existingDateFilter = queryParams.date;
      queryParams.date = existingDateFilter 
        ? `${existingDateFilter},lte.${to_date}` 
        : `lte.${to_date}`;
    }

    if (method) {
      queryParams.method = `eq.${method}`;
    }

    // If company_id is provided, we need to filter through invoices
    if (company_id) {
      queryParams["invoices.company_id"] = `eq.${company_id}`;
    }

    const response = await apiClient.get("/payments", { params: queryParams });
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[payments] Non-JSON response");
    }

    let payments: any[];
    let total = 0;

    if (Array.isArray(raw)) {
      payments = raw;
      total = raw.length;
    } else if (raw && typeof raw === 'object' && 'data' in raw) {
      payments = Array.isArray(raw.data) ? raw.data : [];
      total = raw.total || payments.length;
    } else {
      payments = [];
      total = 0;
    }

    // Transform the nested invoice data
    const transformedPayments = payments.map(payment => ({
      ...payment,
      invoice_number: payment.invoices?.number || null,
      company_id: payment.invoices?.company_id || null,
      currency: payment.invoices?.currency || "DKK",
    }));

    const parsedPayments = transformedPayments.map(p => PaymentWithInvoice.parse(p));

    return {
      data: parsedPayments,
      total,
    };
  } catch (error) {
    logger.error("Failed to fetch payments:", error);
    throw new Error("Failed to fetch payments");
  }
}

// Fetch payment history for a specific invoice
export async function fetchInvoicePayments(invoiceId: string): Promise<Payment[]> {
  try {
    const response = await apiClient.get("/payments", {
      params: {
        invoice_id: `eq.${invoiceId}`,
        order: "date.desc,created_at.desc",
      },
    });

    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[invoice-payments] Non-JSON response");
    }

    const payments = Array.isArray(raw) ? raw : [];
    return payments.map(p => Payment.parse(p));
  } catch (error) {
    logger.error(`Failed to fetch payments for invoice ${invoiceId}:`, error);
    throw new Error("Failed to fetch invoice payments");
  }
}

// Fetch payment history for a specific company
export async function fetchCompanyPayments(companyId: string): Promise<PaymentWithInvoice[]> {
  try {
    const response = await apiClient.get("/payments", {
      params: {
        select: "*, invoices!inner(number, company_id, currency)",
        "invoices.company_id": `eq.${companyId}`,
        order: "date.desc,created_at.desc",
      },
    });

    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[company-payments] Non-JSON response");
    }

    const payments = Array.isArray(raw) ? raw : [];

    const transformedPayments = payments.map(payment => ({
      ...payment,
      invoice_number: payment.invoices?.number || null,
      company_id: payment.invoices?.company_id || null,
      currency: payment.invoices?.currency || "DKK",
    }));

    return transformedPayments.map(p => PaymentWithInvoice.parse(p));
  } catch (error) {
    logger.error(`Failed to fetch payments for company ${companyId}:`, error);
    throw new Error("Failed to fetch company payments");
  }
}

// React Query Hooks

export function usePayments(params?: Parameters<typeof fetchPayments>[0]) {
  return useQuery({
    queryKey: qk.payments(params),
    queryFn: () => fetchPayments(params),
  });
}

export function useInvoicePayments(invoiceId: string) {
  return useQuery({
    queryKey: qk.invoicePayments(invoiceId),
    queryFn: () => fetchInvoicePayments(invoiceId),
    enabled: !!invoiceId,
  });
}

export function useCompanyPayments(companyId: string) {
  return useQuery({
    queryKey: qk.companyPayments(companyId),
    queryFn: () => fetchCompanyPayments(companyId),
    enabled: !!companyId,
  });
}

