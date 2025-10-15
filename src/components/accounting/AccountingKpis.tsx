import { formatMoneyMinor } from "@/lib/money";
import { Coins, AlertCircle, CheckCircle2, Hourglass } from "lucide-react";
import { EnhancedKpiCard, EnhancedKpiGrid } from "@/components/common/kpi/EnhancedKpiCard";

interface AccountingKpisProps {
  summary: {
    outstandingMinor: number;
    overdueMinor: number;
    paidMinor: number;
    aging: { "0-30": number; "31-60": number; "61-90": number; "90+": number };
  } | undefined;
  currency: string;
}

export function AccountingKpis({ summary, currency }: AccountingKpisProps) {
  const total = summary?.aging ? 
    summary.aging["0-30"] + summary.aging["31-60"] + summary.aging["61-90"] + summary.aging["90+"] : 0;

  return (
    <EnhancedKpiGrid columns={4}>
      <EnhancedKpiCard
        title="Outstanding"
        value={summary ? formatMoneyMinor(summary.outstandingMinor, currency) : "—"}
        icon={Coins}
        iconColor="text-[#7a9db3]"
        isLoading={!summary}
      />

      <EnhancedKpiCard
        title="Overdue"
        value={summary ? formatMoneyMinor(summary.overdueMinor, currency) : "—"}
        icon={AlertCircle}
        iconColor={summary && summary.overdueMinor > 0 ? "text-[#b8695f]" : "text-muted-foreground"}
        valueColor={summary && summary.overdueMinor > 0 ? "text-[#b8695f]" : undefined}
        isLoading={!summary}
      />

      <EnhancedKpiCard
        title="Paid (period)"
        value={summary ? formatMoneyMinor(summary.paidMinor, currency) : "—"}
        icon={CheckCircle2}
        iconColor="text-[#6b7c5e]"
        valueColor="text-[#6b7c5e]"
        isLoading={!summary}
      />

      <EnhancedKpiCard
        title="Aging"
        value={summary ? formatMoneyMinor(total, currency) : "—"}
        icon={Hourglass}
        iconColor="text-[#d4a574]"
        isLoading={!summary}
        footer={
          summary?.aging ? (
            <AgingVisual aging={summary.aging} total={total} currency={currency} />
          ) : null
        }
      />
    </EnhancedKpiGrid>
  );
}

function AgingVisual({ aging, total, currency }: { aging: { "0-30": number; "31-60": number; "61-90": number; "90+": number }; total: number; currency: string }) {
  const buckets = [
    { key: "0-30", value: aging["0-30"], color: "bg-[#9d855e]" },
    { key: "31-60", value: aging["31-60"], color: "bg-[#b8947a]" },
    { key: "61-90", value: aging["61-90"], color: "bg-[#b8695f]" },
    { key: "90+", value: aging["90+"], color: "bg-[#a05d54]" },
  ];

  return (
    <div>
      {/* Visual stacked bar */}
      <div className="mb-2">
        <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted/30">
          {buckets.map((bucket) => {
            const percentage = total > 0 ? (bucket.value / total) * 100 : 0;
            return percentage > 0 ? (
              <div
                key={bucket.key}
                className={bucket.color}
                style={{ width: `${percentage}%` }}
                title={`${bucket.key} days: ${formatMoneyMinor(bucket.value, currency)}`}
              />
            ) : null;
          })}
        </div>
      </div>

      {/* Compact legend */}
      <div className="grid grid-cols-4 gap-1 text-[10px] text-muted-foreground">
        {buckets.map((bucket) => (
          <div key={bucket.key} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${bucket.color}`} />
            <span className="truncate">{bucket.key}d</span>
          </div>
        ))}
      </div>
    </div>
  );
}
