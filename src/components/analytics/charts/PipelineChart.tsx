import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { formatCurrency, formatPercentage } from '@/services/analytics';
import {
  chartColors,
  chartTheme,
  animationDuration,
} from './chartConfig';

interface PipelineStage {
  stageId: string;
  stageName: string;
  dealCount: number;
  totalValue: number;
  conversionRate: number;
}

interface PipelineChartProps {
  data: PipelineStage[];
  height?: number;
  onStageClick?: (stageId: string) => void;
}

export function PipelineChart({
  data,
  height = 300,
  onStageClick,
}: PipelineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No data available
      </div>
    );
  }

  // Get color based on conversion rate (gradient from red to green)
  const getColorByConversionRate = (rate: number) => {
    if (rate >= 50) return chartColors.success;
    if (rate >= 25) return chartColors.warning;
    return chartColors.danger;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={chartTheme.tooltipStyle}
          className="shadow-lg"
        >
          <p className="font-semibold mb-2">{data.stageName}</p>
          <p className="text-sm">
            <span className="font-medium">Value:</span>{' '}
            {formatCurrency(data.totalValue)}
          </p>
          <p className="text-sm">
            <span className="font-medium">Deals:</span> {data.dealCount}
          </p>
          <p className="text-sm">
            <span className="font-medium">Conversion:</span>{' '}
            {formatPercentage(data.conversionRate)}
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
        layout="vertical"
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={chartTheme.gridStyle.stroke}
          strokeOpacity={chartTheme.gridStyle.strokeOpacity}
        />
        <XAxis
          type="number"
          tickFormatter={(value) => formatCurrency(value)}
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
        />
        <YAxis
          type="category"
          dataKey="stageName"
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
          width={90}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="totalValue"
          radius={[0, 4, 4, 0]}
          animationDuration={animationDuration}
          cursor={onStageClick ? 'pointer' : 'default'}
          onClick={(data) => onStageClick && onStageClick(data.stageId)}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getColorByConversionRate(entry.conversionRate)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

