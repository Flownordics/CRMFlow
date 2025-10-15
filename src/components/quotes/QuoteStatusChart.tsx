/**
 * QuoteStatusChart
 * Pie chart showing distribution of quotes by status
 */

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { chartTheme, getColorByCategory } from '@/components/analytics/charts/chartConfig';
import { formatPercentage } from '@/services/analytics';
import { calculateDistribution } from '@/lib/chartUtils';

interface QuoteStatusChartProps {
  quotes: Array<{ status: string }>;
  height?: number;
}

export function QuoteStatusChart({ quotes, height = 300 }: QuoteStatusChartProps) {
  const distribution = calculateDistribution(quotes, 'status');

  if (distribution.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No quote data available
      </div>
    );
  }

  const total = distribution.reduce((sum, item) => sum + item.value, 0);
  const chartData = distribution.map((item) => ({
    ...item,
    color: getColorByCategory(item.name),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div style={chartTheme.tooltipStyle} className="shadow-lg">
        <p className="font-semibold mb-2 capitalize">{data.name}</p>
        <p className="text-sm">
          <span className="font-medium">Quotes:</span> {data.value}
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
          label={({ value }) => `${value}`}
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

