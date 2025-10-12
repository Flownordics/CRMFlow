import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Building2, ExternalLink } from "lucide-react";
import { formatMoneyMinor } from "@/lib/money";
import { useCompanyLookup } from "@/hooks/useCompanyLookup";

interface CompanyBalance {
  company_id: string;
  balance_minor: number;
  invoice_count: number;
}

interface TopOutstandingCustomersProps {
  data: CompanyBalance[];
  currency?: string;
  limit?: number;
}

export function TopOutstandingCustomers({
  data,
  currency = "DKK",
  limit = 10,
}: TopOutstandingCustomersProps) {
  const { getCompanyName } = useCompanyLookup();

  const topCustomers = data
    .sort((a, b) => b.balance_minor - a.balance_minor)
    .slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" focusable="false" />
          <CardTitle className="text-base">Top Outstanding Customers</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Companies with highest outstanding balances
        </p>
      </CardHeader>
      <CardContent>
        {topCustomers.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No outstanding balances
          </div>
        ) : (
          <div className="space-y-3">
            {topCustomers.map((customer, index) => (
              <div
                key={customer.company_id}
                className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {getCompanyName(customer.company_id)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {customer.invoice_count} invoice{customer.invoice_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <div className="font-semibold text-sm whitespace-nowrap text-[#9d855e]">
                    {formatMoneyMinor(customer.balance_minor, currency)}
                  </div>
                  <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Link to={`/companies/${customer.company_id}`}>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {topCustomers.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Outstanding</span>
              <span className="font-semibold">
                {formatMoneyMinor(
                  topCustomers.reduce((sum, c) => sum + c.balance_minor, 0),
                  currency
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

