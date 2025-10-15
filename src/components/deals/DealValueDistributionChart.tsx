/**
 * DealValueDistributionChart
 * Pie chart showing distribution of deal values by stage
 */

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { chartColors, chartTheme, getChartColor } from '@/components/analytics/charts/chartConfig';
import { formatCurrency, formatPercentage } from '@/services/analytics';

interface DealValueDistributionChartProps {
  data: Array<{ stageName: string; value: number }>;
  currency?: string;
  height?: number;
}

export function DealValueDistributionChart({
  data,
  currency = 'DKK',
  height = 300,
}: DealValueDistributionChartProps) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No deal value data available
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const chartData = data
    .filter((item) => item.value > 0)
    .map((item, index) => ({
      ...item,
      color: getChartColor(index),
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div style={chartTheme.tooltipStyle} className="shadow-lg">
        <p className="font-semibold mb-2">{data.stageName}</p>
        <p className="text-sm">
          <span className="font-medium">Value:</span> {formatCurrency(data.value)}
        </p>
        <p className="text-sm">
          <span className="font-medium">Percentage:</span>{' '}
          {formatPercentage((data.value / total) * 100)}
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ value }) => formatCurrency(value / 1000) + 'K'}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={chartTheme.legendStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

