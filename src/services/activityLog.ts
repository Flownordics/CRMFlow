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
            return 'bg-green-500';
        case 'yellow':
            return 'bg-yellow-500';
        case 'red':
            return 'bg-red-500';
        default:
            return 'bg-gray-400';
    }
}

export function getActivityStatusLabel(status: ActivityStatus | null | undefined): string {
    switch (status) {
        case 'green':
            return 'Aktiv (≤3 mdr)';
        case 'yellow':
            return 'Inaktiv (3-6 mdr)';
        case 'red':
            return 'Meget inaktiv (>6 mdr)';
        default:
            return 'Ingen aktivitet';
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
