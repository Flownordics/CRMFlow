import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from 'recharts';
import { formatPercentage } from '@/services/analytics';
import { chartColors, chartTheme, animationDuration } from './chartConfig';

interface WinRateData {
  name: string;
  value: number;
  percentage: number;
}

interface WinRateChartProps {
  wonDeals: number;
  lostDeals: number;
  openDeals: number;
  height?: number;
}

export function WinRateChart({
  wonDeals,
  lostDeals,
  openDeals,
  height = 300,
}: WinRateChartProps) {
  const total = wonDeals + lostDeals + openDeals;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No data available
      </div>
    );
  }

  const data: WinRateData[] = [
    {
      name: 'Won',
      value: wonDeals,
      percentage: (wonDeals / total) * 100,
    },
    {
      name: 'Open',
      value: openDeals,
      percentage: (openDeals / total) * 100,
    },
    {
      name: 'Lost',
      value: lostDeals,
      percentage: (lostDeals / total) * 100,
    },
  ].filter((item) => item.value > 0);

  const COLORS = {
    Won: chartColors.success,
    Open: chartColors.warning,
    Lost: chartColors.danger,
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={chartTheme.tooltipStyle} className="shadow-lg">
          <p className="font-semibold mb-1">{data.name}</p>
          <p className="text-sm">
            <span className="font-medium">Deals:</span> {data.value}
          </p>
          <p className="text-sm">
            <span className="font-medium">Percentage:</span>{' '}
            {formatPercentage(data.percentage)}
          </p>
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
    if (percentage < 5) return null; // Don't show label for small slices

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

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          animationDuration={animationDuration}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[entry.name as keyof typeof COLORS]}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={chartTheme.legendStyle}
          iconType="circle"
          iconSize={10}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

