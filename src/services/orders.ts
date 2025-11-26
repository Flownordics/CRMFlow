import { apiClient, apiPostWithReturn, apiPatchWithReturn, normalizeApiData } from "@/lib/api";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { logger } from '@/lib/logger';
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "./activity";
import { isValidUuid } from "@/lib/validation";

// Adapter functions for DB ↔ UI conversion (similar to quotes)
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

const orderDbToUi = (o: any): OrderUI => ({
    id: o.id,
    number: o.number,
    currency: o.currency,
    status: o.status || "draft",
    order_date: o.order_date,

    notes: o.notes,
    company_id: o.company_id,
    contact_id: o.contact_id,
    deal_id: o.deal_id,
    quote_id: o.quote_id,
    subtotalMinor: o.subtotal_minor,
    taxMinor: o.tax_minor,
    totalMinor: o.total_minor,
    created_by: o.created_by,
    created_at: o.created_at,
    updated_at: o.updated_at,
    lines: Array.isArray(o.lines) ? o.lines.map(lineDbToUi) : [],
});

const orderUiToDb = (o: any) => ({
    id: o.id,
    number: o.number,
    currency: o.currency,
    status: o.status,
    order_date: o.order_date,

    notes: o.notes,
    company_id: o.company_id,
    contact_id: o.contact_id,
    deal_id: o.deal_id,
    quote_id: o.quote_id,
    subtotal_minor: o.subtotalMinor,
    tax_minor: o.taxMinor,
    total_minor: o.totalMinor,
    created_by: o.created_by,
    created_at: o.created_at,
    updated_at: o.updated_at,
    lines: Array.isArray(o.lines) ? o.lines.map(lineUiToDb) : [],
});

// Schemas
export const OrderLine = z.object({
    id: z.string(),
    sku: z.string().optional().nullable(),
    description: z.string(),
    qty: z.number(), // e.g. 1.00
    unitMinor: z.number().int().nonnegative(), // 19900 = 199.00 DKK
    taxRatePct: z.number().default(25),
    discountPct: z.number().default(0), // 0..100
    lineTotalMinor: z.number().int().nonnegative(),
});

export const Order = z.object({
    id: z.string(),
    number: z.string().nullable().optional(),
    currency: z.string().default("DKK"),
    status: z.enum(["draft", "accepted", "cancelled", "backorder", "invoiced"]).default("draft"),
    order_date: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    company_id: z.string().nullable().optional(),
    contact_id: z.string().nullable().optional(),
    deal_id: z.string().nullable().optional(),
    quote_id: z.string().nullable().optional(),
    subtotal_minor: z.number().int().nonnegative().default(0),
    tax_minor: z.number().int().nonnegative().default(0),
    total_minor: z.number().int().nonnegative().default(0),
    created_by: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    lines: z.array(OrderLine).optional().default([]),
});

export type Order = z.infer<typeof Order>;
export type OrderLine = z.infer<typeof OrderLine>;

// UI types (camelCase for frontend)
export type OrderUI = {
    id: string;
    number?: string | null;
    currency: string;
    status: string;
    order_date?: string | null;
    notes?: string | null;
    company_id?: string | null;
    contact_id?: string | null;
    deal_id?: string | null;
    quote_id?: string | null;
    subtotalMinor: number;
    taxMinor: number;
    totalMinor: number;
    created_by?: string | null;
    created_at: string;
    updated_at: string;
    lines: OrderLineUI[];
};

export type OrderLineUI = {
    id: string;
    sku?: string | null;
    description: string;
    qty: number;
    unitMinor: number;
    taxRatePct: number;
    discountPct: number;
    lineTotalMinor: number;
};

// Order Email Request Schema
export const OrderEmailRequest = z.object({
    orderId: z.string(),
    to: z.string().email("Invalid email address"),
    subject: z.string().min(1, "Subject is required"),
    message: z.string().optional(),
});

export type OrderEmailRequest = z.infer<typeof OrderEmailRequest>;

// API
export async function fetchOrders(params: {
    page?: number;
    limit?: number;
    q?: string;
    company_id?: string;
} = {}): Promise<{ data: OrderUI[]; total: number }> {
    const { page = 1, limit = 20, q = "", company_id } = params;

    try {
        logger.debug("[fetchOrders] Starting with params:", params);

        const queryParams = new URLSearchParams();
        const offset = (page - 1) * limit;
        queryParams.append('offset', offset.toString());
        queryParams.append('limit', limit.toString());

        if (q) queryParams.append('search', q);

        const url = `/orders?${queryParams.toString()}`;
        logger.debug("[fetchOrders] Fetching from URL:", url);

        const response = await apiClient.get(url);
        const raw = response.data;

        logger.debug("[fetchOrders] Raw response:", {
            status: response.status,
            dataLength: Array.isArray(raw) ? raw.length : 'not array',
            data: raw
        });

        if (typeof raw === "string") {
            throw new Error("[orders] Non-JSON response. Check Network: status/content-type/om der er redirect.");
        }

        let orders: Order[];
        let total = 0;

        if (Array.isArray(raw)) {
            orders = raw;
            total = raw.length;
        } else if (raw && typeof raw === 'object' && 'data' in raw) {
            orders = Array.isArray(raw.data) ? raw.data : [];
            total = raw.total || orders.length;
        } else {
            orders = [];
            total = 0;
        }

        // Fetch line items for each order and convert to UI format
        const ordersWithLines = await Promise.all(
            orders.map(async (order) => {
                try {
                    // Fetch line items for this order
                    const lineItemsUrl = `/line_items?parent_type=eq.order&parent_id=eq.${order.id}&order=position.asc`;
                    const linesResponse = await apiClient.get(lineItemsUrl);

                    if (linesResponse.data && Array.isArray(linesResponse.data)) {
                        order.lines = linesResponse.data;
                    } else {
                        order.lines = [];
                    }
                } catch (error) {
                    logger.warn(`[fetchOrders] Failed to fetch lines for order ${order.id}:`, error);
                    order.lines = [];
                }

                return orderDbToUi(order);
            })
        );

        logger.debug("[fetchOrders] Final result:", {
            ordersCount: ordersWithLines.length,
            total,
            orders: ordersWithLines
        });

        return {
            data: ordersWithLines as OrderUI[],
            total
        };
    } catch (error) {
        logger.error("[fetchOrders] Failed to fetch orders:", error);
        throw new Error("Failed to fetch orders");
    }
}

export async function fetchOrder(id: string): Promise<OrderUI> {
    try {
        // Fetch the order first
        const response = await apiClient.get(`/orders?id=eq.${id}&deleted_at=is.null`);

        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            const order = response.data[0];

            // Process order data

            // Fetch line items for this order
            try {
                // Fetch line items for this order
                const lineItemsUrl = `/line_items?parent_type=eq.order&parent_id=eq.${order.id}&order=position.asc`;
                const linesResponse = await apiClient.get(lineItemsUrl);

                if (linesResponse.data && Array.isArray(linesResponse.data)) {
                    // Process line items
                    order.lines = linesResponse.data;
                } else {
                    // No line items found
                    order.lines = [];
                }
            } catch (linesError: any) {
                // Failed to fetch line items, using empty array
                order.lines = [];
            }

            // Return processed order

            try {
                // Convert DB format to UI format using adapter (similar to quotes)
                const uiOrder = orderDbToUi(order);
                // Successfully converted to UI format
                return uiOrder as OrderUI;
            } catch (parseError: any) {
                // Conversion error occurred
                throw new Error(`Failed to convert order: ${parseError.message}`);
            }
        }

        // No order found in response
        throw new Error(`Order with ID ${id} not found`);
    } catch (error: any) {
        // Failed to fetch order
        throw new Error(`Failed to fetch order: ${error.message}`);
    }
}

export async function createOrder(payload: {
    number?: string;
    status?: string;
    currency: string;
    order_date: string;
    notes?: string;
    company_id: string;
    contact_id?: string | null;
    deal_id?: string | null;
    quote_id?: string | null;
    subtotal_minor: number;
    tax_minor: number;
    total_minor: number;
    lines: any[];
}): Promise<Order> {
    try {
        logger.debug("[createOrder] Starting with payload:", payload);

        // Extract lines from payload since orders table doesn't have lines column
        const { lines, ...orderPayload } = payload;

        // Remove empty number field to let API generate it automatically
        if (!orderPayload.number || orderPayload.number.trim() === '') {
            delete orderPayload.number;
        }

        // Create the order first
        const response = await apiClient.post("/orders", orderPayload);

        logger.debug("[createOrder] POST /orders response:", {
            status: response.status,
            data: response.data,
            headers: response.headers,
            hasLocation: !!response.headers?.location
        });

        let order: Order;

        // Handle different response scenarios
        if (response.status === 201) {
            if (response.data && response.data.id) {
                // Response contains the created order data
                order = orderDbToUi(response.data);
            } else if (response.headers?.location) {
                // Response has location header, fetch the order
                const location = response.headers.location;
                const orderId = location.split('/').pop();
                if (orderId) {
                    order = await fetchOrder(orderId);
                } else {
                    throw new Error("Invalid location header format");
                }
            } else {
                // No data and no location header - try to find the created order by quote_id
                logger.debug("[createOrder] No data or location header, searching for created order by quote_id");
                if (orderPayload.quote_id) {
                    const searchResponse = await apiClient.get(`/orders?quote_id=eq.${orderPayload.quote_id}&order=created_at.desc&limit=1`);
                    if (searchResponse.data && Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
                        order = orderDbToUi(searchResponse.data[0]);
                        logger.debug("[createOrder] Found created order by quote_id:", order.id);
                    } else {
                        throw new Error("Order creation succeeded but could not find created order");
                    }
                } else {
                    throw new Error("Unexpected response: no order data or location header");
                }
            }
        } else {
            // Handle other status codes
            order = orderDbToUi(response.data || response);
        }

        // Create line items separately if lines are provided
        if (lines && lines.length > 0) {
            logger.debug(`[createOrder] Creating ${lines.length} line items for order ${order.id}`);
            for (const line of lines) {
                const linePayload = {
                    parent_type: 'order',
                    parent_id: order.id,
                    description: line.description,
                    qty: line.qty,
                    unit_minor: line.unitMinor,
                    tax_rate_pct: line.taxRatePct || 25,
                    discount_pct: line.discountPct || 0,
                    sku: line.sku || null,
                    position: lines.indexOf(line), // Add position for ordering
                };
                logger.debug("[createOrder] Creating line item:", linePayload);

                try {
                    const lineResponse = await apiClient.post(`/line_items`, linePayload);
                    logger.debug("[createOrder] Line item created:", lineResponse.data);
                } catch (lineError) {
                    logger.error("[createOrder] Failed to create line item:", lineError);
                    throw lineError;
                }
            }
        } else {
            logger.debug("[createOrder] No lines to create");
        }

        // Return the order with the lines we just created
        return order;
    } catch (error) {
        logger.error("Failed to create order:", error);
        throw new Error("Failed to create order");
    }
}

export async function updateOrderHeader(
    id: string,
    payload: Partial<
        Pick<Order, "order_date" | "notes" | "currency" | "status">
    >,
) {
    const response = await apiPatchWithReturn(`/orders?id=eq.${id}`, payload);
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
        throw new Error("[order] Non-JSON response. Check Network: status/content-type/om der er redirect.");
    }

    // PostgREST returns arrays, so we need to handle that
    const orderData = Array.isArray(raw) ? raw[0] : raw;

    if (!orderData) {
        // If no data returned (204 response), fetch the updated order
        logger.debug("[updateOrderHeader] No data in response, fetching updated order");
        return await fetchOrder(id);
    }

    return orderDbToUi(orderData) as OrderUI;
}

export async function upsertOrderLine(
    orderId: string,
    line: Partial<OrderLineUI> & { id?: string },
) {
    // Convert UI format to DB format
    const dbLine = lineUiToDb(line);

    if (line.id) {
        // Update existing line
        const response = await apiPatchWithReturn(`/line_items?id=eq.${line.id}`, {
            ...dbLine,
            parent_type: 'order',
            parent_id: orderId,
        });
        return normalizeApiData(response);
    } else {
        // For new line items, calculate the next available position
        // to avoid unique constraint violations on (parent_type, parent_id, position)
        let nextPosition = 0;
        try {
            const existingLinesResponse = await apiClient.get(
                `/line_items?parent_type=eq.order&parent_id=eq.${orderId}&select=position&order=position.desc&limit=1`
            );
            const existingLines = normalizeApiData(existingLinesResponse);
            if (Array.isArray(existingLines) && existingLines.length > 0 && existingLines[0]?.position != null) {
                nextPosition = (existingLines[0].position as number) + 1;
            }
        } catch (error) {
            // If fetching existing lines fails, default to position 0
            // This might cause a conflict if position 0 already exists, but it's better than failing silently
            logger.warn("[upsertOrderLine] Failed to fetch existing line positions, defaulting to 0:", error);
        }

        // Create new line
        const response = await apiPostWithReturn('/line_items', {
            ...dbLine,
            parent_type: 'order',
            parent_id: orderId,
            position: nextPosition,
        });
        return normalizeApiData(response);
    }
}

export async function deleteOrderLine(lineId: string) {
    const response = await apiClient.delete(`/line_items?id=eq.${lineId}`);
    return normalizeApiData(response);
}

// Hooks
export function useOrders(params: {
    page?: number;
    limit?: number;
    q?: string;
    company_id?: string;
} = {}) {
    return useQuery<{ data: OrderUI[]; total: number }>({
        queryKey: qk.orders(params),
        queryFn: () => fetchOrders(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useOrder(id: string) {
    return useQuery<OrderUI>({
        queryKey: qk.order(id),
        queryFn: () => fetchOrder(id),
        enabled: !!id && isValidUuid(id),
    });
}

export function useCreateOrder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: createOrder,
        onSuccess: async (order) => {
            qc.invalidateQueries({ queryKey: qk.orders() });
            qc.setQueryData(qk.order(order.id), order);
            
            // Invalidate related entity queries
            if (order.deal_id) {
                qc.invalidateQueries({ queryKey: qk.deal(order.deal_id) });
                qc.invalidateQueries({ queryKey: qk.deals() });
            }
            if (order.company_id) {
                qc.invalidateQueries({ queryKey: qk.company(order.company_id) });
                qc.invalidateQueries({ queryKey: qk.companies() });
            }
            if (order.quote_id) {
                qc.invalidateQueries({ queryKey: qk.quote(order.quote_id) });
                qc.invalidateQueries({ queryKey: qk.quotes() });
            }
            
            // Log to company activity if order has NO deal (standalone order)
            if (!order.deal_id && order.company_id) {
                try {
                    const { logOrderCreated } = await import("@/services/activityLog");
                    await logOrderCreated(order.company_id, order.id, order.number || 'Draft');
                    logger.debug("[useCreateOrder] Logged order creation to company activity");
                } catch (error) {
                    logger.warn("[useCreateOrder] Failed to log company activity:", error);
                    // Don't throw - order was created successfully
                }
            }
        },
    });
}

export function useUpdateOrderHeader(id: string) {
    const qc = useQueryClient();
    return useMutation<OrderUI, Error, Parameters<typeof updateOrderHeader>[1]>({
        mutationFn: (payload: Parameters<typeof updateOrderHeader>[1]) =>
            updateOrderHeader(id, payload),
        onSuccess: async (updatedOrder, patch) => {
            qc.invalidateQueries({ queryKey: qk.order(id) });
            qc.invalidateQueries({ queryKey: qk.orders() });

            // Invalidate related entity queries
            if (updatedOrder.deal_id) {
                qc.invalidateQueries({ queryKey: qk.deal(updatedOrder.deal_id) });
                qc.invalidateQueries({ queryKey: qk.deals() });
            }
            if (updatedOrder.company_id) {
                qc.invalidateQueries({ queryKey: qk.company(updatedOrder.company_id) });
                qc.invalidateQueries({ queryKey: qk.companies() });
            }
            if (updatedOrder.quote_id) {
                qc.invalidateQueries({ queryKey: qk.quote(updatedOrder.quote_id) });
                qc.invalidateQueries({ queryKey: qk.quotes() });
            }

            // Check if status changed to 'invoiced' and trigger invoice conversion
            logger.debug("[useUpdateOrderHeader] Status update successful, patch:", patch);
            if (patch.status === "invoiced") {
                logger.debug("[useUpdateOrderHeader] Status is 'invoiced', triggering invoice conversion for order:", id);
                try {
                    // Import the conversion function dynamically to avoid circular dependencies
                    const { ensureInvoiceForOrder } = await import("./conversions");
                    const { id: invoiceId } = await ensureInvoiceForOrder(id);

                    // Show success toast
                    const { toastBus } = await import("@/lib/toastBus");
                    toastBus.emit({
                        title: "Invoice Created",
                        description: `Invoice #${invoiceId} has been created from this order.`,
                        variant: "success"
                    });

                    // Invalidate invoices queries to refresh the invoices list
                    qc.invalidateQueries({ queryKey: qk.invoices() });
                } catch (e) {
                    logger.warn("[order→invoice] conversion failed", e);

                    // Show error toast but don't rollback the status change
                    const { toastBus } = await import("@/lib/toastBus");
                    toastBus.emit({
                        title: "Invoice Creation Failed",
                        description: "Order status was updated, but invoice creation failed. Please try again.",
                        variant: "destructive"
                    });
                }
            }
        },
    });
}

export function useUpsertOrderLine(orderId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (line: Partial<OrderLineUI> & { id?: string }) =>
            upsertOrderLine(orderId, line),
        onSuccess: async () => {
            qc.invalidateQueries({ queryKey: qk.order(orderId) });
            qc.invalidateQueries({ queryKey: qk.orders() });
            // Fetch order to get deal_id and company_id for invalidation
            try {
                const order = await fetchOrder(orderId);
                if (order.deal_id) {
                    qc.invalidateQueries({ queryKey: qk.deal(order.deal_id) });
                    qc.invalidateQueries({ queryKey: qk.deals() });
                }
                if (order.company_id) {
                    qc.invalidateQueries({ queryKey: qk.company(order.company_id) });
                    qc.invalidateQueries({ queryKey: qk.companies() });
                }
            } catch (error) {
                // If fetch fails, just invalidate all
                qc.invalidateQueries({ queryKey: qk.deals() });
                qc.invalidateQueries({ queryKey: qk.companies() });
            }
        },
    });
}

export function useDeleteOrderLine(orderId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (lineId: string) => deleteOrderLine(lineId),
        onSuccess: async () => {
            qc.invalidateQueries({ queryKey: qk.order(orderId) });
            qc.invalidateQueries({ queryKey: qk.orders() });
            // Fetch order to get deal_id and company_id for invalidation
            try {
                const order = await fetchOrder(orderId);
                if (order.deal_id) {
                    qc.invalidateQueries({ queryKey: qk.deal(order.deal_id) });
                    qc.invalidateQueries({ queryKey: qk.deals() });
                }
                if (order.company_id) {
                    qc.invalidateQueries({ queryKey: qk.company(order.company_id) });
                    qc.invalidateQueries({ queryKey: qk.companies() });
                }
            } catch (error) {
                // If fetch fails, just invalidate all
                qc.invalidateQueries({ queryKey: qk.deals() });
                qc.invalidateQueries({ queryKey: qk.companies() });
            }
        },
    });
}

// Search function for orders
export async function searchOrders(query: string, companyId?: string): Promise<Array<{ id: string; label: string; subtitle?: string }>> {
    try {
        const result = await fetchOrders({ q: query, limit: 20, company_id: companyId });
        return result.data.map(order => ({
            id: order.id,
            label: order.order_number ? `Order #${order.order_number}` : `Order ${order.id.slice(0, 8)}`
        }));
    } catch (error) {
        logger.error("Failed to search orders:", error);
        return [];
    }
}

// Send order email
export async function sendOrderEmail(request: OrderEmailRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        // Validate request
        const validatedRequest = OrderEmailRequest.parse(request);

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

        logger.debug('Gmail integration check:', {
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

        // Send email via Netlify Function
        const response = await fetch('/.netlify/functions/send-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({
                order_id: validatedRequest.orderId,
                recipient_email: validatedRequest.to,
                subject: validatedRequest.subject,
                message: validatedRequest.message,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to send email');
        }

        const result = await response.json();

        if (result.success) {
            // Log email activity
            const order = await fetchOrder(validatedRequest.orderId);
            if (order.deal_id) {
                await logActivity({
                    type: 'email_sent',
                    dealId: order.deal_id,
                    meta: {
                        orderId: validatedRequest.orderId,
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
        logger.error('Failed to send order email:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        logger.error('Order email error details:', {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            request: request
        });

        return {
            success: false,
            error: errorMessage
        };
    }
}

// React Query hook for sending order emails
export function useSendOrderEmail() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: sendOrderEmail,
        onSuccess: async (_, request) => {
            // Invalidate orders to refresh status
            queryClient.invalidateQueries({ queryKey: qk.orders() });
            queryClient.invalidateQueries({ queryKey: qk.order(request.orderId) });
            // Fetch order to get deal_id and company_id for invalidation
            try {
                const order = await fetchOrder(request.orderId);
                if (order.deal_id) {
                    queryClient.invalidateQueries({ queryKey: qk.deal(order.deal_id) });
                    queryClient.invalidateQueries({ queryKey: qk.deals() });
                }
                if (order.company_id) {
                    queryClient.invalidateQueries({ queryKey: qk.company(order.company_id) });
                    queryClient.invalidateQueries({ queryKey: qk.companies() });
                }
            } catch (error) {
                // If fetch fails, just invalidate all
                queryClient.invalidateQueries({ queryKey: qk.deals() });
                queryClient.invalidateQueries({ queryKey: qk.companies() });
            }
        },
    });
}

// Soft delete order
export async function deleteOrder(id: string): Promise<void> {
    try {
        // Soft delete by setting deleted_at timestamp
        await apiClient.patch(`/orders?id=eq.${id}`, {
            deleted_at: new Date().toISOString()
        });
    } catch (error) {
        logger.error("Failed to delete order:", error);
        throw new Error("Failed to delete order");
    }
}

// Restore soft-deleted order
export async function restoreOrder(id: string): Promise<void> {
    try {
        await apiClient.patch(`/orders?id=eq.${id}`, {
            deleted_at: null
        });
    } catch (error) {
        logger.error("Failed to restore order:", error);
        throw new Error("Failed to restore order");
    }
}

// Fetch deleted orders
export async function fetchDeletedOrders(limit: number = 50): Promise<OrderUI[]> {
    try {
        const response = await apiClient.get(
            `/orders?deleted_at=not.is.null&select=*&order=deleted_at.desc&limit=${limit}`
        );
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[orders] Non-JSON response.");
        }

        const orders = Array.isArray(raw) ? raw : [raw];
        return orders.map(orderDbToUi);
    } catch (error) {
        logger.error("Failed to fetch deleted orders", { error }, 'DeletedOrders');
        throw new Error("Failed to fetch deleted orders");
    }
}

// React Query hooks for delete/restore
export function useDeleteOrder() {
    const qc = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: deleteOrder,
        onSuccess: (_, id) => {
            qc.invalidateQueries({ queryKey: qk.orders() });
            qc.invalidateQueries({ queryKey: qk.order(id) });
            // Note: We can't invalidate deal/company queries here without fetching the order first
            // But the order list refresh should be sufficient
        },
    });
}

export function useRestoreOrder() {
    const qc = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: restoreOrder,
        onSuccess: (_, id) => {
            qc.invalidateQueries({ queryKey: qk.orders() });
            qc.invalidateQueries({ queryKey: qk.order(id) });
            // Note: We can't invalidate deal/company queries here without fetching the order first
            // But the order list refresh should be sufficient
        },
    });
}