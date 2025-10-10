import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { qk } from "@/lib/queryKeys";
import { toast } from "sonner";
import { logger } from '@/lib/logger';

// ===== SCHEMAS =====

export const Stage = z.object({
    id: z.string(),
    name: z.string(),
    position: z.number(),
    pipeline_id: z.string(),
});

export const StageProbability = z.object({
    stage_id: z.string(),
    probability: z.number().min(0).max(1),
    stages: Stage,
});

// Schema for upsert response (without stages object)
export const StageProbabilityUpsert = z.object({
    stage_id: z.string(),
    probability: z.number().min(0).max(1),
});

export type Stage = z.infer<typeof Stage>;
export type StageProbability = z.infer<typeof StageProbability>;
export type StageProbabilityUpsert = z.infer<typeof StageProbabilityUpsert>;

// ===== API FUNCTIONS =====

export async function listStages(pipelineId?: string): Promise<Stage[]> {
    try {
        let url = "/stages?select=id,name,position,pipeline_id&order=position";
        if (pipelineId) {
            url += `&pipeline_id=eq.${pipelineId}`;
        }

        const response = await api.get(url, {
            headers: {
                "Prefer": "return=representation",
                "count": "exact"
            }
        });

        const data = response.data;
        if (!data || data.length === 0) {
            return [];
        }

        return z.array(Stage).parse(data);
    } catch (error) {
        logger.error("Failed to fetch stages:", error);
        throw error;
    }
}

export async function listStageProbabilities(): Promise<StageProbability[]> {
    try {
        const response = await api.get("/stage_probabilities?select=stage_id,probability,stages(id,name,position,pipeline_id)&stages.order=position.asc", {
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

export async function upsertStageProbability({ stageId, probability }: { stageId: string; probability: number }): Promise<StageProbabilityUpsert> {
    try {
        const response = await api.post("/stage_probabilities", {
            stage_id: stageId,
            probability,
            updated_at: new Date().toISOString()
        }, {
            headers: {
                "Prefer": "resolution=merge-duplicates,return=representation",
                "count": "exact"
            }
        });

        const data = response.data;
        if (Array.isArray(data) && data.length > 0) {
            return StageProbabilityUpsert.parse(data[0]);
        }

        return StageProbabilityUpsert.parse(data);
    } catch (error) {
        logger.error("Failed to upsert stage probability:", error);
        throw error;
    }
}

// ===== REACT QUERY HOOKS =====

export function useStages(pipelineId?: string) {
    return useQuery({
        queryKey: qk.stages(pipelineId),
        queryFn: () => listStages(pipelineId),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useStageProbabilities() {
    return useQuery({
        queryKey: qk.stageProbabilities(),
        queryFn: listStageProbabilities,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useUpsertStageProbability() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: upsertStageProbability,
        onMutate: async ({ stageId, probability }) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: qk.stageProbabilities() });

            // Snapshot the previous value
            const previousProbabilities = queryClient.getQueryData(qk.stageProbabilities());

            // Optimistically update to the new value while preserving order
            queryClient.setQueryData(qk.stageProbabilities(), (old: StageProbability[] | undefined) => {
                if (!old) return old;
                return old.map(sp =>
                    sp.stage_id === stageId
                        ? { ...sp, probability, updated_at: new Date().toISOString() }
                        : sp
                );
            });

            // Return a context object with the snapshotted value
            return { previousProbabilities };
        },
        onError: (err, variables, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousProbabilities) {
                queryClient.setQueryData(qk.stageProbabilities(), context.previousProbabilities);
            }
            toast.error("Failed to update stage probability");
        },
        onSettled: () => {
            // Always refetch after error or success
            queryClient.invalidateQueries({ queryKey: qk.stageProbabilities() });
            // Also invalidate deals queries since probabilities affect weighted pipeline
            queryClient.invalidateQueries({ queryKey: qk.deals() });
        },
        onSuccess: () => {
            toast.success("Stage probability updated");
        },
    });
}
