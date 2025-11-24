import { apiClient } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { toastBus } from "@/lib/toastBus";
import { logActivity } from "./activity";
import { logger } from '@/lib/logger';
import { projectService } from "./projects";

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

    // When a quote is declined, move to "Lost"
    {
        trigger: 'quote_declined',
        toStage: 'Lost'
    },

    // When an order is created (quote converted to order), move to "Won"
    {
        trigger: 'order_created',
        toStage: 'Won'
    },

    // When an order is cancelled, move back to "Negotiation"
    {
        trigger: 'order_cancelled',
        toStage: 'Negotiation'
    },

    // When an invoice is created, ensure deal is in "Won"
    {
        trigger: 'invoice_created',
        toStage: 'Won'
    },

    // When an invoice is paid, ensure deal is in "Won" (redundant but explicit)
    {
        trigger: 'invoice_paid',
        toStage: 'Won'
    }
];

// Get stage ID by name (case-insensitive) from stages table within a specific pipeline
async function getStageIdByName(stageName: string, pipelineId?: string): Promise<string | null> {
    try {
        logger.debug(`[DealStageAutomation] Looking up stage ID for name: "${stageName}"${pipelineId ? ` in pipeline: ${pipelineId}` : ''}`);

        let url = `/stages?name=ilike.${encodeURIComponent(stageName)}&select=id`;
        if (pipelineId) {
            url += `&pipeline_id=eq.${pipelineId}`;
        }

        const response = await apiClient.get(url);
        const stages = response.data;
        logger.debug(`[DealStageAutomation] Found stages:`, stages);
        return stages && stages.length > 0 ? stages[0].id : null;
    } catch (error) {
        logger.error(`Failed to find stage by name "${stageName}":`, error);
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
        logger.error(`Failed to find stage name by ID "${stageId}":`, error);
        return null;
    }
}

// Get pipeline ID for a stage
async function getPipelineIdByStageId(stageId: string): Promise<string | null> {
    try {
        const response = await apiClient.get(`/stages?id=eq.${stageId}&select=pipeline_id`);
        const stages = response.data;
        return stages && stages.length > 0 ? stages[0].pipeline_id : null;
    } catch (error) {
        logger.error(`Failed to find pipeline ID for stage "${stageId}":`, error);
        return null;
    }
}

// Get all stages for debugging
async function getAllStages(): Promise<Array<{ id: string, name: string }>> {
    try {
        const response = await apiClient.get(`/stages?select=id,name`);
        return response.data || [];
    } catch (error) {
        logger.error(`Failed to get all stages:`, error);
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
        logger.error(`Failed to update deal ${dealId} stage to ${newStageId}:`, error);
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
        logger.error(`Failed to fetch deal ${dealId}:`, error);
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
        logger.debug(`[DealStageAutomation] Starting automation for deal ${dealId} with trigger ${trigger}`);

        // First, let's check what stages exist
        const allStages = await getAllStages();
        logger.debug(`[DealStageAutomation] Available stages in database:`, allStages);

        // Get the deal
        const deal = await getDealById(dealId);
        if (!deal) {
            logger.warn(`Deal ${dealId} not found for stage automation`);
            return { updated: false, reason: 'Deal not found' };
        }

        // Get current stage name for comparison
        const currentStageName = await getStageNameById(deal.stage_id);
        logger.debug(`[DealStageAutomation] Deal ${dealId} current stage: "${currentStageName}" (ID: ${deal.stage_id})`);
        logger.debug(`[DealStageAutomation] Trigger: "${trigger}"`);

        // Get the pipeline ID for the deal's current stage to ensure we move within the same pipeline
        const pipelineId = await getPipelineIdByStageId(deal.stage_id);
        logger.debug(`[DealStageAutomation] Deal ${dealId} current pipeline: ${pipelineId}`);

        // Find applicable rules
        const applicableRules = DEFAULT_STAGE_RULES.filter(rule => {
            if (rule.trigger !== trigger) return false;
            if (rule.fromStage && currentStageName?.toLowerCase() !== rule.fromStage.toLowerCase()) return false;
            if (rule.condition && !rule.condition(deal, relatedEntity)) return false;
            return true;
        });

        logger.debug(`[DealStageAutomation] Found ${applicableRules.length} applicable rules:`, applicableRules);

        if (applicableRules.length === 0) {
            logger.debug(`[DealStageAutomation] No applicable stage automation rules for trigger "${trigger}" on deal ${dealId}`);
            return { updated: false, reason: 'No applicable rules' };
        }

        // Apply the first applicable rule (in case of multiple matches)
        const rule = applicableRules[0];
        const newStageId = await getStageIdByName(rule.toStage, pipelineId || undefined);

        if (!newStageId) {
            logger.error(`[DealStageAutomation] Target stage "${rule.toStage}" not found in pipeline ${pipelineId || 'any'}`);
            logger.error(`[DealStageAutomation] Available stages:`, await getAllStages());
            return { updated: false, reason: `Target stage "${rule.toStage}" not found in current pipeline` };
        }

        // Don't update if already in the target stage
        if (deal.stage_id === newStageId) {
            logger.debug(`Deal ${dealId} is already in stage "${rule.toStage}"`);
            return { updated: false, reason: 'Already in target stage' };
        }

        // Update the deal stage
        logger.debug(`[DealStageAutomation] Updating deal ${dealId} from stage ${deal.stage_id} to stage ${newStageId}`);
        await updateDealStage(dealId, newStageId);
        logger.debug(`[DealStageAutomation] Deal stage updated successfully`);

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
            logger.debug(`[DealStageAutomation] Activity logged successfully`);
        } catch (error) {
            logger.warn("Failed to log stage change activity:", error);
        }

        logger.debug(`[DealStageAutomation] Deal ${dealId} automatically moved from "${currentStageName}" to "${rule.toStage}" due to ${trigger}`);

        // Automatically update project status if deal is won or lost
        try {
            await updateProjectStatusForDeal(dealId, rule.toStage);
        } catch (error) {
            // Don't fail the deal stage automation if project update fails
            logger.warn(`[DealStageAutomation] Failed to update project status for deal ${dealId}:`, error);
        }

        return {
            updated: true,
            fromStage: currentStageName || undefined,
            toStage: rule.toStage,
            reason: `Automated stage change due to ${trigger}`
        };

    } catch (error) {
        logger.error(`Failed to automate deal stage for deal ${dealId}:`, error);
        throw error;
    }
}

// Helper function to update project status based on deal stage
// This can be called both from automation and manual deal stage changes
export async function updateProjectStatusForDeal(dealId: string, stageName: string): Promise<void> {
    const stageNameLower = stageName.toLowerCase();
    
    // Check if stage indicates "won" (won, closed won, etc.)
    const isWon = stageNameLower.includes('won') && !stageNameLower.includes('lost');
    
    // Check if stage indicates "lost" (lost, closed lost, etc.)
    const isLost = stageNameLower.includes('lost');
    
    if (isWon) {
        // Update project to "completed" when deal is won
        const project = await projectService.updateProjectStatusByDealId(dealId, 'completed');
        if (project) {
            logger.debug(`[ProjectStatusUpdate] Project ${project.id} automatically set to "completed" because deal ${dealId} is won`);
        }
    } else if (isLost) {
        // Update project to "cancelled" when deal is lost
        const project = await projectService.updateProjectStatusByDealId(dealId, 'cancelled');
        if (project) {
            logger.debug(`[ProjectStatusUpdate] Project ${project.id} automatically set to "cancelled" because deal ${dealId} is lost`);
        }
    }
    // If neither won nor lost, leave project status unchanged
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
                
                // Invalidate project queries to refresh project status
                qc.invalidateQueries({ queryKey: ['projects'] });
                qc.invalidateQueries({ queryKey: ['project'] });

                // Show success toast
                toastBus.emit({
                    title: "Deal Stage Updated",
                    description: `Deal automatically moved to ${result.toStage}`,
                    variant: "success"
                });
            }
        },
        onError: (error, variables) => {
            logger.error(`Deal stage automation failed for deal ${variables.dealId}:`, error);
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
        logger.error(`Failed to trigger deal stage automation:`, error);
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
            logger.error(`Batch automation failed for deal ${deal.id}:`, error);
            results.push({
                dealId: deal.id,
                updated: false,
                error: error instanceof Error ? error.message : String(error)
            });
            failed++;
        }
    }

    return { success, failed, results };
}
