import { TrendingUp } from "lucide-react";
import { useInvoices } from "@/services/invoices";
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fromMinor } from "@/lib/money";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, parseISO } from "date-fns";
import { AnalyticsCard } from "@/components/common/charts/AnalyticsCard";
import { chartColors, chartTheme, animationDuration } from '@/components/analytics/charts/chartConfig';

export function RevenueChart() {
  const { data: invoices, isLoading } = useInvoices({ limit: 5000 });

  if (isLoading) {
    return (
      <AnalyticsCard
        title="Revenue Trend"
        description="Monthly revenue over last 6 months"
        icon={TrendingUp}
        isLoading={true}
      >
        <div />
      </AnalyticsCard>
    );
  }

  if (!invoices?.data || invoices.data.length === 0) {
    return (
      <AnalyticsCard
        title="Revenue Trend"
        description="Monthly revenue over last 6 months"
        icon={TrendingUp}
      >
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          No invoice data available
        </div>
      </AnalyticsCard>
    );
  }

  // Get last 6 months
  const now = new Date();
  const sixMonthsAgo = subMonths(now, 5);
  const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

  // Calculate revenue per month
  const monthlyData = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const paidInvoices = invoices.data.filter(invoice => {
      if (invoice.status !== 'paid' || !invoice.issue_date) return false;
      const issueDate = parseISO(invoice.issue_date);
      return issueDate >= monthStart && issueDate <= monthEnd;
    });

    const revenue = paidInvoices.reduce((sum, inv) => sum + inv.total_minor, 0);

    return {
      month: format(month, 'MMM yyyy'),
      revenue: revenue / 100, // Convert to major units for chart
      revenueFormatted: fromMinor(revenue, 'DKK'),
      invoiceCount: paidInvoices.length
    };
  });

  // Calculate total and average
  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const avgRevenue = totalRevenue / monthlyData.length;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div style={chartTheme.tooltipStyle} className="shadow-lg">
        <p className="font-semibold mb-2">{data.month}</p>
        <p className="text-sm">
          <span className="font-medium">Revenue:</span> {data.revenueFormatted}
        </p>
        <p className="text-sm">
          <span className="font-medium">Invoices:</span> {data.invoiceCount}
        </p>
      </div>
    );
  };

  return (
    <AnalyticsCard
      title="Revenue Trend"
      description={`Monthly revenue • Avg: ${fromMinor(Math.round(avgRevenue * 100), 'DKK')}/month`}
      icon={TrendingUp}
      chartName="Dashboard Revenue Trend"
    >
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradientDashboard" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartTheme.gridStyle.stroke}
            strokeOpacity={chartTheme.gridStyle.strokeOpacity}
          />
          <XAxis
            dataKey="month"
            style={chartTheme.axisStyle}
            stroke={chartTheme.gridStyle.stroke}
          />
          <YAxis
            style={chartTheme.axisStyle}
            stroke={chartTheme.gridStyle.stroke}
            tickFormatter={(value) => `${Math.round(value / 1000)}K`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={chartColors.primary}
            strokeWidth={2}
            fill="url(#revenueGradientDashboard)"
            name="Revenue"
            animationDuration={animationDuration}
          />
          <Bar
            dataKey="invoiceCount"
            fill={chartColors.accent}
            fillOpacity={0.6}
            name="Invoices"
            radius={[4, 4, 0, 0]}
            barSize={30}
            yAxisId="right"
            animationDuration={animationDuration}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            style={chartTheme.axisStyle}
            stroke={chartTheme.gridStyle.stroke}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </AnalyticsCard>
  );
}

