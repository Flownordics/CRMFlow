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
import { EnhancedKpiCard, EnhancedKpiGrid } from "@/components/common/kpi/EnhancedKpiCard";

export function EnhancedKPIs() {
  const { data: metrics, isLoading } = useEnhancedDashboardMetrics();

  if (!metrics && isLoading) {
    return (
      <EnhancedKpiGrid columns={4}>
        {[...Array(8)].map((_, i) => (
          <EnhancedKpiCard
            key={i}
            title="Loading..."
            value="..."
            isLoading={true}
          />
        ))}
      </EnhancedKpiGrid>
    );
  }

  if (!metrics) return null;

  return (
    <EnhancedKpiGrid columns={4}>
      <EnhancedKpiCard
        title="Active Pipeline"
        value={fromMinor(metrics.activePipelineValue, "DKK")}
        subtitle={`${formatNumber(metrics.activeDeals)} deals`}
        icon={Target}
        iconColor="text-[#7a9db3]"
      />

      <EnhancedKpiCard
        title="Win Rate"
        value={`${formatNumber(metrics.winRate)}%`}
        subtitle={`${formatNumber(metrics.wonDeals)} won / ${formatNumber(metrics.lostDeals)} lost`}
        icon={TrendingUp}
        iconColor={
          metrics.winRate >= 50
            ? "text-[#6b7c5e]"
            : metrics.winRate >= 25
            ? "text-[#9d855e]"
            : "text-[#b8695f]"
        }
        valueColor={
          metrics.winRate >= 50
            ? "text-[#6b7c5e]"
            : metrics.winRate >= 25
            ? "text-[#9d855e]"
            : "text-[#b8695f]"
        }
        progress={metrics.winRate}
        showProgress={true}
        progressLabel="Win Rate"
      />

      <EnhancedKpiCard
        title="Avg Deal Size"
        value={fromMinor(metrics.averageDealSize, "DKK")}
        subtitle="from won deals"
        icon={DollarSign}
        iconColor="text-[#9d94af]"
      />

      <EnhancedKpiCard
        title="Sales Cycle"
        value={`${formatNumber(metrics.salesCycleAvg)} days`}
        subtitle="average to close"
        icon={Clock}
        iconColor="text-[#7fa39b]"
      />

      <EnhancedKpiCard
        title="Quotes Value"
        value={fromMinor(metrics.totalQuotesValue, "DKK")}
        subtitle={`${formatNumber(metrics.totalQuotes)} quotes`}
        icon={FileText}
        iconColor="text-[#c89882]"
      />

      <EnhancedKpiCard
        title="Orders Value"
        value={fromMinor(metrics.totalOrdersValue, "DKK")}
        subtitle={`${formatNumber(metrics.totalOrders)} orders`}
        icon={ShoppingCart}
        iconColor="text-[#6b7c5e]"
      />

      <EnhancedKpiCard
        title="Outstanding"
        value={fromMinor(metrics.outstandingInvoices, "DKK")}
        subtitle="unpaid invoices"
        icon={Receipt}
        iconColor="text-[#9d855e]"
      />

      <EnhancedKpiCard
        title="Overdue"
        value={fromMinor(metrics.overdueInvoices, "DKK")}
        subtitle={`${formatNumber(metrics.overdueInvoicesCount)} invoices`}
        icon={AlertCircle}
        iconColor={
          metrics.overdueInvoicesCount > 0 ? "text-[#b8695f]" : "text-muted-foreground"
        }
        valueColor={
          metrics.overdueInvoicesCount > 0 ? "text-[#b8695f]" : undefined
        }
      />
    </EnhancedKpiGrid>
  );
}

