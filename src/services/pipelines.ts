import { apiClient } from "@/lib/api";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { rpcReorderDeal } from "./deals";
import { logger } from '@/lib/logger';

export const Stage = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number(),
});

export const Pipeline = z.object({
  id: z.string(),
  name: z.string(),
  stages: z.array(Stage),
});

export type Stage = z.infer<typeof Stage>;
export type Pipeline = z.infer<typeof Pipeline>;

export async function fetchPipelines(): Promise<Pipeline[]> {
  try {
    const response = await apiClient.get("/pipelines?select=id,name&order=position");
    const raw = response.data;

    if (Array.isArray(raw) && raw.length > 0) {
      // Fetch stages for each pipeline
      const pipelinesWithStages = await Promise.all(
        raw.map(async (pipeline: any) => {
          const stagesResponse = await apiClient.get(`/stages?pipeline_id=eq.${pipeline.id}&select=id,name,position&order=position`);
          const stages = stagesResponse.data || [];
          return {
            id: pipeline.id,
            name: pipeline.name,
            stages: stages.map((stage: any) => ({
              id: stage.id,
              name: stage.name,
              order: stage.position
            }))
          };
        })
      );
      return pipelinesWithStages;
    }

    // Fallback to mock data if no pipelines found
    const { mockPipeline } = await import("./mockData");
    return [mockPipeline];
  } catch (error) {
    logger.error("Failed to fetch pipelines:", error);
    // Fallback to mock data
    const { mockPipeline } = await import("./mockData");
    return [mockPipeline];
  }
}

export function usePipelines() {
  return useQuery({
    queryKey: qk.pipelines(),
    queryFn: fetchPipelines,
  });
}

export async function moveDeal(
  dealId: string,
  toStageId: string,
  index: number = 0,
) {
  return rpcReorderDeal(dealId, toStageId, index);
}

export function useMoveDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dealId,
      stageId,
      index,
    }: {
      dealId: string;
      stageId: string;
      index?: number;
    }) => moveDeal(dealId, stageId, index),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: qk.deals() });
      // Log activity for stage change
      import("@/services/activity").then(({ logActivity }) => {
        // We need to get the current stage from the deals query
        const currentDeals = qc.getQueryData(qk.deals());
        if (currentDeals && typeof currentDeals === 'object' && 'data' in currentDeals) {
          // Handle PaginatedResponse format
          const deals = (currentDeals as any).data || [];
          const deal = deals.find((d: any) => d.id === variables.dealId);
          if (deal) {
            logActivity({
              type: "stage_changed",
              dealId: variables.dealId,
              meta: {
                fromStage: deal.stage_id,
                toStage: variables.stageId
              }
            });
          }
        }
      });
    },
  });
}

export async function fetchStageProbabilities(): Promise<Record<string, number>> {
  try {
    const response = await apiClient.get("/stage_probabilities?select=stage_id,probability");
    const raw = response.data;

    if (Array.isArray(raw)) {
      // Convert to map { [stageId]: probabilityPct }
      const probMap: Record<string, number> = {};
      raw.forEach((item: any) => {
        if (item.stage_id && typeof item.probability === 'number') {
          // Convert from 0-1 to 0-100 percentage
          probMap[item.stage_id] = Math.round(item.probability * 100);
        }
      });
      return probMap;
    }

    // Fallback to default probabilities
    return {};
  } catch (error) {
    logger.error("Failed to fetch stage probabilities:", error);
    // Fallback to default probabilities
    return {};
  }
}

export function useStageProbabilities() {
  return useQuery({
    queryKey: qk.stageProbabilities(),
    queryFn: fetchStageProbabilities,
  });
}
