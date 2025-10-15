/**
 * InvoiceAgingChart
 * Bar chart showing distribution of outstanding invoices by aging bucket
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { chartColors, chartTheme, animationDuration } from '@/components/analytics/charts/chartConfig';
import { formatCurrency } from '@/services/analytics';

interface InvoiceAgingChartProps {
  invoices: Array<{ due_date?: string | null; balance_minor: number; status: string }>;
  currency?: string;
  height?: number;
}

export function InvoiceAgingChart({
  invoices,
  currency = 'DKK',
  height = 300,
}: InvoiceAgingChartProps) {
  // Calculate aging buckets for outstanding invoices
  const now = new Date();
  const aging = {
    '0-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0,
  };

  invoices
    .filter((inv) => inv.balance_minor > 0 && inv.due_date)
    .forEach((inv) => {
      const dueDate = new Date(inv.due_date!);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue < 0) return; // Not overdue yet

      if (daysOverdue <= 30) {
        aging['0-30'] += inv.balance_minor;
      } else if (daysOverdue <= 60) {
        aging['31-60'] += inv.balance_minor;
      } else if (daysOverdue <= 90) {
        aging['61-90'] += inv.balance_minor;
      } else {
        aging['90+'] += inv.balance_minor;
      }
    });

  const chartData = [
    { bucket: '0-30 days', value: aging['0-30'], color: chartColors.warning },
    { bucket: '31-60 days', value: aging['31-60'], color: '#b8947a' },
    { bucket: '61-90 days', value: aging['61-90'], color: chartColors.danger },
    { bucket: '90+ days', value: aging['90+'], color: '#a05d54' },
  ].filter((item) => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No overdue invoices
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div style={chartTheme.tooltipStyle} className="shadow-lg">
        <p className="font-semibold mb-2">{data.bucket}</p>
        <p className="text-sm">
          <span className="font-medium">Amount:</span> {formatCurrency(data.value)}
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={chartTheme.gridStyle.stroke}
          strokeOpacity={chartTheme.gridStyle.strokeOpacity}
        />
        <XAxis
          dataKey="bucket"
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
        />
        <YAxis
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
          tickFormatter={(value) => formatCurrency(value / 1000) + 'K'}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="value"
          name="Outstanding Amount"
          radius={[4, 4, 0, 0]}
          animationDuration={animationDuration}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

