import { formatMoneyMinor } from "@/lib/money";
import { FileText, Send, TrendingUp, CheckCircle } from "lucide-react";
import { Quote } from "@/services/quotes";
import { EnhancedKpiCard, EnhancedKpiGrid } from "@/components/common/kpi/EnhancedKpiCard";

interface QuotesKpiHeaderProps {
    quotes: Quote[];
    currency?: string;
}

export function QuotesKpiHeader({ quotes, currency = "DKK" }: QuotesKpiHeaderProps) {
    const totalCount = quotes.length;
    const totalValueMinor = quotes.reduce((sum, q) => sum + (q.total_minor || 0), 0);

    const byStatus = quotes.reduce((acc, q) => {
        acc[q.status] = (acc[q.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const sentCount = byStatus.sent || 0;
    const acceptedCount = byStatus.accepted || 0;
    const declinedCount = byStatus.declined || 0;
    const draftCount = byStatus.draft || 0;
    
    const hitRate = sentCount > 0 ? Math.round(((sentCount - declinedCount) / sentCount) * 100) : 0;
    const conversionRate = sentCount > 0 ? ((acceptedCount / sentCount) * 100) : 0;
    const sentPercentage = totalCount > 0 ? ((sentCount / totalCount) * 100) : 0;

    return (
        <EnhancedKpiGrid columns={4}>
            <EnhancedKpiCard
                title="Total Quotes"
                value={totalCount}
                subtitle={formatMoneyMinor(totalValueMinor, currency)}
                icon={FileText}
            />

            <EnhancedKpiCard
                title="Sent Quotes"
                value={sentCount}
                icon={Send}
                progress={sentPercentage}
                showProgress={true}
                progressLabel="Sent"
            />

            <EnhancedKpiCard
                title="Success Rate"
                value={`${hitRate}%`}
                icon={CheckCircle}
                progress={hitRate}
                showProgress={true}
                progressLabel="Success"
                target={`${sentCount - declinedCount} of ${sentCount}`}
                valueColor={
                    hitRate >= 70 ? "text-[#6b7c5e]" :
                    hitRate >= 40 ? "text-[#d4a574]" :
                    "text-[#b8695f]"
                }
            />

            <EnhancedKpiCard
                title="Draft Quotes"
                value={draftCount}
                subtitle={draftCount > 0 ? `${Math.round((draftCount / totalCount) * 100)}% of total` : "No drafts"}
                icon={FileText}
            />
        </EnhancedKpiGrid>
    );
}
