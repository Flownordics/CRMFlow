import { Card } from "@/components/ui/card";
import { formatMoneyMinor } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getStageTheme, stageTokenBg, stageTokenText } from "./stageTheme";

interface LineItem {
    unitMinor: number;
    qty: number;
}

export function DealsStageLegend({
    stages,
    deals,
    activeStageId,
    onStageToggle,
    stageTotalsMinor
}: {
    stages: Array<{ id: string; name: string }>;
    deals: Array<{ stageId: string; expectedValue?: number; currency?: string; lines?: LineItem[] }>;
    activeStageId?: string;
    onStageToggle?: (stageId: string) => void;
    stageTotalsMinor?: Record<string, number>;
}) {
    const currency = deals[0]?.currency ?? "DKK";

    return (
        <div className="flex flex-wrap gap-2 max-w-full">
            {stages.map(s => {
                const theme = getStageTheme(s.name);
                const total = stageTotalsMinor?.[s.id] ?? 0;
                return (
                    <Card
                        key={s.id}
                        className={cn(
                            "px-3 py-2 text-xs shrink-0 cursor-pointer transition-all hover:shadow-card",
                            activeStageId === s.id && "ring-2 ring-primary bg-primary/5"
                        )}
                        onClick={() => onStageToggle?.(s.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onStageToggle?.(s.id);
                            }
                        }}
                    >
                        <div className="inline-flex items-center gap-2">
                            <span className={cn("h-2 w-2 rounded-full", stageTokenBg(theme.color), stageTokenText(theme.color))} aria-hidden="true" />
                            <span className="font-medium">{s.name}</span>
                            <span className="text-muted-foreground">{formatMoneyMinor(total, currency)}</span>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
