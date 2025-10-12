import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from 'recharts';
import { formatPercentage } from '@/services/analytics';
import {
  chartColors,
  chartTheme,
  animationDuration,
} from './chartConfig';
import { CallOutcome } from '@/services/activityAnalytics';

interface CallOutcomesChartProps {
  data: CallOutcome[];
  height?: number;
}

export function CallOutcomesChart({
  data,
  height = 300,
}: CallOutcomesChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No call data available
      </div>
    );
  }

  // Format outcome labels
  const formatOutcome = (outcome: string) => {
    return outcome
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formattedData = data.map((item) => ({
    ...item,
    displayName: formatOutcome(item.outcome),
  }));

  const COLORS: Record<string, string> = {
    completed: chartColors.success,
    voicemail: chartColors.info,
    busy: chartColors.warning,
    no_answer: chartColors.danger,
    wrong_number: '#94a3b8',
    scheduled_followup: chartColors.primary,
    not_interested: '#64748b',
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={chartTheme.tooltipStyle} className="shadow-lg">
          <p className="font-semibold mb-2">{data.displayName}</p>
          <p className="text-sm">
            <span className="font-medium">Calls:</span> {data.count}
          </p>
          <p className="text-sm">
            <span className="font-medium">Percentage:</span>{' '}
            {formatPercentage(data.percentage)}
          </p>
          {data.isSuccess && (
            <p className="text-xs text-[#6b7c5e] mt-1 font-medium">
              ✓ Successful contact
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percentage,
  }: any) => {
    if (percentage < 5) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: 12, fontWeight: 'bold' }}
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm">
              {entry.payload.displayName}
              {entry.payload.isSuccess && (
                <span className="ml-1 text-[#6b7c5e]">✓</span>
              )}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={formattedData}
          cx="50%"
          cy="45%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={90}
          fill="#8884d8"
          dataKey="count"
          animationDuration={animationDuration}
        >
          {formattedData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[entry.outcome] || chartColors.muted}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

