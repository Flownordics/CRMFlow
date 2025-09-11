import { apiClient } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { toastBus } from "@/lib/toastBus";
import { logActivity } from "./activity";

// Deal stage automation rules
export interface DealStageRule {
    trigger: 'quote_created' | 'quote_accepted' | 'quote_declined' | 'order_created' | 'order_cancelled' | 'invoice_created' | 'invoice_paid';
    fromStage?: string; // Optional: only apply if deal is in this stage
    toStage: string; // Target stage to move deal to
    condition?: (deal: any, relatedEntity: any) => boolean; // Optional custom condition
}

// Default stage automation rules
export const DEFAULT_STAGE_RULES: DealStageRule[] = [
    // When a quote is created from a deal in "Prospecting", move to "Proposal"
    {
        trigger: 'quote_created',
        fromStage: 'Prospecting',
        toStage: 'Proposal'
    },

    // Note: quote_accepted trigger is handled by quote-to-order conversion flow
    // When quote is accepted, it converts to order which triggers order_created automation

    // When a quote is declined, move to "Closed Lost"
    {
        trigger: 'quote_declined',
        toStage: 'Closed Lost'
    },

    // When an order is created (quote converted to order), move to "Closed Won"
    {
        trigger: 'order_created',
        toStage: 'Closed Won'
    },

    // When an order is cancelled, move back to "Negotiation"
    {
        trigger: 'order_cancelled',
        toStage: 'Negotiation'
    },

    // When an invoice is created, ensure deal is in "Closed Won"
    {
        trigger: 'invoice_created',
        toStage: 'Closed Won'
    },

    // When an invoice is paid, ensure deal is in "Closed Won" (redundant but explicit)
    {
        trigger: 'invoice_paid',
        toStage: 'Closed Won'
    }
];

// Get stage ID by name (case-insensitive) from stages table
async function getStageIdByName(stageName: string): Promise<string | null> {
    try {
        console.log(`[DealStageAutomation] Looking up stage ID for name: "${stageName}"`);
        const response = await apiClient.get(`/stages?name=ilike.${encodeURIComponent(stageName)}&select=id`);
        const stages = response.data;
        console.log(`[DealStageAutomation] Found stages:`, stages);
        return stages && stages.length > 0 ? stages[0].id : null;
    } catch (error) {
        console.error(`Failed to find stage by name "${stageName}":`, error);
        return null;
    }
}

// Get stage name by ID from stages table
async function getStageNameById(stageId: string): Promise<string | null> {
    try {
        const response = await apiClient.get(`/stages?id=eq.${stageId}&select=name`);
        const stages = response.data;
        return stages && stages.length > 0 ? stages[0].name : null;
    } catch (error) {
        console.error(`Failed to find stage name by ID "${stageId}":`, error);
        return null;
    }
}

// Get all stages for debugging
async function getAllStages(): Promise<Array<{id: string, name: string}>> {
    try {
        const response = await apiClient.get(`/stages?select=id,name`);
        return response.data || [];
    } catch (error) {
        console.error(`Failed to get all stages:`, error);
        return [];
    }
}

// Update deal stage
async function updateDealStage(dealId: string, newStageId: string): Promise<void> {
    try {
        await apiClient.patch(`/deals?id=eq.${dealId}`, {
            stage_id: newStageId,
            updated_at: new Date().toISOString()
        });
    } catch (error) {
        console.error(`Failed to update deal ${dealId} stage to ${newStageId}:`, error);
        throw error;
    }
}

// Get deal by ID
async function getDealById(dealId: string): Promise<any | null> {
    try {
        const response = await apiClient.get(`/deals?id=eq.${dealId}&select=*`);
        const deals = response.data;
        return deals && deals.length > 0 ? deals[0] : null;
    } catch (error) {
        console.error(`Failed to fetch deal ${dealId}:`, error);
        return null;
    }
}

// Main automation function
export async function automateDealStage(
    trigger: DealStageRule['trigger'],
    dealId: string,
    relatedEntity?: any
): Promise<{ updated: boolean; fromStage?: string; toStage?: string; reason?: string }> {
    try {
        // Get the deal
        const deal = await getDealById(dealId);
        if (!deal) {
            console.warn(`Deal ${dealId} not found for stage automation`);
            return { updated: false, reason: 'Deal not found' };
        }

        // Get current stage name for comparison
        const currentStageName = await getStageNameById(deal.stage_id);
        console.log(`[DealStageAutomation] Deal ${dealId} current stage: "${currentStageName}" (ID: ${deal.stage_id})`);
        console.log(`[DealStageAutomation] Trigger: "${trigger}"`);
        
        // Find applicable rules
        const applicableRules = DEFAULT_STAGE_RULES.filter(rule => {
            if (rule.trigger !== trigger) return false;
            if (rule.fromStage && currentStageName?.toLowerCase() !== rule.fromStage.toLowerCase()) return false;
            if (rule.condition && !rule.condition(deal, relatedEntity)) return false;
            return true;
        });

        console.log(`[DealStageAutomation] Found ${applicableRules.length} applicable rules:`, applicableRules);

        if (applicableRules.length === 0) {
            console.log(`[DealStageAutomation] No applicable stage automation rules for trigger "${trigger}" on deal ${dealId}`);
            return { updated: false, reason: 'No applicable rules' };
        }

        // Apply the first applicable rule (in case of multiple matches)
        const rule = applicableRules[0];
        const newStageId = await getStageIdByName(rule.toStage);

        if (!newStageId) {
            console.error(`[DealStageAutomation] Target stage "${rule.toStage}" not found in database`);
            console.error(`[DealStageAutomation] Available stages:`, await getAllStages());
            return { updated: false, reason: `Target stage "${rule.toStage}" not found` };
        }

        // Don't update if already in the target stage
        if (deal.stage_id === newStageId) {
            console.log(`Deal ${dealId} is already in stage "${rule.toStage}"`);
            return { updated: false, reason: 'Already in target stage' };
        }

        // Update the deal stage
        await updateDealStage(dealId, newStageId);

        // Log activity
        try {
            await logActivity({
                type: "stage_changed",
                dealId: dealId,
                meta: {
                    fromStage: currentStageName,
                    toStage: rule.toStage,
                    trigger: trigger,
                    automated: true
                }
            });
        } catch (error) {
            console.warn("Failed to log stage change activity:", error);
        }

        console.log(`Deal ${dealId} automatically moved from "${currentStageName}" to "${rule.toStage}" due to ${trigger}`);

        return {
            updated: true,
            fromStage: currentStageName || undefined,
            toStage: rule.toStage,
            reason: `Automated stage change due to ${trigger}`
        };

    } catch (error) {
        console.error(`Failed to automate deal stage for deal ${dealId}:`, error);
        throw error;
    }
}

// React Query hook for deal stage automation
export function useAutomateDealStage() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ trigger, dealId, relatedEntity }: {
            trigger: DealStageRule['trigger'];
            dealId: string;
            relatedEntity?: any;
        }) => automateDealStage(trigger, dealId, relatedEntity),
        onSuccess: (result, variables) => {
            if (result.updated) {
                // Invalidate deals queries to refresh the UI
                qc.invalidateQueries({ queryKey: qk.deals() });
                qc.invalidateQueries({ queryKey: qk.deal(variables.dealId) });

                // Show success toast
                toastBus.emit({
                    title: "Deal Stage Updated",
                    description: `Deal automatically moved to ${result.toStage}`,
                    variant: "success"
                });
            }
        },
        onError: (error, variables) => {
            console.error(`Deal stage automation failed for deal ${variables.dealId}:`, error);
            toastBus.emit({
                title: "Stage Automation Failed",
                description: "Failed to automatically update deal stage",
                variant: "destructive"
            });
        }
    });
}

// Helper function to trigger automation from other services
export async function triggerDealStageAutomation(
    trigger: DealStageRule['trigger'],
    dealId: string,
    relatedEntity?: any
): Promise<void> {
    try {
        await automateDealStage(trigger, dealId, relatedEntity);
    } catch (error) {
        console.error(`Failed to trigger deal stage automation:`, error);
        // Don't throw - this is a background automation that shouldn't break the main flow
    }
}

// Batch automation for multiple deals (useful for data migration or bulk operations)
export async function batchAutomateDealStages(
    deals: Array<{ id: string; trigger: DealStageRule['trigger']; relatedEntity?: any }>
): Promise<{ success: number; failed: number; results: any[] }> {
    const results = [];
    let success = 0;
    let failed = 0;

    for (const deal of deals) {
        try {
            const result = await automateDealStage(deal.trigger, deal.id, deal.relatedEntity);
            results.push({ dealId: deal.id, ...result });
            if (result.updated) success++;
            else failed++;
        } catch (error) {
            console.error(`Batch automation failed for deal ${deal.id}:`, error);
            results.push({ dealId: deal.id, updated: false, error: error.message });
            failed++;
        }
    }

    return { success, failed, results };
}

// Export types for use in other services
export type { DealStageRule };
