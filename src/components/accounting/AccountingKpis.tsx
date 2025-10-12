import { Card } from "@/components/ui/card";
import { formatMoneyMinor } from "@/lib/money";
import { Coins, AlertCircle, CheckCircle2, Hourglass } from "lucide-react";

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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        label="Outstanding"
        value={summary ? formatMoneyMinor(summary.outstandingMinor, currency) : "—"}
        Icon={Coins}
      />
      <KpiCard
        label="Overdue"
        value={summary ? formatMoneyMinor(summary.overdueMinor, currency) : "—"}
        Icon={AlertCircle}
      />
      <KpiCard
        label="Paid (period)"
        value={summary ? formatMoneyMinor(summary.paidMinor, currency) : "—"}
        Icon={CheckCircle2}
      />
      <KpiAging
        label="Aging"
        aging={summary?.aging}
        Icon={Hourglass}
        currency={currency}
      />
    </div>
  );
}

function KpiCard({ label, value, Icon }: { label: string; value: string; Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean; focusable?: boolean }> }) {
  return (
    <Card className="p-4 overflow-hidden relative">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
        <div className="rounded-full p-2 bg-primary/10">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" focusable="false" />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/5 to-transparent" aria-hidden="true" />
    </Card>
  );
}

function KpiAging({ label, aging, Icon, currency }: { label: string; aging?: { "0-30": number; "31-60": number; "61-90": number; "90+": number }; Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean; focusable?: boolean }>; currency: string }) {
  if (!aging) {
    return (
      <Card className="p-4 overflow-hidden relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold">—</div>
          </div>
          <div className="rounded-full p-2 bg-primary/10">
            <Icon className="h-4 w-4 text-primary" aria-hidden="true" focusable="false" />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/5 to-transparent" aria-hidden="true" />
      </Card>
    );
  }

  const total = aging["0-30"] + aging["31-60"] + aging["61-90"] + aging["90+"];
  const buckets = [
    { key: "0-30", value: aging["0-30"], color: "bg-[#9d855e]" }, // Muted gold
    { key: "31-60", value: aging["31-60"], color: "bg-[#b8947a]" }, // Muted warm
    { key: "61-90", value: aging["61-90"], color: "bg-[#b8695f]" }, // Muted coral
    { key: "90+", value: aging["90+"], color: "bg-[#a05d54]" }, // Darker muted coral
  ];

  return (
    <Card className="p-4 overflow-hidden relative">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{formatMoneyMinor(total, currency)}</div>
        </div>
        <div className="rounded-full p-2 bg-primary/10">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" focusable="false" />
        </div>
      </div>

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

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/5 to-transparent" aria-hidden="true" />
    </Card>
  );
}
