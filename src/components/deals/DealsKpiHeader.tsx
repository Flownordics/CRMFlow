import { formatMoneyMinor } from "@/lib/money";
import { Card } from "@/components/ui/card";
import { Briefcase, CalendarClock, Coins, ChartLine, TrendingUp } from "lucide-react";
import { useDealsBoardData, UseDealsBoardDataParams } from "@/hooks/useDealsBoardData";
import { useMemo } from "react";

export function DealsKpiHeader({
    params = {},
    currency = "DKK",
}: {
    params?: UseDealsBoardDataParams;
    currency?: string;
}) {
    const {
        deals,
        stages,
        stageTotalsMinor,
        activeStageTotalsMinor,
        weightedMinor,
        counts,
        isLoading,
        error
    } = useDealsBoardData(params);

    // Calculate total won value for this month
    const totalWonThisMonth = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return deals
            .filter(deal => {
                // Check if deal is in Won stage
                const stage = stages?.find(s => s.id === deal.stage_id);
                if (!stage || stage.name.toLowerCase() !== 'won') return false;

                // Check if deal was won this month (using close_date or updated_at)
                if (deal.close_date) {
                    const closeDate = new Date(deal.close_date);
                    return closeDate.getMonth() === currentMonth &&
                        closeDate.getFullYear() === currentYear;
                }

                // Fallback to updated_at if close_date is not available
                if (deal.updated_at) {
                    const updateDate = new Date(deal.updated_at);
                    return updateDate.getMonth() === currentMonth &&
                        updateDate.getFullYear() === currentYear;
                }

                return false;
            })
            .reduce((total, deal) => total + (deal.expected_value_minor || 0), 0);
    }, [deals, stages]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="p-4">
                        <div className="animate-pulse">
                            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                            <div className="h-8 bg-muted rounded w-1/2"></div>
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                <Card className="p-4 col-span-5">
                    <div className="text-center text-muted-foreground">
                        Error loading KPI data: {error.message}
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Total pipeline</div>
                        <div className="text-h2">{formatMoneyMinor(Object.values(activeStageTotalsMinor).reduce((a, b) => a + b, 0), currency)}</div>
                    </div>
                    <div className="rounded-full p-2 bg-primary/10">
                        <Briefcase className="h-4 w-4 text-primary" aria-hidden="true" focusable="false" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/5 to-transparent" aria-hidden="true" />
            </Card>
            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Expected closing (this month)</div>
                        <div className="text-h2">{counts.thisMonthExpected}</div>
                    </div>
                    <div className="rounded-full p-2 bg-accent/10">
                        <CalendarClock className="h-4 w-4 text-accent" aria-hidden="true" focusable="false" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-accent/5 to-transparent" aria-hidden="true" />
            </Card>
            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Total won by value (this month)</div>
                        <div className="text-h2">{formatMoneyMinor(totalWonThisMonth, currency)}</div>
                    </div>
                    <div className="rounded-full p-2 bg-success/10">
                        <Coins className="h-4 w-4 text-success" aria-hidden="true" focusable="false" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-success/5 to-transparent" aria-hidden="true" />
            </Card>
            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Weighted pipeline</div>
                        <div className="text-h2">{formatMoneyMinor(weightedMinor, currency)}</div>
                    </div>
                    <div className="rounded-full p-2 bg-warning/10">
                        <ChartLine className="h-4 w-4 text-warning" aria-hidden="true" focusable="false" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-warning/5 to-transparent" aria-hidden="true" />
            </Card>
            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Due soon ({counts.dueSoon})</div>
                        <div className="text-h2">{counts.dueSoon}</div>
                    </div>
                    <div className="rounded-full p-2 bg-danger/10">
                        <TrendingUp className="h-4 w-4 text-danger" aria-hidden="true" focusable="false" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-danger/5 to-transparent" aria-hidden="true" />
            </Card>
        </div>
    );
}
