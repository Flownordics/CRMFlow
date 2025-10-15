/**
 * ContactGrowthChart
 * Area chart showing people/contact count growth over time
 */

import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { chartColors, chartTheme, animationDuration } from '@/components/analytics/charts/chartConfig';
import { format, eachMonthOfInterval, startOfMonth, subMonths } from 'date-fns';

interface ContactGrowthChartProps {
  people: Array<{ created_at: string }>;
  height?: number;
}

export function ContactGrowthChart({ people, height = 300 }: ContactGrowthChartProps) {
  // Get last 6 months
  const now = new Date();
  const sixMonthsAgo = subMonths(now, 5);
  const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

  // Calculate cumulative count per month
  const monthlyData = months.map((month) => {
    const monthStart = startOfMonth(month);
    const peopleUntilMonth = people.filter((person) => {
      const createdDate = new Date(person.created_at);
      return createdDate <= monthStart;
    });

    return {
      month: format(month, 'MMM yyyy'),
      total: peopleUntilMonth.length,
      monthLabel: format(month, 'MMM yy'),
    };
  });

  if (monthlyData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No growth data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div style={chartTheme.tooltipStyle} className="shadow-lg">
        <p className="font-semibold mb-2">{data.month}</p>
        <p className="text-sm">
          <span className="font-medium">Total People:</span> {data.total}
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="contactGrowthGradient" x1="0" y1="0" x2="0" y2="1">
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
          dataKey="monthLabel"
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
        />
        <YAxis
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="total"
          stroke={chartColors.primary}
          strokeWidth={2}
          fill="url(#contactGrowthGradient)"
          name="Total People"
          animationDuration={animationDuration}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke={chartColors.success}
          strokeWidth={2}
          dot={{ fill: chartColors.success, r: 3 }}
          name="Growth Trend"
          animationDuration={animationDuration}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

