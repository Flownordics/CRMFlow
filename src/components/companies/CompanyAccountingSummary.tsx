import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Calculator, ExternalLink, Receipt, AlertCircle } from "lucide-react";
import { useInvoices } from "@/services/invoices";
import { formatMoneyMinor } from "@/lib/money";
import { Skeleton } from "@/components/ui/skeleton";

interface CompanyAccountingSummaryProps {
  companyId: string;
  currency?: string;
}

export function CompanyAccountingSummary({ companyId, currency = "DKK" }: CompanyAccountingSummaryProps) {
  const { data: invoicesData, isLoading } = useInvoices({ company_id: companyId, limit: 1000 });

  const invoices = invoicesData?.data || [];

  // Calculate totals
  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.balance_minor || 0), 0);
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total_minor, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paid_minor || 0), 0);

  // Count overdue invoices
  const today = new Date();
  const overdueInvoices = invoices.filter(
    (inv) => inv.balance_minor > 0 && inv.due_date && new Date(inv.due_date) < today
  );
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.balance_minor || 0), 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-muted-foreground" aria-hidden="true" focusable="false" />
            Accounting Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-muted-foreground" aria-hidden="true" focusable="false" />
            Accounting Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No invoices found for this company.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-muted-foreground" aria-hidden="true" focusable="false" />
            Accounting Summary
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to={`/invoices?company_id=${companyId}`}>
              View All <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Outstanding Balance */}
        {totalOutstanding > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg border bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-orange-600" aria-hidden="true" focusable="false" />
              <span className="text-sm font-medium">Outstanding Balance</span>
            </div>
            <span className="text-lg font-semibold text-orange-600">
              {formatMoneyMinor(totalOutstanding, currency)}
            </span>
          </div>
        )}

        {/* Overdue Amount */}
        {overdueAmount > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" focusable="false" />
              <span className="text-sm font-medium">
                Overdue ({overdueInvoices.length} invoice{overdueInvoices.length !== 1 ? 's' : ''})
              </span>
            </div>
            <span className="text-lg font-semibold text-red-600">
              {formatMoneyMinor(overdueAmount, currency)}
            </span>
          </div>
        )}

        {/* Totals Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="text-center p-3 rounded-lg border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Total Invoiced</div>
            <div className="text-sm font-semibold">{formatMoneyMinor(totalInvoiced, currency)}</div>
          </div>
          <div className="text-center p-3 rounded-lg border bg-green-50 dark:bg-green-950/20">
            <div className="text-xs text-muted-foreground mb-1">Total Paid</div>
            <div className="text-sm font-semibold text-green-700 dark:text-green-400">
              {formatMoneyMinor(totalPaid, currency)}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="pt-2 text-xs text-muted-foreground">
          {invoices.length} total invoice{invoices.length !== 1 ? 's' : ''}
        </div>
      </CardContent>
    </Card>
  );
}

