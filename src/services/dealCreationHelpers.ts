import { createDeal } from "./deals";
import { getStageIdByName, getDefaultPipelineId } from "@/lib/stageHelpers";
import { useAuthStore } from "@/stores/useAuthStore";
import { logger } from "@/lib/logger";
import { Deal } from "./deals";

/**
 * Create a deal with a specific stage name (e.g., "Proposal", "Negotiation")
 * @param companyId - Company ID for the deal
 * @param contactId - Optional contact ID
 * @param stageName - Name of the stage (e.g., "Proposal", "Negotiation")
 * @param title - Deal title (defaults to "Quote for [Company]" or "Order for [Company]")
 * @returns Created deal with ID
 */
export async function createDealWithStage(
  companyId: string,
  stageName: "Proposal" | "Negotiation",
  contactId?: string,
  title?: string
): Promise<Deal> {
  try {
    // Get default pipeline ID
    const pipelineId = await getDefaultPipelineId();
    if (!pipelineId) {
      throw new Error("No pipeline found. Please create a pipeline first.");
    }

    // Find stage ID by name
    const stageId = await getStageIdByName(stageName, pipelineId);
    if (!stageId) {
      throw new Error(`Stage "${stageName}" not found. Please ensure the stage exists in your pipeline.`);
    }

    // Get current user
    const { user } = useAuthStore.getState();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Create deal
    const deal = await createDeal({
      title: title || `${stageName === "Proposal" ? "Quote" : "Order"} for Company`,
      company_id: companyId,
      contact_id: contactId || null,
      stage_id: stageId,
      currency: "DKK",
      expected_value_minor: 0,
      close_date: null,
      owner_user_id: user.id || null,
      created_by: user.id || null,
    });

    logger.debug(`[createDealWithStage] Created deal ${deal.id} in stage "${stageName}"`);
    return deal;
  } catch (error) {
    logger.error(`[createDealWithStage] Failed to create deal with stage "${stageName}":`, error);
    throw error;
  }
}
