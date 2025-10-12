import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@/services/analytics';
import {
  chartColors,
  chartTheme,
  defaultMargin,
  animationDuration,
} from './chartConfig';
import { ForecastData } from '@/services/forecasting';

interface ForecastChartProps {
  data: ForecastData;
  height?: number;
}

export function ForecastChart({ data, height = 350 }: ForecastChartProps) {
  if (data.historical.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Not enough historical data for forecasting
      </div>
    );
  }

  // Combine historical and forecast data
  const combinedData = [
    ...data.historical.map((point) => ({
      date: point.date,
      historical: point.value,
      forecast: null,
      upper: null,
      lower: null,
    })),
    ...data.forecast.map((point, index) => ({
      date: point.date,
      historical: null,
      forecast: point.value,
      upper: data.confidenceInterval.upper[index]?.value || null,
      lower: data.confidenceInterval.lower[index]?.value || null,
    })),
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });

      return (
        <div style={chartTheme.tooltipStyle} className="shadow-lg">
          <p className="font-semibold mb-2">{formattedDate}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.value === null) return null;
            
            let label = entry.name;
            if (label === 'historical') label = 'Actual Revenue';
            if (label === 'forecast') label = 'Forecasted Revenue';
            if (label === 'upper') label = 'Upper Bound (95%)';
            if (label === 'lower') label = 'Lower Bound (95%)';

            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                <span className="font-medium">{label}:</span>{' '}
                {formatCurrency(entry.value)}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Find the split point between historical and forecast
  const splitIndex = data.historical.length - 1;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={combinedData} margin={defaultMargin}>
        <defs>
          <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.2} />
            <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0.05} />
          </linearGradient>
        </defs>
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
              year: '2-digit',
            })
          }
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
        />
        <YAxis
          tickFormatter={(value) => formatCurrency(value)}
          style={chartTheme.axisStyle}
          stroke={chartTheme.gridStyle.stroke}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={chartTheme.legendStyle}
          iconType="line"
          iconSize={14}
        />

        {/* Confidence interval area */}
        <Area
          type="monotone"
          dataKey="upper"
          stroke="none"
          fill="url(#confidenceGradient)"
          name="Confidence Interval"
          animationDuration={animationDuration}
        />
        <Area
          type="monotone"
          dataKey="lower"
          stroke="none"
          fill="url(#confidenceGradient)"
          animationDuration={animationDuration}
        />

        {/* Historical data line */}
        <Line
          type="monotone"
          dataKey="historical"
          stroke={chartColors.primary}
          strokeWidth={3}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          name="Historical Revenue"
          animationDuration={animationDuration}
          connectNulls={false}
        />

        {/* Forecast line (dashed) */}
        <Line
          type="monotone"
          dataKey="forecast"
          stroke={chartColors.info}
          strokeWidth={3}
          strokeDasharray="5 5"
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          name="Forecasted Revenue"
          animationDuration={animationDuration}
          connectNulls={false}
        />

        {/* Vertical line to separate historical from forecast */}
        <ReferenceLine
          x={combinedData[splitIndex]?.date}
          stroke={chartTheme.gridStyle.stroke}
          strokeDasharray="3 3"
          label={{
            value: 'Today',
            position: 'top',
            style: { fontSize: 11, fill: chartTheme.axisStyle.fill },
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

