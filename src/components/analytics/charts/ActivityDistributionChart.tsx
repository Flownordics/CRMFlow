import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import {
  chartTheme,
  animationDuration,
  getActivityColor,
} from './chartConfig';
import { ActivityDistribution } from '@/services/activityAnalytics';
import { formatPercentage } from '@/services/analytics';

interface ActivityDistributionChartProps {
  data: ActivityDistribution[];
  height?: number;
}

export function ActivityDistributionChart({
  data,
  height = 300,
}: ActivityDistributionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No activity data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={chartTheme.tooltipStyle} className="shadow-lg">
          <p className="font-semibold mb-2 capitalize">{data.type}</p>
          <p className="text-sm">
            <span className="font-medium">Count:</span> {data.count}
          </p>
          <p className="text-sm">
            <span className="font-medium">Percentage:</span>{' '}
            {formatPercentage(data.percentage)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={chartTheme.gridStyle.stroke}
          strokeOpacity={chartTheme.gridStyle.strokeOpacity}
        />
        <XAxis
          dataKey="type"
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
          tickFormatter={(value) =>
            value.charAt(0).toUpperCase() + value.slice(1)
          }
        />
        <YAxis
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={chartTheme.legendStyle}
          formatter={() => 'Activity Count'}
        />
        <Bar
          dataKey="count"
          name="Activities"
          radius={[4, 4, 0, 0]}
          animationDuration={animationDuration}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getActivityColor(entry.type)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

