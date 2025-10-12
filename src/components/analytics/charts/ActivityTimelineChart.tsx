import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  chartColors,
  chartTheme,
  defaultMargin,
  animationDuration,
  getActivityColor,
} from './chartConfig';
import { ActivityTimelinePoint } from '@/services/activityAnalytics';

interface ActivityTimelineChartProps {
  data: ActivityTimelinePoint[];
  height?: number;
}

export function ActivityTimelineChart({
  data,
  height = 300,
}: ActivityTimelineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No activity data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={chartTheme.tooltipStyle} className="shadow-lg">
          <p className="font-semibold mb-2">
            {new Date(label).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span> {entry.value}
            </p>
          ))}
          <p className="text-sm font-semibold mt-1 pt-1 border-t">
            Total: {payload[0]?.payload.total || 0}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={defaultMargin}>
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
              day: 'numeric',
            })
          }
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
        />
        <YAxis
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={chartTheme.legendStyle}
          iconType="line"
          iconSize={14}
        />
        <Line
          type="monotone"
          dataKey="call"
          name="Calls"
          stroke={getActivityColor('call')}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          animationDuration={animationDuration}
        />
        <Line
          type="monotone"
          dataKey="email"
          name="Emails"
          stroke={getActivityColor('email')}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          animationDuration={animationDuration}
        />
        <Line
          type="monotone"
          dataKey="meeting"
          name="Meetings"
          stroke={getActivityColor('meeting')}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          animationDuration={animationDuration}
        />
        <Line
          type="monotone"
          dataKey="note"
          name="Notes"
          stroke={getActivityColor('note')}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          animationDuration={animationDuration}
        />
        <Line
          type="monotone"
          dataKey="task"
          name="Tasks"
          stroke={getActivityColor('task')}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          animationDuration={animationDuration}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

