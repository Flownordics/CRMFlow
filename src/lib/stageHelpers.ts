import { apiClient } from "@/lib/api";
import { logger } from "@/lib/logger";

/**
 * Find stage ID by name (case-insensitive) from stages table
 * @param stageName - Name of the stage (e.g., "Proposal", "Negotiation")
 * @param pipelineId - Optional pipeline ID to filter by
 * @returns Stage ID or null if not found
 */
export async function getStageIdByName(stageName: string, pipelineId?: string): Promise<string | null> {
  try {
    logger.debug(`[getStageIdByName] Looking up stage ID for name: "${stageName}"${pipelineId ? ` in pipeline: ${pipelineId}` : ''}`);

    let url = `/stages?name=ilike.${encodeURIComponent(stageName)}&select=id`;
    if (pipelineId) {
      url += `&pipeline_id=eq.${pipelineId}`;
    }

    const response = await apiClient.get(url);
    const stages = response.data;
    logger.debug(`[getStageIdByName] Found stages:`, stages);
    return stages && stages.length > 0 ? stages[0].id : null;
  } catch (error) {
    logger.error(`Failed to find stage by name "${stageName}":`, error);
    return null;
  }
}

/**
 * Get the default pipeline ID (first pipeline)
 * @returns Pipeline ID or null if no pipelines exist
 */
export async function getDefaultPipelineId(): Promise<string | null> {
  try {
    const response = await apiClient.get("/pipelines?select=id&order=position&limit=1");
    const pipelines = response.data;
    return pipelines && pipelines.length > 0 ? pipelines[0].id : null;
  } catch (error) {
    logger.error("Failed to get default pipeline:", error);
    return null;
  }
}

/**
 * Get the first stage ID from a pipeline (lowest position)
 * @param pipelineId - Pipeline ID
 * @returns Stage ID or null if not found
 */
export async function getFirstStageIdFromPipeline(pipelineId: string): Promise<string | null> {
  try {
    logger.debug(`[getFirstStageIdFromPipeline] Looking up first stage for pipeline: ${pipelineId}`);
    const response = await apiClient.get(`/stages?pipeline_id=eq.${pipelineId}&select=id&order=position&limit=1`);
    const stages = response.data;
    logger.debug(`[getFirstStageIdFromPipeline] Found stages:`, stages);
    return stages && stages.length > 0 ? stages[0].id : null;
  } catch (error) {
    logger.error(`Failed to find first stage for pipeline "${pipelineId}":`, error);
    return null;
  }
}

/**
 * Get pipeline ID from a stage ID
 * @param stageId - Stage ID
 * @returns Pipeline ID or null if not found
 */
export async function getPipelineIdFromStageId(stageId: string): Promise<string | null> {
  try {
    logger.debug(`[getPipelineIdFromStageId] Looking up pipeline for stage: ${stageId}`);
    const response = await apiClient.get(`/stages?id=eq.${stageId}&select=pipeline_id`);
    const stages = response.data;
    logger.debug(`[getPipelineIdFromStageId] Found stages:`, stages);
    return stages && stages.length > 0 ? stages[0].pipeline_id : null;
  } catch (error) {
    logger.error(`Failed to find pipeline for stage "${stageId}":`, error);
    return null;
  }
}
