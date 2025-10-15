/**
 * TaskCompletionTimelineChart
 * Area chart showing task completion over time
 */

import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { chartColors, chartTheme, animationDuration } from '@/components/analytics/charts/chartConfig';
import { groupByMonth } from '@/lib/chartUtils';

interface TaskCompletionTimelineChartProps {
  tasks: Array<{ created_at: string; status: string }>;
  height?: number;
}

export function TaskCompletionTimelineChart({ tasks, height = 300 }: TaskCompletionTimelineChartProps) {
  // Group completed tasks by month
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const monthlyData = groupByMonth(completedTasks, 'created_at', 'status', 'count');

  if (monthlyData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No completion data available
      </div>
    );
  }

  const chartData = monthlyData.map((item) => ({
    month: item.month,
    completed: item.value,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div style={chartTheme.tooltipStyle} className="shadow-lg">
        <p className="font-semibold mb-2">{data.month}</p>
        <p className="text-sm">
          <span className="font-medium">Completed:</span> {data.completed}
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="taskCompletionGradient" x1="0" y1="0" x2="0" y2="1">
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
          dataKey="month"
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
          dataKey="completed"
          stroke={chartColors.success}
          strokeWidth={2}
          fill="url(#taskCompletionGradient)"
          name="Completed Tasks"
          animationDuration={animationDuration}
        />
        <Line
          type="monotone"
          dataKey="completed"
          stroke={chartColors.success}
          strokeWidth={2}
          dot={{ fill: chartColors.success, r: 3 }}
          animationDuration={animationDuration}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

