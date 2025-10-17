import { api } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { qk } from "@/lib/queryKeys";
import { logger } from '@/lib/logger';

// ===== SCHEMAS =====

export const WorkspaceSettings = z.object({
    id: z.string(),
    org_name: z.string().min(1),
    logo_url: z.string().url().optional().nullable(),
    pdf_footer: z.string().optional().nullable(),
    color_primary: z.string().optional().nullable(),
    // numbering strategy
    quote_prefix: z.string().min(1),
    order_prefix: z.string().min(1),
    invoice_prefix: z.string().min(1),
    pad: z.number().int().min(1).max(10),
    year_infix: z.boolean(),
    // defaults
    default_currency: z.enum(["DKK", "EUR", "USD"]),
    default_tax_pct: z.number().min(0).max(100),
    // email templates
    email_template_quote_html: z.string().optional().nullable(),
    email_template_quote_text: z.string().optional().nullable(),
    updated_at: z.string(),
});

export const StageProbability = z.object({
    stage_id: z.string(),
    probability: z.number().min(0).max(1),
    stages: z.object({
        name: z.string(),
        position: z.number(),
    }),
});

export type WorkspaceSettings = z.infer<typeof WorkspaceSettings>;
export type StageProbability = z.infer<typeof StageProbability>;

// User settings schema
export const UserSettingsSchema = z.object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    locale: z.enum(["en", "da"]).default("en"),
    theme: z.enum(["light", "dark", "system"]).default("system"),
    calendar_show_google: z.boolean().default(false),
    calendar_default_sync: z.boolean().default(false),
    timezone: z.string().default('Europe/Copenhagen'),
    created_at: z.string(),
    updated_at: z.string(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

// Update user settings payload
export const UpdateUserSettingsPayloadSchema = z.object({
    locale: z.enum(["en", "da"]).optional(),
    theme: z.enum(["light", "dark", "system"]).optional(),
    calendar_show_google: z.boolean().optional(),
    calendar_default_sync: z.boolean().optional(),
    timezone: z.string().optional(),
});

export type UpdateUserSettingsPayload = z.infer<typeof UpdateUserSettingsPayloadSchema>;

// ===== API FUNCTIONS =====

export async function getWorkspaceSettings(): Promise<WorkspaceSettings | null> {
    try {
        const response = await api.get("/workspace_settings?select=*&limit=1", {
            headers: {
                "Prefer": "return=representation",
                "count": "exact"
            }
        });

        const data = response.data;
        if (!data || data.length === 0) {
            return null;
        }

        return WorkspaceSettings.parse(data[0]);
    } catch (error) {
        logger.error("Failed to fetch workspace settings:", error);
        throw error;
    }
}

export async function upsertWorkspaceSettings(payload: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
    try {
        const response = await api.post("/workspace_settings", payload, {
            headers: {
                "Prefer": "resolution=merge-duplicates,return=representation",
                "count": "exact"
            }
        });

        const data = response.data;
        if (Array.isArray(data) && data.length > 0) {
            return WorkspaceSettings.parse(data[0]);
        }

        return WorkspaceSettings.parse(data);
    } catch (error) {
        logger.error("Failed to upsert workspace settings:", error);
        throw error;
    }
}

export async function getStageProbabilities(): Promise<StageProbability[]> {
    try {
        const response = await api.get("/stage_probabilities?select=stage_id,probability,stages(name,position)", {
            headers: {
                "Prefer": "return=representation",
                "count": "exact"
            }
        });

        const data = response.data;
        if (!data || data.length === 0) {
            return [];
        }

        return z.array(StageProbability).parse(data);
    } catch (error) {
        logger.error("Failed to fetch stage probabilities:", error);
        throw error;
    }
}

export async function upsertStageProbability(stageId: string, probability: number): Promise<StageProbability> {
    try {
        const response = await api.patch(`/stage_probabilities?stage_id=eq.${stageId}`, {
            probability,
            updated_at: new Date().toISOString()
        }, {
            headers: {
                "Prefer": "return=representation",
                "count": "exact"
            }
        });

        const data = response.data;
        if (Array.isArray(data) && data.length > 0) {
            return StageProbability.parse(data[0]);
        }

        return StageProbability.parse(data);
    } catch (error) {
        logger.error("Failed to update stage probability:", error);
        throw error;
    }
}

/**
 * Get user settings
 */
export async function getUserSettings(): Promise<UserSettings | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No settings found, create default settings
                return await createDefaultUserSettings();
            }
            throw new Error(`Failed to fetch user settings: ${error.message}`);
        }

        return UserSettingsSchema.parse(data);
    } catch (error) {
        logger.error('Error getting user settings:', error);
        throw error;
    }
}

/**
 * Create default user settings
 */
async function createDefaultUserSettings(): Promise<UserSettings> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
        .from('user_settings')
        .insert({
            user_id: user.id,
            calendar_show_google: false,
            calendar_default_sync: false,
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create user settings: ${error.message}`);
    }

    return UserSettingsSchema.parse(data);
}

/**
 * Update user settings
 */
export async function updateUserSettings(payload: UpdateUserSettingsPayload): Promise<UserSettings> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        const validatedPayload = UpdateUserSettingsPayloadSchema.parse(payload);

        const { data, error } = await supabase
            .from('user_settings')
            .update(validatedPayload)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update user settings: ${error.message}`);
        }

        return UserSettingsSchema.parse(data);
    } catch (error) {
        logger.error('Error updating user settings:', error);
        throw error;
    }
}

// React Query hooks

/**
 * Hook to get user settings
 */
export function useUserSettings() {
    return useQuery({
        queryKey: qk.userSettings(),
        queryFn: getUserSettings,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Hook to update user settings
 */
export function useUpdateUserSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateUserSettings,
        onSuccess: () => {
            // Invalidate user settings query
            queryClient.invalidateQueries({ queryKey: qk.userSettings() });
        },
    });
}

// ===== DEFAULT SETTINGS =====

export const DEFAULT_WORKSPACE_SETTINGS: Omit<WorkspaceSettings, 'id' | 'updated_at'> = {
    org_name: "Your Company",
    logo_url: null,
    pdf_footer: "Thank you for your business.",
    color_primary: null,
    quote_prefix: "QUOTE",
    order_prefix: "ORDER",
    invoice_prefix: "INV",
    pad: 4,
    year_infix: true,
    default_currency: "DKK",
    default_tax_pct: 25,
    email_template_quote_html: null,
    email_template_quote_text: null,
};
