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
  return (
    <Card className="p-4 overflow-hidden relative">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            {aging ? (
              <>
                <div>0–30: <span className="font-medium">{formatMoneyMinor(aging["0-30"], currency)}</span></div>
                <div>31–60: <span className="font-medium">{formatMoneyMinor(aging["31-60"], currency)}</span></div>
                <div>61–90: <span className="font-medium">{formatMoneyMinor(aging["61-90"], currency)}</span></div>
                <div>90+: <span className="font-medium">{formatMoneyMinor(aging["90+"], currency)}</span></div>
              </>
            ) : "—"}
          </div>
        </div>
        <div className="rounded-full p-2 bg-primary/10">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" focusable="false" />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/5 to-transparent" aria-hidden="true" />
    </Card>
  );
}
