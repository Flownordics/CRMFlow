import { apiClient, normalizeApiData } from "@/lib/api";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { triggerDealStageAutomation } from "./dealStageAutomation";
import { logActivity } from "./activity";
import { toMinor } from "@/lib/money";
import { supabase } from "@/integrations/supabase/client";
import { toastBus } from "@/lib/toastBus";

// Schemas
export const Invoice = z.object({
    id: z.string(),
    number: z.string().nullable().optional(),
    status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
    currency: z.string().default("DKK"),
    issue_date: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    company_id: z.string().nullable().optional(),
    contact_id: z.string().nullable().optional(),
    deal_id: z.string().nullable().optional(),
    subtotal_minor: z.number().int().nonnegative().default(0),
    tax_minor: z.number().int().nonnegative().default(0),
    total_minor: z.number().int().nonnegative().default(0),
    paid_minor: z.number().int().nonnegative().default(0),
    balance_minor: z.number().int().nonnegative().default(0),
    created_by: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
});

export type Invoice = z.infer<typeof Invoice>;

// Invoice line schema
export const InvoiceLine = z.object({
    id: z.string(),
    sku: z.string().optional().nullable(),
    description: z.string(),
    qty: z.number(),
    unit_minor: z.number().int().nonnegative(),
    tax_rate_pct: z.number().default(25),
    discount_pct: z.number().default(0),
    line_total_minor: z.number().int().nonnegative(),
});

export type InvoiceLine = z.infer<typeof InvoiceLine>;

// Payment payload schema
export const PaymentPayload = z.object({
    amountMinor: z.number().int().positive(),
    date: z.string(),
    method: z.enum(['bank', 'card', 'cash', 'other']),
    note: z.string().optional(),
});

export type PaymentPayload = z.infer<typeof PaymentPayload>;

// Email request schema
export const InvoiceEmailRequest = z.object({
    invoiceId: z.string(),
    to: z.string().email(),
    subject: z.string(),
    message: z.string().optional(),
});

export type InvoiceEmailRequest = z.infer<typeof InvoiceEmailRequest>;

// Helper function to derive invoice status
export function deriveInvoiceStatus(invoice: Invoice): 'paid' | 'overdue' | 'partial' | 'sent' | 'draft' {
    if (invoice.balance_minor === 0) {
        return 'paid';
    }

    if (invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.balance_minor > 0) {
        return 'overdue';
    }

    if (invoice.paid_minor > 0) {
        return 'partial';
    }

    if (invoice.status === 'draft') {
        return 'draft';
    }

    return 'sent';
}

// API
export async function fetchInvoices(params: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    company_id?: string;
} = {}): Promise<{ data: Invoice[]; total: number }> {
    const { page = 1, limit = 20, q = "", status, company_id } = params;

    try {
        const queryParams = new URLSearchParams();
        const offset = (page - 1) * limit;
        queryParams.append('offset', offset.toString());
        queryParams.append('limit', limit.toString());

        if (q) queryParams.append('search', q);

        const url = `/invoices?${queryParams.toString()}`;
        const response = await apiClient.get(url);
        const raw = response.data;

        if (typeof raw === "string") {
            throw new Error("[invoices] Non-JSON response. Check Network: status/content-type/om der er redirect.");
        }

        let invoices: Invoice[];
        let total = 0;

        if (Array.isArray(raw)) {
            invoices = raw;
            total = raw.length;
        } else if (raw && typeof raw === 'object' && 'data' in raw) {
            invoices = Array.isArray(raw.data) ? raw.data : [];
            total = raw.total || invoices.length;
        } else {
            invoices = [];
            total = 0;
        }

        const parsedInvoices = invoices.map(invoice => Invoice.parse(invoice));

        return {
            data: parsedInvoices,
            total
        };
    } catch (error) {
        console.error("Failed to fetch invoices:", error);
        throw new Error("Failed to fetch invoices");
    }
}

export async function fetchInvoice(id: string): Promise<Invoice> {
    const response = await apiClient.get(`/invoices?id=eq.${id}&select=*`);
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
        throw new Error("[invoice] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
    }

    // PostgREST returns arrays, so we need to handle that
    const invoiceData = Array.isArray(raw) ? raw[0] : raw;

    if (!invoiceData) {
        throw new Error("[invoice] No invoice data returned from API");
    }

    return Invoice.parse(invoiceData);
}

// Add payment to invoice
export async function addPayment(invoiceId: string, payload: PaymentPayload): Promise<Invoice> {
    try {
        // First, get the current invoice to get the deal_id
        const currentInvoice = await fetchInvoice(invoiceId);

        // Update the invoice's paid_minor field
        const response = await apiClient.patch(`/invoices?id=eq.${invoiceId}`, {
            paid_minor: currentInvoice.paid_minor + payload.amountMinor
        });

        let updatedInvoice: Invoice;

        // Handle 204 No Content response (common for PATCH operations)
        if (response.status === 204) {
            // Fetch the updated invoice data
            updatedInvoice = await fetchInvoice(invoiceId);
        } else {
            const raw = normalizeApiData(response);

            if (typeof raw === "string") {
                throw new Error("[invoice] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
            }

            // PostgREST returns arrays, so we need to handle that
            const invoiceData = Array.isArray(raw) ? raw[0] : raw;

            if (!invoiceData) {
                // If no data returned, fetch the updated invoice
                updatedInvoice = await fetchInvoice(invoiceId);
            } else {
                updatedInvoice = Invoice.parse(invoiceData);
            }
        }

        // Log the payment activity
        if (currentInvoice.deal_id) {
            await logActivity({
                type: 'payment_recorded',
                dealId: currentInvoice.deal_id,
                meta: {
                    invoiceId,
                    amountMinor: payload.amountMinor,
                    date: payload.date,
                    method: payload.method,
                    note: payload.note
                }
            });
        }

        return updatedInvoice;
    } catch (error) {
        console.error("Failed to add payment:", error);
        throw new Error("Failed to add payment");
    }
}

// Hooks
export function useInvoices(params: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    company_id?: string;
} = {}) {
    return useQuery({
        queryKey: qk.invoices(params),
        queryFn: () => fetchInvoices(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useInvoice(id: string) {
    return useQuery({
        queryKey: qk.invoice(id),
        queryFn: () => fetchInvoice(id),
        enabled: !!id,
    });
}

export function useAddPayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ invoiceId, payload }: { invoiceId: string; payload: PaymentPayload }) =>
            addPayment(invoiceId, payload),
        onSuccess: (updatedInvoice, { invoiceId }) => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: qk.invoice(invoiceId) });
            queryClient.invalidateQueries({ queryKey: qk.invoices() });
            queryClient.invalidateQueries({ queryKey: qk.accounting() });
        },
    });
}

export function useUpdateInvoice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateInvoice>[1] }) =>
            updateInvoice(id, payload),
        onSuccess: async (updatedInvoice, { id, payload }) => {
            queryClient.invalidateQueries({ queryKey: qk.invoice(id) });
            queryClient.invalidateQueries({ queryKey: qk.invoices() });

            // Trigger deal stage automation for invoice status changes
            if (updatedInvoice.deal_id && payload.status === 'paid') {
                try {
                    await triggerDealStageAutomation('invoice_paid', updatedInvoice.deal_id, updatedInvoice);
                } catch (e) {
                    console.warn("[useUpdateInvoice] Deal stage automation failed:", e);
                }
            }
        },
    });
}

export function useDeleteInvoice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteInvoice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qk.invoices() });
            queryClient.invalidateQueries({ queryKey: qk.accounting() });
        },
    });
}

export function useSendInvoice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: sendInvoice,
        onSuccess: (updatedInvoice, id) => {
            queryClient.invalidateQueries({ queryKey: qk.invoice(id) });
            queryClient.invalidateQueries({ queryKey: qk.invoices() });
        },
    });
}

export function useSendInvoiceEmail() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: sendInvoiceEmail,
        onSuccess: (result, { invoiceId }) => {
            if (result.success) {
                queryClient.invalidateQueries({ queryKey: qk.invoice(invoiceId) });
                queryClient.invalidateQueries({ queryKey: qk.invoices() });
            }
        },
    });
}

// Update invoice
export async function updateInvoice(id: string, payload: Partial<{
    number: string;
    status: Invoice["status"];
    currency: string;
    issue_date: string;
    due_date: string;
    notes: string;
    company_id: string;
    contact_id: string | null;
    deal_id: string | null;
    order_id: string | null;
    subtotal_minor: number;
    tax_minor: number;
    total_minor: number;
}>): Promise<Invoice> {
    try {
        const response = await apiClient.patch(`/invoices?id=eq.${id}`, payload);

        // Handle 204 No Content response (common for PATCH operations)
        if (response.status === 204) {
            // Fetch the updated invoice data
            const updatedInvoice = await fetchInvoice(id);
            return updatedInvoice;
        }

        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[updateInvoice] Non-JSON response");
        }

        const invoiceData = Array.isArray(raw) ? raw[0] : raw;

        if (!invoiceData) {
            // If no data returned, fetch the updated invoice
            const updatedInvoice = await fetchInvoice(id);
            return updatedInvoice;
        }

        return Invoice.parse(invoiceData);
    } catch (error) {
        console.error("Failed to update invoice:", error);
        throw new Error("Failed to update invoice");
    }
}

// Delete invoice
export async function deleteInvoice(id: string): Promise<void> {
    try {
        await apiClient.delete(`/invoices?id=eq.${id}`);
    } catch (error) {
        console.error("Failed to delete invoice:", error);
        throw new Error("Failed to delete invoice");
    }
}

// Send invoice (update status to 'sent')
export async function sendInvoice(id: string): Promise<Invoice> {
    try {
        return await updateInvoice(id, { status: 'sent' });
    } catch (error) {
        console.error("Failed to send invoice:", error);
        throw new Error("Failed to send invoice");
    }
}

// Send invoice email
export async function sendInvoiceEmail(request: InvoiceEmailRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        // Validate request
        const validatedRequest = InvoiceEmailRequest.parse(request);

        // Check if Gmail is connected
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        const { data: integration, error: integrationError } = await supabase
            .from('user_integrations')
            .select('*')
            .eq('user_id', user.id)
            .eq('provider', 'google')
            .eq('kind', 'gmail')
            .single();

        console.log('Gmail integration check:', {
            integrationError,
            integration: integration ? {
                id: integration.id,
                hasAccessToken: !!integration.access_token,
                expiresAt: integration.expires_at,
                email: integration.email
            } : null
        });

        if (integrationError || !integration?.access_token) {
            const error = new Error("Gmail not connected");
            error.name = 'EmailNotConnectedError';
            throw error;
        }

        // Generate idempotency key
        const idempotencyKey = `invoice_email_${request.invoiceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Send email via Netlify Function
        const response = await fetch('/.netlify/functions/send-invoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({
                invoice_id: validatedRequest.invoiceId,
                recipient_email: validatedRequest.to,
                subject: validatedRequest.subject,
                message: validatedRequest.message,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to send email');
        }

        const result = await response.json();

        if (result.success) {
            // Log email activity
            const invoice = await fetchInvoice(validatedRequest.invoiceId);
            if (invoice.deal_id) {
                await logActivity({
                    type: 'email_sent',
                    dealId: invoice.deal_id,
                    meta: {
                        invoiceId: validatedRequest.invoiceId,
                        to: validatedRequest.to,
                        subject: validatedRequest.subject,
                        gmailMessageId: result.messageId
                    }
                });
            }

            return {
                success: true,
                messageId: result.messageId
            };
        } else {
            throw new Error(result.error || 'Failed to send email');
        }

    } catch (error) {
        console.error('Failed to send invoice email:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        // Don't show toast here - let the component handle it
        console.error('Invoice email error details:', {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            request: request // Use original request instead of validatedRequest
        });

        return {
            success: false,
            error: errorMessage
        };
    }
}

// Generate HTML email content for invoice
function generateInvoiceEmailHtml(request: InvoiceEmailRequest): string {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Invoice</h2>
            <p>Please find your invoice attached.</p>
            ${request.message ? `<p>${request.message.replace(/\n/g, '<br>')}</p>` : ''}
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Best regards,<br>Your Team</p>
        </div>
    `;
}

// Generate text email content for invoice
function generateInvoiceEmailText(request: InvoiceEmailRequest): string {
    return `
Invoice

Please find your invoice attached.

${request.message || ''}

If you have any questions, please don't hesitate to contact us.

Best regards,
Your Team
    `.trim();
}

export async function createInvoice(payload: {
    number?: string;
    currency: string;
    issue_date: string;
    due_date: string;
    notes?: string;
    company_id: string;
    contact_id?: string | null;
    deal_id?: string | null;
    order_id?: string | null;
    subtotal_minor: number;
    tax_minor: number;
    total_minor: number;
    lines: any[];
}): Promise<Invoice> {
    try {
        console.log("[createInvoice] Starting with payload:", payload);

        // Extract lines from payload since invoices table doesn't have lines column
        const { lines, ...invoicePayload } = payload;

        // Remove empty number field to let API generate it automatically
        if (!invoicePayload.number || invoicePayload.number.trim() === '') {
            delete invoicePayload.number;
        }

        // Create the invoice first
        const response = await apiClient.post("/invoices", invoicePayload);

        console.log("[createInvoice] POST /invoices response:", {
            status: response.status,
            data: response.data,
            headers: response.headers,
            hasLocation: !!response.headers?.location
        });

        let invoice: Invoice;

        // Handle different response scenarios
        if (response.status === 201) {
            if (response.data && response.data.id) {
                // Response contains the created invoice data
                invoice = response.data;
            } else if (response.headers?.location) {
                // Response has location header, fetch the invoice
                const location = response.headers.location;
                const invoiceId = location.split('/').pop();
                if (invoiceId) {
                    const fetchResponse = await apiClient.get(`/invoices?id=eq.${invoiceId}`);
                    if (fetchResponse.data && Array.isArray(fetchResponse.data) && fetchResponse.data.length > 0) {
                        invoice = fetchResponse.data[0];
                    } else {
                        throw new Error("Could not fetch created invoice");
                    }
                } else {
                    throw new Error("Invalid location header format");
                }
            } else {
                // No data and no location header - try to find the created invoice by order_id
                console.log("[createInvoice] No data or location header, searching for created invoice by order_id");
                if (invoicePayload.order_id) {
                    const searchResponse = await apiClient.get(`/invoices?order_id=eq.${invoicePayload.order_id}&order=created_at.desc&limit=1`);
                    if (searchResponse.data && Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
                        invoice = searchResponse.data[0];
                        console.log("[createInvoice] Found created invoice by order_id:", invoice.id);
                    } else {
                        throw new Error("Invoice creation succeeded but could not find created invoice");
                    }
                } else {
                    throw new Error("Unexpected response: no invoice data or location header");
                }
            }
        } else {
            // Handle other status codes
            invoice = response.data || response;
        }

        // Create line items separately if lines are provided
        if (lines && lines.length > 0) {
            console.log(`[createInvoice] Creating ${lines.length} line items for invoice ${invoice.id}`);
            for (const line of lines) {
                const linePayload = {
                    parent_type: 'invoice',
                    parent_id: invoice.id,
                    description: line.description,
                    qty: line.qty,
                    unit_minor: line.unitMinor,
                    tax_rate_pct: line.taxRatePct || 25,
                    discount_pct: line.discountPct || 0,
                    sku: line.sku || null,
                    position: lines.indexOf(line), // Add position for ordering
                };
                console.log("[createInvoice] Creating line item:", linePayload);

                try {
                    const lineResponse = await apiClient.post(`/line_items`, linePayload);
                    console.log("[createInvoice] Line item created:", lineResponse.data);
                } catch (lineError) {
                    console.error("[createInvoice] Failed to create line item:", lineError);
                    throw lineError;
                }
            }
        } else {
            console.log("[createInvoice] No lines to create");
        }

        // Return the invoice with the lines we just created
        return invoice;
    } catch (error) {
        console.error("Failed to create invoice:", error);
        throw new Error("Failed to create invoice");
    }
}
