import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatPercentage } from '@/services/analytics';
import { SalespersonMetrics } from '@/services/salespersonAnalytics';
import {
  chartColors,
  chartTheme,
  animationDuration,
  getChartColor,
} from './chartConfig';

interface SalespersonComparisonChartProps {
  salespeople: SalespersonMetrics[];
  height?: number;
}

type MetricKey =
  | 'totalRevenue'
  | 'wonDeals'
  | 'winRate'
  | 'totalActivities'
  | 'pipelineValue';

export function SalespersonComparisonChart({
  salespeople,
  height = 350,
}: SalespersonComparisonChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('totalRevenue');

  if (salespeople.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No salesperson data available
      </div>
    );
  }

  const metricLabels = {
    totalRevenue: 'Total Revenue',
    wonDeals: 'Deals Won',
    winRate: 'Win Rate (%)',
    totalActivities: 'Total Activities',
    pipelineValue: 'Pipeline Value',
  };

  const formatValue = (value: number, metric: MetricKey) => {
    if (metric === 'totalRevenue' || metric === 'pipelineValue') {
      return formatCurrency(value);
    }
    if (metric === 'winRate') {
      return formatPercentage(value);
    }
    return value.toString();
  };

  // Prepare chart data
  const chartData = salespeople.map((person) => ({
    name: person.userName.split(' ')[0], // First name only for cleaner display
    fullName: person.userName,
    value: person[selectedMetric],
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={chartTheme.tooltipStyle} className="shadow-lg">
          <p className="font-semibold mb-2">{data.fullName}</p>
          <p className="text-sm">
            <span className="font-medium">{metricLabels[selectedMetric]}:</span>{' '}
            {formatValue(data.value, selectedMetric)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Metric Selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Compare salespeople by:</p>
        <Select
          value={selectedMetric}
          onValueChange={(value) => setSelectedMetric(value as MetricKey)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(metricLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 70, bottom: 5 }}
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
            tickFormatter={(value) =>
              selectedMetric === 'totalRevenue' || selectedMetric === 'pipelineValue'
                ? formatCurrency(value)
                : selectedMetric === 'winRate'
                ? `${value}%`
                : value
            }
            style={chartTheme.axisStyle}
            stroke={chartTheme.gridStyle.stroke}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={chartTheme.legendStyle} />
          <Bar
            dataKey="value"
            name={metricLabels[selectedMetric]}
            fill={chartColors.primary}
            radius={[4, 4, 0, 0]}
            animationDuration={animationDuration}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

