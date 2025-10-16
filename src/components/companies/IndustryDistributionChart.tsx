/**
 * IndustryDistributionChart
 * Bar chart showing distribution of companies by industry
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { chartTheme, animationDuration } from '@/components/analytics/charts/chartConfig';
import { calculateDistribution, getIndustryColor } from '@/lib/chartUtils';

interface IndustryDistributionChartProps {
  companies: Array<{ industry?: string | null }>;
  height?: number;
}

export function IndustryDistributionChart({ companies, height = 300 }: IndustryDistributionChartProps) {
  // Calculate distribution
  const distribution = calculateDistribution(
    companies.filter((c) => c.industry),
    'industry'
  );

  // Take top 8 industries
  const chartData = distribution.slice(0, 8);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No industry data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    const total = distribution.reduce((sum, item) => sum + item.value, 0);
    const percentage = ((data.value / total) * 100).toFixed(1);
    
    return (
      <div style={chartTheme.tooltipStyle} className="shadow-lg">
        <p className="font-semibold mb-2">{data.name}</p>
        <p className="text-sm">
          <span className="font-medium">Companies:</span> {data.value}
        </p>
        <p className="text-sm">
          <span className="font-medium">Percentage:</span> {percentage}%
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
          dataKey="name"
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="value"
          name="Companies"
          radius={[4, 4, 0, 0]}
          animationDuration={animationDuration}
        >
          {chartData.map((entry) => (
            <Cell key={`cell-${entry.name}`} fill={getIndustryColor(entry.name)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

