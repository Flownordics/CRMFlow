import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, ShoppingCart, Receipt, ExternalLink, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { formatMoneyMinor } from "@/lib/money";
import { Skeleton } from "@/components/ui/skeleton";

interface DealAccountingSummaryProps {
  dealId: string;
  currency?: string;
}

export function DealAccountingSummary({ dealId, currency = "DKK" }: DealAccountingSummaryProps) {
  // Fetch quotes for this deal
  const { data: quotesData, isLoading: quotesLoading } = useQuery({
    queryKey: qk.quotes({ dealId }),
    queryFn: async () => {
      const { fetchQuotes } = await import("@/services/quotes");
      return fetchQuotes({ dealId });
    },
  });

  // Fetch orders for this deal
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: qk.orders({ dealId }),
    queryFn: async () => {
      const { fetchOrders } = await import("@/services/orders");
      return fetchOrders({ dealId });
    },
  });

  // Fetch invoices for this deal
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: qk.invoices({ dealId }),
    queryFn: async () => {
      const { fetchInvoices } = await import("@/services/invoices");
      return fetchInvoices({ dealId });
    },
  });

  const quotes = quotesData?.data || [];
  const orders = ordersData?.data || [];
  const invoices = invoicesData?.data || [];

  const isLoading = quotesLoading || ordersLoading || invoicesLoading;

  // Calculate totals
  const totalQuoted = quotes.reduce((sum, q) => sum + q.total_minor, 0);
  const totalOrdered = orders.reduce((sum, o) => sum + (o.totalMinor || 0), 0);
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total_minor, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paid_minor || 0), 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.balance_minor || 0), 0);

  if (isLoading) {
    return (
      <div className="rounded-2xl border p-4 shadow-card">
        <h2 className="text-lg font-semibold mb-3">Deal to Cash</h2>
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  const hasAnyDocs = quotes.length > 0 || orders.length > 0 || invoices.length > 0;

  return (
    <div className="rounded-2xl border p-4 shadow-card">
      <h2 className="text-lg font-semibold mb-3">Deal to Cash</h2>

      {!hasAnyDocs ? (
        <p className="text-sm text-muted-foreground">No documents created for this deal yet.</p>
      ) : (
        <div className="space-y-3">
          {/* Quotes */}
          {quotes.length > 0 && (
            <Card className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" focusable="false" />
                  <span className="text-sm font-medium">
                    Quotes ({quotes.length})
                  </span>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                  <Link to={`/quotes?dealId=${dealId}`}>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                Total: <span className="font-medium text-foreground">{formatMoneyMinor(totalQuoted, currency)}</span>
              </div>
            </Card>
          )}

          {/* Orders */}
          {orders.length > 0 && (
            <Card className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" aria-hidden="true" focusable="false" />
                  <span className="text-sm font-medium">
                    Orders ({orders.length})
                  </span>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                  <Link to={`/orders?dealId=${dealId}`}>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                Total: <span className="font-medium text-foreground">{formatMoneyMinor(totalOrdered, currency)}</span>
              </div>
            </Card>
          )}

          {/* Invoices */}
          {invoices.length > 0 && (
            <Card className="p-3 bg-primary/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" aria-hidden="true" focusable="false" />
                  <span className="text-sm font-medium">
                    Invoices ({invoices.length})
                  </span>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                  <Link to={`/invoices?dealId=${dealId}`}>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
              <div className="space-y-1 text-sm">
                <div className="text-muted-foreground">
                  Total: <span className="font-medium text-foreground">{formatMoneyMinor(totalInvoiced, currency)}</span>
                </div>
                <div className="text-muted-foreground">
                  Paid: <span className="font-medium text-green-600">{formatMoneyMinor(totalPaid, currency)}</span>
                </div>
                {totalOutstanding > 0 && (
                  <div className="text-muted-foreground">
                    Outstanding: <span className="font-medium text-orange-600">{formatMoneyMinor(totalOutstanding, currency)}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Revenue Summary */}
          {totalPaid > 0 && (
            <Card className="p-3 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" aria-hidden="true" focusable="false" />
                  <span className="text-sm font-medium">Revenue Realized</span>
                </div>
                <span className="text-lg font-semibold text-green-600">
                  {formatMoneyMinor(totalPaid, currency)}
                </span>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

