import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { formatMoneyMinor } from "@/lib/money";
import { useCompanyLookup } from "@/hooks/useCompanyLookup";
import { generateFriendlyNumber } from "@/lib/friendlyNumbers";

interface OverdueInvoicesCardProps {
  invoices: Array<{
    id: string;
    number?: string;
    company_id?: string;
    due_date?: string;
    balance_minor?: number;
  }>;
  currency: string;
}

export function OverdueInvoicesCard({ invoices, currency }: OverdueInvoicesCardProps) {
  const { getCompanyName } = useCompanyLookup();
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Overdue invoices</h2>
        <Button asChild variant="ghost" size="sm" aria-label="Open invoices">
          <Link to="/invoices">
            View all <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <SimpleInvoiceTable
        ariaLabel="Overdue invoices"
        rows={invoices}
        currency={currency}
      />
    </Card>
  );
}

function SimpleInvoiceTable({ ariaLabel, rows, currency }: {
  ariaLabel: string; rows: Array<{
    id: string;
    number?: string;
    company_id?: string;
    due_date?: string;
    balance_minor?: number;
  }>; currency: string
}) {
  return (
    <div role="table" aria-label={ariaLabel} className="divide-y">
      <div role="row" className="grid grid-cols-5 py-2 text-xs text-muted-foreground">
        <div role="columnheader">Number</div>
        <div role="columnheader">Company</div>
        <div role="columnheader">Due</div>
        <div role="columnheader" className="text-right">Balance</div>
        <div role="columnheader" className="text-right">Action</div>
      </div>
      {(rows ?? []).map((r) => (
        <div role="row" key={r.id} className="grid grid-cols-5 py-2 text-sm">
          <div role="cell" className="truncate">{r.number ?? generateFriendlyNumber(r.id, 'invoice')}</div>
          <div role="cell" className="truncate">{getCompanyName(r.company_id)}</div>
          <div role="cell">{r.due_date ? new Date(r.due_date).toLocaleDateString() : "—"}</div>
          <div role="cell" className="text-right">{formatMoneyMinor(r.balance_minor ?? 0, currency)}</div>
          <div role="cell" className="text-right">
            <Button asChild size="sm" variant="ghost" aria-label={`Open invoice ${r.number ?? generateFriendlyNumber(r.id, 'invoice')}`}>
              <Link to={`/invoices/${r.id}`}>Open</Link>
            </Button>
          </div>
        </div>
      ))}
      {(!rows || rows.length === 0) && (
        <div className="py-4 text-sm text-muted-foreground">No data</div>
      )}
    </div>
  );
}
