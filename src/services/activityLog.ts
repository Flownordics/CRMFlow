import { apiClient, apiPostWithReturn, normalizeApiData } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { z } from "zod";
import {
    activityLogReadSchema,
    activityLogCreateSchema,
    type ActivityLog,
    type ActivityLogCreate,
    type ActivityStatus,
} from "@/lib/schemas/callList";
import { handleError } from "@/lib/errorHandler";
import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";

// ========== Activity Log CRUD ==========

export async function fetchCompanyActivityLogs(companyId: string) {
    try {
        const response = await apiClient.get(
            `/activity_log?company_id=eq.${companyId}&select=*&order=created_at.desc&limit=100`
        );
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[activity_log] Non-JSON response");
        }

        const logs = Array.isArray(raw) ? raw : [raw];
        const mappedLogs = logs.map((log: any) => ({
            id: log.id,
            companyId: log.company_id,
            userId: log.user_id,
            type: log.type,
            outcome: log.outcome,
            notes: log.notes,
            meta: log.meta,
            relatedType: log.related_type,
            relatedId: log.related_id,
            createdAt: log.created_at,
        }));

        return z.array(activityLogReadSchema).parse(mappedLogs);
    } catch (error) {
        throw handleError(error, `fetchCompanyActivityLogs(${companyId})`);
    }
}

export async function logCompanyActivity(data: ActivityLogCreate): Promise<ActivityLog> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        const dbData = {
            company_id: data.companyId,
            user_id: user?.id || null,
            type: data.type,
            outcome: data.outcome,
            notes: data.notes,
            meta: data.meta || {},
            related_type: data.relatedType || null,
            related_id: data.relatedId || null,
        };

        const response = await apiPostWithReturn("/activity_log", dbData);
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[activity_log] Non-JSON response");
        }

        const created = Array.isArray(raw) ? raw[0] : raw;
        const mappedLog = {
            id: created.id,
            companyId: created.company_id,
            userId: created.user_id,
            type: created.type,
            outcome: created.outcome,
            notes: created.notes,
            meta: created.meta,
            relatedType: created.related_type,
            relatedId: created.related_id,
            createdAt: created.created_at,
        };

        return activityLogReadSchema.parse(mappedLog);
    } catch (error) {
        throw handleError(error, 'logCompanyActivity');
    }
}

// ========== Activity Status Helpers ==========

export function getActivityStatusColor(status: ActivityStatus | null | undefined): string {
    switch (status) {
        case 'green':
            return 'bg-[#b5c69f]';
        case 'yellow':
            return 'bg-[#d4a574]';
        case 'red':
            return 'bg-[#fb8674]';
        default:
            return 'bg-gray-400';
    }
}

export function getActivityStatusLabel(status: ActivityStatus | null | undefined): string {
    switch (status) {
        case 'green':
            return 'Active (≤3 mo)';
        case 'yellow':
            return 'Inactive (3-6 mo)';
        case 'red':
            return 'Very inactive (>6 mo)';
        default:
            return 'No activity';
    }
}

export function getDaysSinceActivity(lastActivityAt: string | null | undefined): number | null {
    if (!lastActivityAt) return null;

    const now = new Date();
    const lastActivity = new Date(lastActivityAt);
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
}

// ========== React Query Hooks ==========

export function useCompanyActivityLogs(companyId: string) {
    return useQuery({
        queryKey: qk.companyActivityLogs(companyId),
        queryFn: () => fetchCompanyActivityLogs(companyId),
        enabled: !!companyId,
    });
}

export function useLogCompanyActivity(companyId: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: logCompanyActivity,
        onSuccess: () => {
            // Invalidate activity logs
            qc.invalidateQueries({ queryKey: qk.companyActivityLogs(companyId) });

            // Invalidate company data to refresh activity status
            qc.invalidateQueries({ queryKey: qk.company(companyId) });
            qc.invalidateQueries({ queryKey: qk.companies() });
        },
    });
}

// ========== Helper Functions for Common Activity Types ==========

export async function logCall(companyId: string, outcome: string, notes?: string) {
    return logCompanyActivity({
        companyId,
        type: 'call',
        outcome,
        notes,
        meta: { timestamp: new Date().toISOString() },
    });
}

export async function logEmail(companyId: string, outcome: string, notes?: string) {
    return logCompanyActivity({
        companyId,
        type: 'email',
        outcome,
        notes,
        meta: { timestamp: new Date().toISOString() },
    });
}

export async function logMeeting(companyId: string, outcome: string, notes?: string) {
    return logCompanyActivity({
        companyId,
        type: 'meeting',
        outcome,
        notes,
        meta: { timestamp: new Date().toISOString() },
    });
}

export async function logNote(companyId: string, notes: string) {
    return logCompanyActivity({
        companyId,
        type: 'note',
        notes,
        meta: { timestamp: new Date().toISOString() },
    });
}

// Auto-log activities when deals/quotes/orders/invoices are created
export async function logDealCreated(companyId: string, dealId: string, dealTitle: string) {
    return logCompanyActivity({
        companyId,
        type: 'deal',
        notes: `Deal oprettet: ${dealTitle}`,
        relatedType: 'deal',
        relatedId: dealId,
        meta: { dealTitle },
    });
}

export async function logQuoteCreated(companyId: string, quoteId: string, quoteNumber: string) {
    return logCompanyActivity({
        companyId,
        type: 'quote',
        notes: `Tilbud oprettet: ${quoteNumber}`,
        relatedType: 'quote',
        relatedId: quoteId,
        meta: { quoteNumber },
    });
}

export async function logOrderCreated(companyId: string, orderId: string, orderNumber: string) {
    return logCompanyActivity({
        companyId,
        type: 'order',
        notes: `Ordre oprettet: ${orderNumber}`,
        relatedType: 'order',
        relatedId: orderId,
        meta: { orderNumber },
    });
}

export async function logInvoiceCreated(companyId: string, invoiceId: string, invoiceNumber: string) {
    return logCompanyActivity({
        companyId,
        type: 'invoice',
        notes: `Faktura oprettet: ${invoiceNumber}`,
        relatedType: 'invoice',
        relatedId: invoiceId,
        meta: { invoiceNumber },
    });
}

export async function logPaymentReceived(companyId: string, invoiceId: string, amountMinor: number) {
    return logCompanyActivity({
        companyId,
        type: 'payment',
        outcome: 'completed',
        notes: `Betaling modtaget: ${(amountMinor / 100).toLocaleString('da-DK')} DKK`,
        relatedType: 'invoice',
        relatedId: invoiceId,
        meta: { amountMinor },
    });
}
