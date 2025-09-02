import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import {
    getWorkspaceSettings,
    upsertWorkspaceSettings,
    type WorkspaceSettings
} from "@/services/settings";
import {
    listStageProbabilities,
    upsertStageProbability,
    type StageProbability
} from "@/services/stageProbabilities";
import { toast } from "sonner";

// ===== WORKSPACE SETTINGS HOOKS =====

export function useWorkspaceSettings() {
    return useQuery({
        queryKey: qk.workspaceSettings(),
        queryFn: getWorkspaceSettings,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useUpdateWorkspaceSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: upsertWorkspaceSettings,
        onMutate: async (newSettings) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: qk.workspaceSettings() });

            // Snapshot the previous value
            const previousSettings = queryClient.getQueryData(qk.workspaceSettings());

            // Optimistically update to the new value
            queryClient.setQueryData(qk.workspaceSettings(), (old: WorkspaceSettings | null) => {
                if (!old) {
                    return {
                        id: "temp-id",
                        ...newSettings,
                        updated_at: new Date().toISOString(),
                    } as WorkspaceSettings;
                }
                return { ...old, ...newSettings, updated_at: new Date().toISOString() };
            });

            // Return a context object with the snapshotted value
            return { previousSettings };
        },
        onError: (err, newSettings, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousSettings) {
                queryClient.setQueryData(qk.workspaceSettings(), context.previousSettings);
            }
            toast.error("Failed to update settings");
        },
        onSettled: () => {
            // Always refetch after error or success
            queryClient.invalidateQueries({ queryKey: qk.workspaceSettings() });
        },
        onSuccess: () => {
            toast.success("Settings updated successfully");
        },
    });
}

// ===== STAGE PROBABILITIES HOOKS =====

export function useStageProbabilities() {
    return useQuery({
        queryKey: qk.stageProbabilities(),
        queryFn: listStageProbabilities,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useUpdateStageProbability() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ stageId, probability }: { stageId: string; probability: number }) =>
            upsertStageProbability({ stageId, probability }),
        onMutate: async ({ stageId, probability }) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: qk.stageProbabilities() });

            // Snapshot the previous value
            const previousProbabilities = queryClient.getQueryData(qk.stageProbabilities());

            // Optimistically update to the new value
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
