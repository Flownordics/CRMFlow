/**
 * CompanyHealthChart
 * Pie chart showing distribution of company activity status (green, yellow, red)
 */

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { chartColors, chartTheme } from '@/components/analytics/charts/chartConfig';
import { formatPercentage } from '@/services/analytics';
import { ActivityStatus } from '@/lib/schemas/callList';

interface CompanyHealthChartProps {
  data: {
    green: number;
    yellow: number;
    red: number;
  };
  height?: number;
}

export function CompanyHealthChart({ data, height = 300 }: CompanyHealthChartProps) {
  const total = data.green + data.yellow + data.red;

  const chartData = [
    { name: 'Active (≤90 days)', value: data.green, color: chartColors.green, status: 'green' },
    { name: 'Moderate (91-180 days)', value: data.yellow, color: chartColors.yellow, status: 'yellow' },
    { name: 'At Risk (>180 days)', value: data.red, color: chartColors.red, status: 'red' },
  ].filter((item) => item.value > 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No company data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div style={chartTheme.tooltipStyle} className="shadow-lg">
        <p className="font-semibold mb-2">{data.name}</p>
        <p className="text-sm">
          <span className="font-medium">Companies:</span> {data.value}
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

