import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, 
  FileText, 
  ShoppingCart, 
  Receipt, 
  TrendingUp, 
  Target,
  Clock,
  AlertCircle
} from "lucide-react";
import { useEnhancedDashboardMetrics } from "@/services/dashboardMetrics";
import { fromMinor, formatNumber } from "@/lib/money";
import { cn } from "@/lib/utils";

export function EnhancedKPIs() {
  const { data: metrics, isLoading } = useEnhancedDashboardMetrics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="rounded-2xl border shadow-card">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const kpiCards = [
    // Sales Metrics
    {
      title: "Active Pipeline",
      value: fromMinor(metrics.activePipelineValue, "DKK"),
      subtitle: `${formatNumber(metrics.activeDeals)} deals`,
      icon: Target,
      color: "text-[#7a9db3]",
      bgColor: "bg-[#eff4f7]"
    },
    {
      title: "Win Rate",
      value: `${formatNumber(metrics.winRate)}%`,
      subtitle: `${formatNumber(metrics.wonDeals)} won / ${formatNumber(metrics.lostDeals)} lost`,
      icon: TrendingUp,
      color: metrics.winRate >= 50 ? "text-[#6b7c5e]" : metrics.winRate >= 25 ? "text-[#9d855e]" : "text-[#b8695f]",
      bgColor: metrics.winRate >= 50 ? "bg-[#f0f4ec]" : metrics.winRate >= 25 ? "bg-[#faf5ef]" : "bg-[#fef2f0]"
    },
    {
      title: "Avg Deal Size",
      value: fromMinor(metrics.averageDealSize, "DKK"),
      subtitle: "from won deals",
      icon: DollarSign,
      color: "text-[#9d94af]",
      bgColor: "bg-[#f5f2f8]"
    },
    {
      title: "Sales Cycle",
      value: `${formatNumber(metrics.salesCycleAvg)} days`,
      subtitle: "average to close",
      icon: Clock,
      color: "text-[#7fa39b]",
      bgColor: "bg-[#f0f5f4]"
    },

    // Financial Metrics
    {
      title: "Quotes Value",
      value: fromMinor(metrics.totalQuotesValue, "DKK"),
      subtitle: `${formatNumber(metrics.totalQuotes)} quotes`,
      icon: FileText,
      color: "text-[#c89882]",
      bgColor: "bg-[#faf6f3]"
    },
    {
      title: "Orders Value",
      value: fromMinor(metrics.totalOrdersValue, "DKK"),
      subtitle: `${formatNumber(metrics.totalOrders)} orders`,
      icon: ShoppingCart,
      color: "text-[#6b7c5e]",
      bgColor: "bg-[#f0f4ec]"
    },
    {
      title: "Outstanding",
      value: fromMinor(metrics.outstandingInvoices, "DKK"),
      subtitle: "unpaid invoices",
      icon: Receipt,
      color: "text-[#9d855e]",
      bgColor: "bg-[#faf5ef]"
    },
    {
      title: "Overdue",
      value: fromMinor(metrics.overdueInvoices, "DKK"),
      subtitle: `${formatNumber(metrics.overdueInvoicesCount)} invoices`,
      icon: AlertCircle,
      color: metrics.overdueInvoicesCount > 0 ? "text-[#b8695f]" : "text-[#6b6b6b]",
      bgColor: metrics.overdueInvoicesCount > 0 ? "bg-[#fef2f0]" : "bg-[#f5f5f5]"
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpiCards.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <Card 
            key={index} 
            className="rounded-2xl border shadow-card hover:shadow-hover transition-shadow duration-200"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <div className={cn("p-2 rounded-lg", kpi.bgColor)}>
                <Icon className={cn("h-4 w-4", kpi.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpi.subtitle}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

