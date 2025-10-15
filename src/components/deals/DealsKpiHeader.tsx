import { formatMoneyMinor } from "@/lib/money";
import { Briefcase, CalendarClock, Coins, ChartLine, TrendingUp } from "lucide-react";
import { useDealsBoardData, UseDealsBoardDataParams } from "@/hooks/useDealsBoardData";
import { useMemo } from "react";
import { EnhancedKpiCard, EnhancedKpiGrid } from "@/components/common/kpi/EnhancedKpiCard";

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

    if (isLoading || error) {
        return (
            <EnhancedKpiGrid columns={5}>
                {Array.from({ length: 5 }).map((_, i) => (
                    <EnhancedKpiCard
                        key={i}
                        title="Loading..."
                        value="..."
                        isLoading={true}
                    />
                ))}
            </EnhancedKpiGrid>
        );
    }

    const totalPipeline = Object.values(activeStageTotalsMinor).reduce((a, b) => a + b, 0);

    return (
        <EnhancedKpiGrid columns={5}>
            <EnhancedKpiCard
                title="Total Pipeline"
                value={formatMoneyMinor(totalPipeline, currency)}
                icon={Briefcase}
                iconColor="text-[#7a9db3]"
            />

            <EnhancedKpiCard
                title="Expected Closing"
                value={counts.thisMonthExpected}
                subtitle="this month"
                icon={CalendarClock}
                iconColor="text-[#c89882]"
            />

            <EnhancedKpiCard
                title="Won This Month"
                value={formatMoneyMinor(totalWonThisMonth, currency)}
                icon={Coins}
                iconColor="text-[#6b7c5e]"
                valueColor="text-[#6b7c5e]"
            />

            <EnhancedKpiCard
                title="Weighted Pipeline"
                value={formatMoneyMinor(weightedMinor, currency)}
                subtitle="probability-adjusted"
                icon={ChartLine}
                iconColor="text-[#d4a574]"
            />

            <EnhancedKpiCard
                title="Due Soon"
                value={counts.dueSoon}
                subtitle="needs attention"
                icon={TrendingUp}
                iconColor={counts.dueSoon > 0 ? "text-[#b8695f]" : "text-muted-foreground"}
                valueColor={counts.dueSoon > 0 ? "text-[#b8695f]" : undefined}
            />
        </EnhancedKpiGrid>
    );
}
