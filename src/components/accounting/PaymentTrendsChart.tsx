import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatMoneyMinor } from "@/lib/money";
import { AnalyticsCard } from "@/components/common/charts/AnalyticsCard";
import { chartColors, chartTheme, animationDuration } from '@/components/analytics/charts/chartConfig';

interface PaymentTrendsChartProps {
  payments: Array<{
    date: string;
    amount_minor: number;
  }>;
  currency?: string;
}

export function PaymentTrendsChart({ payments, currency = "DKK" }: PaymentTrendsChartProps) {
  // Group payments by date and calculate totals
  const chartData = useMemo(() => {
    const grouped = new Map<string, number>();

    payments.forEach((payment) => {
      const date = new Date(payment.date).toLocaleDateString();
      grouped.set(date, (grouped.get(date) || 0) + payment.amount_minor);
    });

    // Convert to array and sort by date
    const data = Array.from(grouped.entries())
      .map(([date, amount]) => ({
        date,
        amount: amount / 100, // Convert minor to major for better chart display
        displayAmount: formatMoneyMinor(amount, currency),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30); // Last 30 days

    return data;
  }, [payments, currency]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div style={chartTheme.tooltipStyle} className="shadow-lg">
        <p className="font-semibold mb-2">{data.date}</p>
        <p className="text-sm">
          <span className="font-medium">Amount:</span> {data.displayAmount}
        </p>
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <AnalyticsCard
        title="Payment Trends"
        description="No data available"
        icon={TrendingUp}
      >
        <div className="py-8 text-center text-sm text-muted-foreground">
          No payment data available
        </div>
      </AnalyticsCard>
    );
  }

  return (
    <AnalyticsCard
      title="Payment Trends"
      description={`Last ${chartData.length} days`}
      icon={TrendingUp}
      chartName="Payment Trends"
    >
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="paymentTrendsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.success} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartColors.success} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartTheme.gridStyle.stroke}
            strokeOpacity={chartTheme.gridStyle.strokeOpacity}
          />
          <XAxis
            dataKey="date"
            style={chartTheme.axisStyle}
            stroke={chartTheme.gridStyle.stroke}
          />
          <YAxis
            style={chartTheme.axisStyle}
            stroke={chartTheme.gridStyle.stroke}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={chartTheme.legendStyle} iconType="rect" iconSize={12} />
          <Area
            type="monotone"
            dataKey="amount"
            stroke={chartColors.success}
            strokeWidth={2}
            fill="url(#paymentTrendsGradient)"
            name="Payment Amount"
            animationDuration={animationDuration}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke={chartColors.success}
            strokeWidth={2}
            dot={{ fill: chartColors.success, r: 4 }}
            activeDot={{ r: 6 }}
            animationDuration={animationDuration}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </AnalyticsCard>
  );
}

