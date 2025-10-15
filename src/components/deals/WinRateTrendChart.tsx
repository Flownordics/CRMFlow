/**
 * WinRateTrendChart
 * Line chart showing win rate trend over time
 */

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { chartColors, chartTheme, animationDuration } from '@/components/analytics/charts/chartConfig';
import { formatPercentage } from '@/services/analytics';
import { format, eachMonthOfInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface WinRateTrendChartProps {
  deals: Array<{
    updated_at: string;
    stage_id: string;
  }>;
  getStageName: (stageId: string) => string;
  height?: number;
}

export function WinRateTrendChart({ deals, getStageName, height = 300 }: WinRateTrendChartProps) {
  // Get last 6 months
  const now = new Date();
  const sixMonthsAgo = subMonths(now, 5);
  const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

  // Calculate win rate per month
  const monthlyData = months.map((month) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const monthDeals = deals.filter((deal) => {
      if (!deal.updated_at) return false;
      const updatedDate = new Date(deal.updated_at);
      return updatedDate >= monthStart && updatedDate <= monthEnd;
    });

    const wonDeals = monthDeals.filter((deal) => {
      const stageName = getStageName(deal.stage_id);
      return stageName?.toLowerCase().includes('won');
    });

    const lostDeals = monthDeals.filter((deal) => {
      const stageName = getStageName(deal.stage_id);
      return stageName?.toLowerCase().includes('lost');
    });

    const totalClosed = wonDeals.length + lostDeals.length;
    const winRate = totalClosed > 0 ? (wonDeals.length / totalClosed) * 100 : 0;

    return {
      month: format(month, 'MMM yyyy'),
      monthLabel: format(month, 'MMM'),
      winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal
      won: wonDeals.length,
      lost: lostDeals.length,
      total: totalClosed,
    };
  });

  if (monthlyData.every((d) => d.total === 0)) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No win rate data available
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
          <span className="font-medium">Win Rate:</span> {formatPercentage(data.winRate)}
        </p>
        <p className="text-sm">
          <span className="font-medium">Won:</span> {data.won}
        </p>
        <p className="text-sm">
          <span className="font-medium">Lost:</span> {data.lost}
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="winRateGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColors.success} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColors.success} stopOpacity={0} />
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
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={chartTheme.legendStyle} iconType="rect" iconSize={12} />
        <Area
          type="monotone"
          dataKey="winRate"
          stroke={chartColors.success}
          strokeWidth={2}
          fill="url(#winRateGradient)"
          name="Win Rate %"
          animationDuration={animationDuration}
        />
        <Line
          type="monotone"
          dataKey="winRate"
          stroke={chartColors.success}
          strokeWidth={3}
          dot={{ fill: chartColors.success, r: 4 }}
          activeDot={{ r: 6 }}
          name="Trend"
          animationDuration={animationDuration}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

