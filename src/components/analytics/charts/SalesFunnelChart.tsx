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
  LabelList,
} from 'recharts';
import { formatCurrency, formatPercentage } from '@/services/analytics';
import {
  chartColors,
  chartTheme,
  animationDuration,
} from './chartConfig';

interface FunnelStage {
  name: string;
  count: number;
  value: number;
  conversionRate?: number;
}

interface SalesFunnelChartProps {
  dealsCount: number;
  dealsValue: number;
  quotesCount: number;
  quotesValue: number;
  ordersCount: number;
  ordersValue: number;
  invoicesCount: number;
  invoicesValue: number;
  paidCount: number;
  paidValue: number;
  height?: number;
}

export function SalesFunnelChart({
  dealsCount,
  dealsValue,
  quotesCount,
  quotesValue,
  ordersCount,
  ordersValue,
  invoicesCount,
  invoicesValue,
  paidCount,
  paidValue,
  height = 350,
}: SalesFunnelChartProps) {
  const data: FunnelStage[] = [
    { name: 'Deals', count: dealsCount, value: dealsValue },
    {
      name: 'Quotes',
      count: quotesCount,
      value: quotesValue,
      conversionRate: dealsCount > 0 ? (quotesCount / dealsCount) * 100 : 0,
    },
    {
      name: 'Orders',
      count: ordersCount,
      value: ordersValue,
      conversionRate: quotesCount > 0 ? (ordersCount / quotesCount) * 100 : 0,
    },
    {
      name: 'Invoices',
      count: invoicesCount,
      value: invoicesValue,
      conversionRate: ordersCount > 0 ? (invoicesCount / ordersCount) * 100 : 0,
    },
    {
      name: 'Paid',
      count: paidCount,
      value: paidValue,
      conversionRate:
        invoicesCount > 0 ? (paidCount / invoicesCount) * 100 : 0,
    },
  ];

  if (dealsCount === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No data available
      </div>
    );
  }

  const colors = [
    chartColors.info,
    chartColors.primary,
    chartColors.success,
    chartColors.warning,
    chartColors.palette[4],
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={chartTheme.tooltipStyle} className="shadow-lg">
          <p className="font-semibold mb-2">{data.name}</p>
          <p className="text-sm">
            <span className="font-medium">Count:</span> {data.count}
          </p>
          <p className="text-sm">
            <span className="font-medium">Value:</span>{' '}
            {formatCurrency(data.value)}
          </p>
          {data.conversionRate !== undefined && (
            <p className="text-sm">
              <span className="font-medium">Conversion:</span>{' '}
              {formatPercentage(data.conversionRate)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (props: any) => {
    const { x, y, width, height, value, index } = props;
    const conversion = data[index].conversionRate;
    
    return (
      <g>
        <text
          x={x + width / 2}
          y={y + height / 2 - 5}
          fill="white"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: 14, fontWeight: 'bold' }}
        >
          {data[index].count}
        </text>
        {conversion !== undefined && (
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            fill="white"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: 10 }}
          >
            ({formatPercentage(conversion)})
          </text>
        )}
      </g>
    );
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
          dataKey="name"
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
        />
        <YAxis
          tickFormatter={(value) => value.toLocaleString()}
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
          label={{
            value: 'Count',
            angle: -90,
            position: 'insideLeft',
            style: chartTheme.axisStyle,
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="count"
          radius={[4, 4, 0, 0]}
          animationDuration={animationDuration}
        >
          <LabelList dataKey="count" content={renderCustomLabel} />
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

