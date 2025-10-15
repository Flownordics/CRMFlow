/**
 * RoleDistributionChart
 * Pie chart showing distribution of people by role/title
 */

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { chartTheme, getChartColor } from '@/components/analytics/charts/chartConfig';
import { formatPercentage } from '@/services/analytics';
import { calculateDistribution } from '@/lib/chartUtils';

interface RoleDistributionChartProps {
  people: Array<{ title?: string | null }>;
  height?: number;
}

export function RoleDistributionChart({ people, height = 300 }: RoleDistributionChartProps) {
  const distribution = calculateDistribution(
    people.filter((p) => p.title),
    'title'
  );

  // Take top 8 roles
  const topRoles = distribution.slice(0, 8);

  if (topRoles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No role data available
      </div>
    );
  }

  const total = topRoles.reduce((sum, item) => sum + item.value, 0);
  const chartData = topRoles.map((item, index) => ({
    ...item,
    color: getChartColor(index),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div style={chartTheme.tooltipStyle} className="shadow-lg">
        <p className="font-semibold mb-2">{data.name}</p>
        <p className="text-sm">
          <span className="font-medium">People:</span> {data.value}
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

