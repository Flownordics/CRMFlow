import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { PaymentWithInvoice } from "@/services/payments";
import { formatMoneyMinor } from "@/lib/money";
import { useCompanyLookup } from "@/hooks/useCompanyLookup";
import { generateFriendlyNumber } from "@/lib/friendlyNumbers";
import { cn } from "@/lib/utils";

interface PaymentHistoryCardProps {
  payments: PaymentWithInvoice[];
  limit?: number;
  showViewAll?: boolean;
}

const paymentMethodColors: Record<string, string> = {
  bank: "text-blue-600",
  card: "text-purple-600",
  cash: "text-green-600",
  other: "text-gray-600",
};

export function PaymentHistoryCard({ payments, limit = 10, showViewAll = true }: PaymentHistoryCardProps) {
  const { getCompanyName } = useCompanyLookup();
  const displayPayments = limit ? payments.slice(0, limit) : payments;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden="true" focusable="false" />
          <h2 className="text-base font-semibold">Recent Payments</h2>
        </div>
        {showViewAll && (
          <Button asChild variant="ghost" size="sm" aria-label="View all payments">
            <Link to="/accounting">
              View all <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>

      {displayPayments.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No recent payments
        </div>
      ) : (
        <div className="space-y-3">
          {displayPayments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/invoices/${payment.invoice_id}`}
                    className="font-medium text-sm hover:text-primary transition-colors"
                  >
                    {payment.invoice_number ?? generateFriendlyNumber(payment.invoice_id, 'invoice')}
                  </Link>
                  <span className={cn("text-xs", paymentMethodColors[payment.method] || paymentMethodColors.other)}>
                    •
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {payment.method}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {getCompanyName(payment.company_id)} • {formatDate(payment.date)}
                </div>
              </div>
              <div className="ml-3 font-medium text-sm whitespace-nowrap">
                {formatMoneyMinor(payment.amount_minor, payment.currency)}
              </div>
            </div>
          ))}
        </div>
      )}

      {displayPayments.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Total ({displayPayments.length} payment{displayPayments.length !== 1 ? 's' : ''})
            </span>
            <span className="font-semibold">
              {formatMoneyMinor(
                displayPayments.reduce((sum, p) => sum + p.amount_minor, 0),
                displayPayments[0]?.currency || "DKK"
              )}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

