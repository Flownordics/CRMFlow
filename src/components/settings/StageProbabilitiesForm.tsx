import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useStageProbabilities, useUpdateStageProbability } from "@/hooks/useSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { logger } from '@/lib/logger';

export function StageProbabilitiesForm() {
    const { data: stageProbabilities, isLoading, error } = useStageProbabilities();
    const updateProbability = useUpdateStageProbability();
    const [editingStage, setEditingStage] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const [localProbabilities, setLocalProbabilities] = useState<Record<string, number>>({});
    const debounceRefs = useRef<Record<string, NodeJS.Timeout>>({});

    // Initialize local probabilities when data loads
    useEffect(() => {
        if (stageProbabilities && Array.isArray(stageProbabilities)) {
            const initial = stageProbabilities.reduce((acc, sp) => {
                acc[sp.stage_id] = sp.probability;
                return acc;
            }, {} as Record<string, number>);
            setLocalProbabilities(initial);
        }
    }, [stageProbabilities]);

    const handleProbabilityChange = useCallback(async (stageId: string, probability: number) => {
        try {
            // Clear any existing debounce for this stage
            if (debounceRefs.current[stageId]) {
                clearTimeout(debounceRefs.current[stageId]);
            }

            // Set a new debounce
            debounceRefs.current[stageId] = setTimeout(async () => {
                await updateProbability.mutateAsync({ stageId, probability });
                delete debounceRefs.current[stageId];
            }, 300); // 300ms debounce
        } catch (error) {
            logger.error("Failed to update stage probability:", error);
        }
    }, [updateProbability]);

    const handleSliderChange = useCallback((stageId: string, values: number[]) => {
        const probability = values[0];
        // Update local state immediately for responsive UI
        setLocalProbabilities(prev => ({
            ...prev,
            [stageId]: probability
        }));
        // Debounce the API call
        handleProbabilityChange(stageId, probability);
    }, [handleProbabilityChange]);

    const handleInputChange = (stageId: string, value: string) => {
        setEditingStage(stageId);
        setEditValue(value);
    };

    const handleInputBlur = async (stageId: string) => {
        const probability = parseFloat(editValue);
        if (!isNaN(probability) && probability >= 0 && probability <= 1) {
            // Clear any pending debounce
            if (debounceRefs.current[stageId]) {
                clearTimeout(debounceRefs.current[stageId]);
                delete debounceRefs.current[stageId];
            }

            // Update local state
            setLocalProbabilities(prev => ({
                ...prev,
                [stageId]: probability
            }));

            // Make immediate API call for input blur
            await handleProbabilityChange(stageId, probability);
        }
        setEditingStage(null);
        setEditValue("");
    };

    const handleInputKeyDown = (stageId: string, e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleInputBlur(stageId);
        } else if (e.key === "Escape") {
            setEditingStage(null);
            setEditValue("");
        }
    };

    const formatPercentage = (probability: number) => {
        return `${Math.round(probability * 100)}%`;
    };

    if (isLoading) {
        return (
            <Card className="p-4">
                <div className="mb-3">
                    <h2 className="text-base font-semibold">Stage Probabilities</h2>
                    <p className="text-xs text-muted-foreground">
                        Configure win probability for each pipeline stage.
                    </p>
                </div>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center space-x-4">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-32 flex-1" />
                        </div>
                    ))}
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-4">
                <div className="mb-3">
                    <h2 className="text-base font-semibold">Stage Probabilities</h2>
                    <p className="text-xs text-muted-foreground">
                        Configure win probability for each pipeline stage.
                    </p>
                </div>
                <p className="text-sm text-destructive" role="alert">
                    Failed to load stage probabilities. Please try again.
                </p>
            </Card>
        );
    }

    if (!stageProbabilities || stageProbabilities.length === 0) {
        return (
            <Card className="p-4">
                <div className="mb-3">
                    <h2 className="text-base font-semibold">Stage Probabilities</h2>
                    <p className="text-xs text-muted-foreground">
                        Configure win probability for each pipeline stage.
                    </p>
                </div>
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        No stage probabilities found. This usually means:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-4">
                        <li>No pipeline stages have been created yet</li>
                        <li>The default sales pipeline needs to be initialized</li>
                        <li>Stage probabilities haven't been set up</li>
                    </ul>
                    <div className="bg-muted p-3 rounded-md">
                        <p className="text-xs font-medium mb-2">Default Sales Pipeline (if created):</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>Lead: 5% win rate</div>
                            <div>Qualified: 15% win rate</div>
                            <div>Proposal: 30% win rate</div>
                            <div>Negotiation: 60% win rate</div>
                            <div>Closed Won: 100% win rate</div>
                            <div>Closed Lost: 0% win rate</div>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Run the database migration to create the default pipeline and stages.
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-4">
            <div className="mb-3">
                <h2 className="text-base font-semibold">Stage Probabilities</h2>
                <p className="text-xs text-muted-foreground">
                    Configure win probability for each pipeline stage. These values are used for weighted pipeline calculations and forecasting.
                </p>
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs">
                    <p className="font-medium text-blue-700 dark:text-blue-300">💡 Tip:</p>
                    <p className="text-blue-600 dark:text-blue-400">
                        Adjust probabilities based on your sales funnel performance. Early stages typically have lower win rates,
                        while later stages have higher rates as deals progress through qualification.
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {Array.isArray(stageProbabilities) && stageProbabilities
                    .sort((a, b) => a.stages.position - b.stages.position)
                    .map((stageProb) => {
                        const stage = stageProb.stages;
                        // Use local probability if available, otherwise fall back to server data
                        const probability = localProbabilities[stageProb.stage_id] ?? stageProb.probability;

                        return (
                            <div key={stageProb.stage_id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="w-40">
                                    <div className="text-sm font-medium">{stage.name}</div>
                                    <div className="text-xs text-muted-foreground">Position {stage.position + 1}</div>
                                </div>

                                <div className="flex-1 max-w-64">
                                    <Slider
                                        value={[probability]}
                                        onValueChange={(values) => handleSliderChange(stageProb.stage_id, values)}
                                        max={1}
                                        min={0}
                                        step={0.05}
                                        className="w-full"
                                        aria-label={`Probability for ${stage.name}`}
                                    />
                                </div>

                                <div className="text-xs font-medium w-16 text-center">
                                    {formatPercentage(probability)}
                                </div>

                                {editingStage === stageProb.stage_id ? (
                                    <Input
                                        type="number"
                                        min={0}
                                        max={1}
                                        step={0.05}
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={() => handleInputBlur(stageProb.stage_id)}
                                        onKeyDown={(e) => handleInputKeyDown(stageProb.stage_id, e)}
                                        className="w-20"
                                        aria-label={`Edit probability for ${stage.name}`}
                                    />
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleInputChange(stageProb.stage_id, probability.toString())}
                                        aria-label={`Edit probability for ${stage.name}`}
                                    >
                                        Edit
                                    </Button>
                                )}
                            </div>
                        );
                    })}
            </div>
        </Card>
    );
}
