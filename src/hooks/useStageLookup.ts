import { useMemo } from "react";
import { usePipelines } from "@/services/pipelines";

/**
 * Hook for efficient stage name lookup by ID
 * Fetches all pipelines and stages once and provides a lookup function
 */
export function useStageLookup() {
    const { data: pipelines, isLoading, error } = usePipelines();

    // Flatten all stages from all pipelines
    const allStages = useMemo(() => {
        if (!pipelines) return [];
        return pipelines.flatMap(pipeline =>
            pipeline.stages.map(stage => ({
                id: stage.id,
                name: stage.name,
                pipelineId: pipeline.id,
                pipelineName: pipeline.name
            }))
        );
    }, [pipelines]);

    // Create a lookup map for O(1) access
    const stageMap = useMemo(() => {
        const map = new Map<string, { name: string; pipelineId: string; pipelineName: string }>();
        allStages.forEach(stage => {
            map.set(stage.id, {
                name: stage.name,
                pipelineId: stage.pipelineId,
                pipelineName: stage.pipelineName
            });
        });
        return map;
    }, [allStages]);

    // Function to get stage name by ID
    const getStageName = (stageId: string | null | undefined): string => {
        if (!stageId) return "—";
        return stageMap.get(stageId)?.name || `Stage ${stageId.slice(0, 8)}`;
    };

    // Function to get stage info by ID
    const getStageInfo = (stageId: string | null | undefined): { name: string; pipelineId: string; pipelineName: string } | null => {
        if (!stageId) return null;
        return stageMap.get(stageId) || null;
    };

    return {
        getStageName,
        getStageInfo,
        isLoading,
        error,
        stages: allStages
    };
}
