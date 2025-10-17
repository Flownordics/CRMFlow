import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState, useCallback, memo, useRef } from "react";
import { Stage } from "@/services/pipelines";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { useMoveDeal } from "@/services/pipelines";
import { cn } from "@/lib/utils";
import { toastBus } from "@/lib/toastBus";
import { formatMoneyMinor } from "@/lib/money";
import { format, differenceInCalendarDays, isValid } from "date-fns";
import { KanbanDroppableColumn } from "./KanbanDroppableColumn";
import { DropPlaceholder } from "./DropPlaceholder";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { getStageTheme, stageTokenBg, stageTokenText, stageTokenRing } from "./stageTheme";
import { logger } from '@/lib/logger';

interface DealData {
    id: string;
    title: string;
    amountMinor?: number;
    closeDate?: string | null;
    currency?: string;
    companyId?: string;
    contactId?: string;
    expectedValue?: number;
    ownerUserId?: string;
    probability?: number;
    notes?: string;
    taxPct?: number;
}

// Configuration for stage limits
const STAGE_LIMITS: Record<string, number> = {
    won: 10,
    lost: 10,
    vundet: 10,
    tabt: 10,
    'closed won': 10,
    'closed lost': 10,
};

const DEFAULT_STAGE_LIMIT = 50; // Default for other stages

export function KanbanBoard({
    stages,
    dealsByStage,
    onCreateInStage,
    onStageChange,
    onOpenEdit,
}: {
    stages: Stage[];
    dealsByStage: Record<string, DealData[]>;
    onCreateInStage?: (stageId: string) => void;
    onStageChange?: (payload: { deal: DealData; fromStageId: string; toStageId: string; toStageName: string }) => void;
    onOpenEdit?: (deal: DealData) => void;
}) {
    // Debug logging for props
    logger.debug("[KanbanBoard] Props received:", {
        stagesCount: stages?.length || 0,
        stages: stages?.map(s => ({ id: s.id, name: s.name })),
        dealsByStageKeys: Object.keys(dealsByStage),
        dealsByStageCounts: Object.fromEntries(
            Object.entries(dealsByStage).map(([stageId, deals]) => [stageId, deals.length])
        )
    });
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    );
    const moveMutation = useMoveDeal();
    const [activeDeal, setActiveDeal] = useState<DealData | null>(null);
    
    // Track which stages are expanded (for Won/Lost with many deals)
    const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
    
    // Prevent duplicate move operations
    const movingRef = useRef(false);

    // Filter out "Qualified" stage and sort by order
    const columns = useMemo(
        () => stages
            .filter(s => s.name.toLowerCase() !== "qualified")
            .sort((a, b) => a.order - b.order),
        [stages],
    );
    
    // Helper to get the limit for a stage
    const getStageLimit = useCallback((stageName: string): number => {
        const lowerName = stageName.toLowerCase();
        return STAGE_LIMITS[lowerName] || DEFAULT_STAGE_LIMIT;
    }, []);
    
    // Helper to check if a stage should be limited
    const isLimitedStage = useCallback((stageName: string): boolean => {
        const lowerName = stageName.toLowerCase();
        return lowerName in STAGE_LIMITS;
    }, []);
    
    // Toggle stage expansion
    const toggleStageExpansion = useCallback((stageId: string) => {
        setExpandedStages(prev => {
            const next = new Set(prev);
            if (next.has(stageId)) {
                next.delete(stageId);
            } else {
                next.add(stageId);
            }
            return next;
        });
    }, []);

    // Memoize stage items for SortableContext - use only deal IDs
    const stageItems = useMemo(() => {
        const items: Record<string, string[]> = {};
        for (const stage of columns) {
            items[stage.id] = (dealsByStage[stage.id] ?? []).map(d => d.id);
        }
        return items;
    }, [dealsByStage, columns]);

    // Helper to find which stage a deal belongs to
    const getStageIdByDealId = useCallback((dealId: string): string | null => {
        for (const [stageId, deals] of Object.entries(dealsByStage)) {
            if (deals.some(d => d.id === dealId)) {
                return stageId;
            }
        }
        return null;
    }, [dealsByStage]);

    const onDragStart = useCallback((event: DragStartEvent) => {
        const dealId = String(event.active.id);
        logger.debug("[KanbanBoard] onDragStart - dealId:", dealId);
        
        const deal = Object.values(dealsByStage)
            .flat()
            .find(d => d.id === dealId);

        if (deal) {
            logger.debug("[KanbanBoard] onDragStart - found deal:", { id: deal.id, title: deal.title });
            setActiveDeal(deal);
        } else {
            logger.warn("[KanbanBoard] onDragStart - deal not found for id:", dealId);
        }
    }, [dealsByStage]);

    const onDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        
        logger.warn("[KanbanBoard] 🎯 onDragEnd CALLED with active.id:", active.id);
        
        // Prevent duplicate calls
        if (movingRef.current) {
            logger.error("[KanbanBoard] ⛔ BLOCKED duplicate onDragEnd call - already moving!");
            return;
        }
        
        if (!over) {
            logger.debug("[KanbanBoard] Drag ended without a drop target");
            setActiveDeal(null);
            return;
        }

        const dealId = String(active.id);
        logger.warn("[KanbanBoard] onDragEnd - dealId extracted:", dealId);
        let toStageId: string;

        // Handle different types of drop targets
        if (String(over.id).startsWith("col:")) {
            // Dropping on a stage column
            toStageId = String(over.id).replace("col:", "");
        } else {
            // Dropping on a deal card - find the stage of that deal
            const targetDealId = String(over.id);
            const targetStageId = getStageIdByDealId(targetDealId);

            if (!targetStageId) {
                logger.error("[KanbanBoard] Could not determine target stage for deal:", targetDealId);
                setActiveDeal(null);
                return;
            }

            toStageId = targetStageId;
        }

        const fromStageId = getStageIdByDealId(dealId);

        // Additional validation: ensure the target stage is in our columns
        const isValidTargetStage = columns.some(col => col.id === toStageId);
        if (!isValidTargetStage) {
            logger.error("[KanbanBoard] Invalid target stage - not in columns:", {
                toStageId,
                columnIds: columns.map(c => c.id),
                columnNames: columns.map(c => c.name)
            });
            setActiveDeal(null);
            return;
        }

        logger.debug("[KanbanBoard] Drag end:", {
            dealId,
            toStageId,
            fromStageId,
            availableStages: Object.keys(dealsByStage),
            overId: over.id,
            columns: columns.map(c => ({ id: c.id, name: c.name })),
            allStages: stages.map(s => ({ id: s.id, name: s.name }))
        });

        if (!fromStageId || fromStageId === toStageId) {
            setActiveDeal(null);
            return;
        }

        // Find the deal data
        const deal = dealsByStage[fromStageId]?.find(d => d.id === dealId);
        if (!deal) {
            setActiveDeal(null);
            return;
        }

        // Find the target stage name
        const targetStage = stages.find(s => s.id === toStageId);
        const toStageName = targetStage?.name || '';

        // Validate that the target stage exists in our available stages
        if (!dealsByStage[toStageId]) {
            logger.error("[KanbanBoard] Target stage not found:", {
                toStageId,
                availableStages: Object.keys(dealsByStage),
                columns: columns.map(c => c.id),
                allStages: stages.map(s => ({ id: s.id, name: s.name }))
            });
            toastBus.emit({
                title: "Invalid target stage",
                description: "Cannot move deal to this stage"
            });
            setActiveDeal(null);
            return;
        }

        // Calculate the correct index: append to end of target stage
        // Use -1 to signal backend to append (backend will auto-calculate)
        const targetIndex = fromStageId === toStageId ? 0 : -1;
        
        // Mark as moving
        movingRef.current = true;
        
        // Persist to backend
        logger.debug("[KanbanBoard] About to call moveMutation.mutate with:", {
            dealId,
            deal: { id: deal.id, title: deal.title },
            fromStageId,
            toStageId,
            toStageName,
            index: targetIndex
        });

        moveMutation.mutate(
            { dealId, stageId: toStageId, index: targetIndex },
            {
                onSuccess: () => {
                    logger.debug("[KanbanBoard] Move mutation succeeded for deal:", dealId);
                    toastBus.emit({ title: "Deal moved successfully" });
                    if (onStageChange) {
                        onStageChange({ deal, fromStageId, toStageId, toStageName });
                    }
                    // Reset moving flag
                    movingRef.current = false;
                },
                onError: (error) => {
                    logger.error("[KanbanBoard] Move mutation failed:", error);
                    toastBus.emit({
                        title: "Unable to move deal",
                        description: "Try again"
                    });
                    // Reset moving flag
                    movingRef.current = false;
                },
            }
        );

        setActiveDeal(null);
    }, [dealsByStage, getStageIdByDealId, onStageChange, moveMutation, columns, stages]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            <div className="flex gap-4 overflow-x-auto pb-2">
                {columns.map((col) => {
                    const allDeals = dealsByStage[col.id] ?? [];
                    const limit = getStageLimit(col.name);
                    const isLimited = isLimitedStage(col.name);
                    const isExpanded = expandedStages.has(col.id);
                    const hasMore = isLimited && allDeals.length > limit;
                    const visibleDeals = (isLimited && !isExpanded) ? allDeals.slice(0, limit) : allDeals;
                    const hiddenCount = allDeals.length - visibleDeals.length;
                    
                    return (
                        <div key={col.id} className="flex-1 min-w-[240px] max-w-[320px]">
                            <KanbanDroppableColumn id={`col:${col.id}`}>
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {(() => {
                                            const theme = getStageTheme(col.name);
                                            return (
                                                <span className={cn("h-2 w-2 rounded-full", stageTokenBg(theme.color), stageTokenText(theme.color))} aria-hidden="true" />
                                            );
                                        })()}
                                        <div className="text-sm font-medium truncate">{col.name}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={cn("rounded-full px-2 py-0.5 text-xs", stageTokenBg(getStageTheme(col.name).color), "text-muted-foreground")}>
                                            {allDeals.length}
                                        </div>
                                        {onCreateInStage && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        aria-label="Add deal"
                                                        onClick={() => onCreateInStage(col.id)}
                                                    >
                                                        <Plus
                                                            aria-hidden="true"
                                                            focusable="false"
                                                            className="h-4 w-4"
                                                        />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Add deal</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>
                                <SortableContext
                                    items={stageItems[col.id] ?? []}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="flex flex-col gap-2 flex-1 min-h-[200px] p-2">
                                        {visibleDeals.map((deal) => (
                                            <DraggableDeal
                                                key={deal.id}
                                                id={deal.id}
                                                deal={deal}
                                                stageId={col.id}
                                                stageName={col.name}
                                                onOpen={onOpenEdit}
                                            />
                                        ))}
                                        
                                        {/* Show "Show more" button if there are hidden deals */}
                                        {hasMore && !isExpanded && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full text-xs text-muted-foreground hover:text-foreground"
                                                onClick={() => toggleStageExpansion(col.id)}
                                            >
                                                <ChevronDown className="h-3 w-3 mr-1" />
                                                Vis {hiddenCount} flere
                                            </Button>
                                        )}
                                        
                                        {/* Show "Show less" button if expanded */}
                                        {isExpanded && isLimited && allDeals.length > limit && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full text-xs text-muted-foreground hover:text-foreground"
                                                onClick={() => toggleStageExpansion(col.id)}
                                            >
                                                <ChevronUp className="h-3 w-3 mr-1" />
                                                Vis færre
                                            </Button>
                                        )}
                                        
                                        {/* Show placeholder when column is empty */}
                                        {allDeals.length === 0 && (
                                            <DropPlaceholder />
                                        )}
                                    </div>
                                </SortableContext>
                            </KanbanDroppableColumn>
                        </div>
                    );
                })}
            </div>
            <DragOverlay>
                {activeDeal ? (
                    <div className="rounded-xl border bg-card p-3 shadow-lg opacity-90 cursor-grabbing">
                        <div className="font-medium">{activeDeal.title}</div>
                        {typeof activeDeal.amountMinor === "number" && activeDeal.amountMinor > 0 && (
                            <div className="text-xs text-muted-foreground">
                                {formatMoneyMinor(activeDeal.amountMinor, activeDeal.currency || "DKK")}
                            </div>
                        )}
                        {activeDeal.closeDate && (
                            <div className="text-xs text-muted-foreground">
                                {format(new Date(activeDeal.closeDate), "PP")}
                            </div>
                        )}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

// DraggableDeal component with stable props
interface DraggableDealProps {
    id: string;              // deal.id - stable identifier
    deal: DealData;
    stageId: string;
    stageName?: string;
    onOpen?: (deal: DealData) => void;
}

function DraggableDealBase({
    id,
    deal,
    stageName,
    onOpen,
}: DraggableDealProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id }); // Use deal.id as stable identifier

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const { t } = useI18n();
    const theme = getStageTheme(stageName);

    // Calculate if deal is due soon (≤ 7 days from now)
    const dueSoon = deal.closeDate && isValid(new Date(deal.closeDate)) &&
        differenceInCalendarDays(new Date(deal.closeDate), new Date()) <= 7;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onOpen?.(deal)}
            className={cn(
                "cursor-grab touch-none select-none rounded-xl border bg-card p-2.5 hover:shadow-hover transition-shadow w-full",
                "flex gap-2",
                isDragging && "opacity-75",
                "focus:outline-none focus-visible:ring-2",
                stageTokenRing(theme.color)
            )}
        >
            <div className={cn("w-1.5 shrink-0 rounded-sm", stageTokenBg(theme.color))} aria-hidden="true" />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                    {(() => {
                        const Icon = theme.icon;
                        return <Icon className={cn("h-4 w-4", stageTokenText(theme.color))} aria-hidden="true" focusable="false" />;
                    })()}
                    <div className="text-sm font-medium truncate">{deal.title}</div>
                </div>
                {typeof deal.amountMinor === "number" && deal.amountMinor > 0 && (
                    <div className="text-xs text-muted-foreground truncate">
                        {formatMoneyMinor(deal.amountMinor, deal.currency || "DKK")}
                    </div>
                )}
                {deal.closeDate && (
                    <div className="text-xs text-muted-foreground truncate">
                        {format(new Date(deal.closeDate), "PP")}
                    </div>
                )}
                {dueSoon && (
                    <Badge variant="destructive" className="mt-1 text-[10px] shrink-0">
                        {t("due_soon")}
                    </Badge>
                )}
            </div>
        </div>
    );
}

// Export memoized version for better performance
export const DraggableDeal = memo(DraggableDealBase);
