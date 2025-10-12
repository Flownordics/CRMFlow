import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/services/analytics';
import {
  chartColors,
  chartTheme,
  defaultMargin,
  animationDuration,
} from './chartConfig';

interface RevenueTrendPoint {
  date: string;
  revenue: number;
  deals: number;
}

interface RevenueChartProps {
  data: RevenueTrendPoint[];
  height?: number;
}

export function RevenueChart({ data, height = 300 }: RevenueChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={chartTheme.tooltipStyle}
          className="shadow-lg"
        >
          <p className="font-semibold mb-2">
            {new Date(payload[0].payload.date).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <p className="text-sm">
            <span className="font-medium">Revenue:</span>{' '}
            {formatCurrency(payload[0].value)}
          </p>
          <p className="text-sm">
            <span className="font-medium">Deals:</span> {payload[1]?.value || 0}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={defaultMargin}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
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
          dataKey="date"
          tickFormatter={(date) =>
            new Date(date).toLocaleDateString('en-US', {
              month: 'short',
              year: '2-digit',
            })
          }
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
        />
        <YAxis
          yAxisId="left"
          tickFormatter={(value) => formatCurrency(value)}
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={chartTheme.legendStyle}
          iconType="rect"
          iconSize={12}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="revenue"
          stroke={chartColors.primary}
          strokeWidth={2}
          fill="url(#revenueGradient)"
          name="Revenue"
          animationDuration={animationDuration}
        />
        <Bar
          yAxisId="right"
          dataKey="deals"
          fill={chartColors.accent}
          name="Deals"
          radius={[4, 4, 0, 0]}
          animationDuration={animationDuration}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

