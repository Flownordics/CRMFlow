import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from './analytics';
import { logger } from '@/lib/logger';

export interface ForecastPoint {
  date: string;
  value: number;
  type: 'historical' | 'forecast';
}

export interface ForecastData {
  historical: ForecastPoint[];
  forecast: ForecastPoint[];
  confidenceInterval: {
    upper: ForecastPoint[];
    lower: ForecastPoint[];
  };
}

export interface ForecastSummary {
  nextMonthRevenue: number;
  nextQuarterRevenue: number;
  expectedDealsToClose: number;
  pipelineHealthScore: number;
  confidence: 'high' | 'medium' | 'low';
}

// Simple linear regression for trend analysis
function linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const point of data) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

// Calculate standard deviation for confidence intervals
function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  
  return Math.sqrt(variance);
}

export function useForecast(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['forecast', dateRange],
    queryFn: async () => {
      try {
        logger.debug('[Forecast] Calculating forecast', { dateRange });

        // Fetch historical revenue data (paid invoices)
        let query = supabase
          .from('invoices')
          .select('created_at, total_minor, status')
          .eq('status', 'paid')
          .is('deleted_at', null)
          .order('created_at', { ascending: true });

        // Use last 12 months for better trend analysis
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        query = query.gte('created_at', twelveMonthsAgo.toISOString());

        const { data: invoices, error } = await query;

        if (error) throw error;

        if (!invoices || invoices.length === 0) {
          return getEmptyForecast();
        }

        // Group by month
        const monthlyRevenue = new Map<string, number>();
        
        invoices.forEach((invoice) => {
          const date = new Date(invoice.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          monthlyRevenue.set(
            monthKey,
            (monthlyRevenue.get(monthKey) || 0) + invoice.total_minor
          );
        });

        // Convert to array and sort
        const sortedMonths = Array.from(monthlyRevenue.entries())
          .sort(([a], [b]) => a.localeCompare(b));

        // Prepare data for regression
        const regressionData = sortedMonths.map(([_, revenue], index) => ({
          x: index,
          y: revenue,
        }));

        // Calculate trend
        const { slope, intercept } = linearRegression(regressionData);

        // Calculate standard deviation for confidence intervals
        const revenues = sortedMonths.map(([_, revenue]) => revenue);
        const stdDev = calculateStandardDeviation(revenues);

        // Generate forecast for next 6 months
        const forecastMonths = 6;
        const lastIndex = regressionData.length - 1;
        const forecast: ForecastPoint[] = [];
        const upperBound: ForecastPoint[] = [];
        const lowerBound: ForecastPoint[] = [];

        for (let i = 1; i <= forecastMonths; i++) {
          const futureIndex = lastIndex + i;
          const predictedValue = slope * futureIndex + intercept;
          
          // Confidence interval (1.96 * std dev for 95% confidence)
          const margin = 1.96 * stdDev * Math.sqrt(1 + 1 / regressionData.length);

          const lastMonthStr = sortedMonths[sortedMonths.length - 1][0];
          const [year, month] = lastMonthStr.split('-').map(Number);
          const forecastDate = new Date(year, month - 1 + i, 1);
          const dateStr = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}-01`;

          forecast.push({
            date: dateStr,
            value: Math.max(0, predictedValue),
            type: 'forecast',
          });

          upperBound.push({
            date: dateStr,
            value: Math.max(0, predictedValue + margin),
            type: 'forecast',
          });

          lowerBound.push({
            date: dateStr,
            value: Math.max(0, predictedValue - margin),
            type: 'forecast',
          });
        }

        // Historical data points
        const historical: ForecastPoint[] = sortedMonths.map(([date, revenue]) => ({
          date: `${date}-01`,
          value: revenue,
          type: 'historical' as const,
        }));

        // Calculate summary metrics
        const summary = await calculateForecastSummary(forecast, stdDev, revenues);

        return {
          forecastData: {
            historical,
            forecast,
            confidenceInterval: {
              upper: upperBound,
              lower: lowerBound,
            },
          },
          summary,
        };
      } catch (error) {
        logger.error('[Forecast] Failed to calculate forecast', error);
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

async function calculateForecastSummary(
  forecast: ForecastPoint[],
  stdDev: number,
  historicalRevenues: number[]
): Promise<ForecastSummary> {
  // Next month revenue (first forecast point)
  const nextMonthRevenue = forecast[0]?.value || 0;

  // Next quarter revenue (sum of next 3 months)
  const nextQuarterRevenue = forecast
    .slice(0, 3)
    .reduce((sum, point) => sum + point.value, 0);

  // Fetch active deals to estimate deals to close
  const { data: activeDeals } = await supabase
    .from('deals')
    .select('expected_value_minor, stage_id')
    .is('deleted_at', null);

  // Estimate deals to close based on pipeline (simplified)
  const expectedDealsToClose = activeDeals ? Math.ceil(activeDeals.length * 0.3) : 0;

  // Pipeline health score (0-100) based on trend and variance
  const avgRevenue = historicalRevenues.reduce((sum, val) => sum + val, 0) / historicalRevenues.length;
  const coefficientOfVariation = stdDev / avgRevenue;
  
  // Lower CV = more stable = higher health score
  const stabilityScore = Math.max(0, 100 - coefficientOfVariation * 100);
  
  // Trend score (positive trend = higher score)
  const trendScore = forecast[0]?.value > avgRevenue ? 75 : 50;
  
  const pipelineHealthScore = Math.min(100, (stabilityScore + trendScore) / 2);

  // Confidence level based on CV and data points
  let confidence: 'high' | 'medium' | 'low';
  if (coefficientOfVariation < 0.2 && historicalRevenues.length >= 6) {
    confidence = 'high';
  } else if (coefficientOfVariation < 0.4 && historicalRevenues.length >= 3) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    nextMonthRevenue,
    nextQuarterRevenue,
    expectedDealsToClose,
    pipelineHealthScore,
    confidence,
  };
}

function getEmptyForecast() {
  return {
    forecastData: {
      historical: [],
      forecast: [],
      confidenceInterval: {
        upper: [],
        lower: [],
      },
    },
    summary: {
      nextMonthRevenue: 0,
      nextQuarterRevenue: 0,
      expectedDealsToClose: 0,
      pipelineHealthScore: 0,
      confidence: 'low' as const,
    },
  };
}

