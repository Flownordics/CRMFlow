import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Target, TrendingDown } from "lucide-react";
import { useCompanyRevenue } from "@/services/companyAnalytics";
import { fromMinor, formatNumber } from "@/lib/money";
import { Skeleton } from "@/components/ui/skeleton";

interface CompanyRevenueCardProps {
  companyId: string;
}

export function CompanyRevenueCard({ companyId }: CompanyRevenueCardProps) {
  const { data: revenue, isLoading } = useCompanyRevenue(companyId);

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
      color: "text-primary",
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
      color: "text-blue-600",
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
      </CardContent>
    </Card>
  );
}

