import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Target, TrendingDown, FileText, ShoppingCart } from "lucide-react";
import { useCompanyRevenue } from "@/services/companyAnalytics";
import { fromMinor, formatNumber } from "@/lib/money";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueries } from "@tanstack/react-query";
import { fetchQuotes } from "@/services/quotes";
import { fetchOrders } from "@/services/orders";
import { qk } from "@/lib/queryKeys";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface CompanyRevenueCardProps {
  companyId: string;
}

export function CompanyRevenueCard({ companyId }: CompanyRevenueCardProps) {
  const navigate = useNavigate();
  const { data: revenue, isLoading } = useCompanyRevenue(companyId);
  
  // Fetch quote and order counts in parallel using useQueries to avoid N+1 problem
  const [quotesQuery, ordersQuery] = useQueries({
    queries: [
      {
        queryKey: qk.quotes({ company_id: companyId, limit: 1 }),
        queryFn: () => fetchQuotes({ company_id: companyId, limit: 1 }),
        enabled: !!companyId,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
      {
        queryKey: qk.orders({ company_id: companyId, limit: 1 }),
        queryFn: () => fetchOrders({ company_id: companyId, limit: 1 }),
        enabled: !!companyId,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    ],
  });
  
  const quoteCount = quotesQuery.data?.total || 0;
  const orderCount = ordersQuery.data?.total || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Revenue & Deals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!revenue) {
    return null;
  }

  const metrics = [
    {
      label: "Total Deals Value",
      value: fromMinor(revenue.totalDealsValue, "DKK"),
      count: `${revenue.totalDeals} deals`,
      icon: DollarSign,
      color: "text-[hsl(212,30%,47%)]",
    },
    {
      label: "Won Deals",
      value: fromMinor(revenue.wonDealsValue, "DKK"),
      count: `${revenue.wonDeals} won`,
      icon: TrendingUp,
      color: "text-[#6b7c5e]",
    },
    {
      label: "Active Pipeline",
      value: fromMinor(revenue.activePipelineValue, "DKK"),
      count: `${revenue.activeDeals} active`,
      icon: Target,
      color: "text-[hsl(150,7%,45%)]",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Revenue & Deals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${metric.color}`} aria-hidden="true" />
                <span className="text-sm font-medium">{metric.label}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{metric.value}</div>
                <div className="text-xs text-muted-foreground">{metric.count}</div>
              </div>
            </div>
          );
        })}

        <div className="pt-3 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Average Deal Size</span>
            <span className="font-medium">{fromMinor(revenue.averageDealSize, "DKK")}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Win Rate</span>
            <span className="font-medium flex items-center gap-1">
              {formatNumber(revenue.dealWinRate)}%
              {revenue.dealWinRate > 50 ? (
                <TrendingUp className="h-3 w-3 text-[#6b7c5e]" />
              ) : (
                <TrendingDown className="h-3 w-3 text-[#b8695f]" />
              )}
            </span>
          </div>
          {revenue.lostDeals > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Lost Deals</span>
              <span className="font-medium text-destructive">{formatNumber(revenue.lostDeals)}</span>
            </div>
          )}
        </div>

        {/* Quick Links to Quotes and Orders */}
        <div className="pt-3 border-t space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-sm h-auto py-2"
            onClick={() => navigate(`/quotes?company_id=${companyId}`)}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">View Quotes</span>
            </div>
            <span className="font-medium">{formatNumber(quoteCount)}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-sm h-auto py-2"
            onClick={() => navigate(`/orders?company_id=${companyId}`)}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">View Orders</span>
            </div>
            <span className="font-medium">{formatNumber(orderCount)}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

