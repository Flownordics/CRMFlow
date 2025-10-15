/**
 * OrderValueTrendChart
 * Area chart showing order value over time
 */

import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { chartColors, chartTheme, animationDuration } from '@/components/analytics/charts/chartConfig';
import { formatCurrency } from '@/services/analytics';
import { groupByMonth } from '@/lib/chartUtils';

interface OrderValueTrendChartProps {
  orders: Array<{ created_at: string; total_minor: number }>;
  height?: number;
}

export function OrderValueTrendChart({ orders, height = 300 }: OrderValueTrendChartProps) {
  const monthlyData = groupByMonth(orders, 'created_at', 'total_minor', 'sum');

  if (monthlyData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No order trend data available
      </div>
    );
  }

  const chartData = monthlyData.map((item) => ({
    month: item.month,
    value: item.value,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div style={chartTheme.tooltipStyle} className="shadow-lg">
        <p className="font-semibold mb-2">{data.month}</p>
        <p className="text-sm">
          <span className="font-medium">Total Value:</span> {formatCurrency(data.value)}
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="orderValueGradient" x1="0" y1="0" x2="0" y2="1">
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
          dataKey="month"
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
        />
        <YAxis
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
          tickFormatter={(value) => formatCurrency(value / 1000) + 'K'}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={chartColors.success}
          strokeWidth={2}
          fill="url(#orderValueGradient)"
          name="Order Value"
          animationDuration={animationDuration}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

