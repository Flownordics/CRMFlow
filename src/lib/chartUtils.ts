/**
 * Chart Utilities
 * Shared helper functions for data transformation, formatting, and color assignment
 */

/**
 * Transform data for time-series charts
 * Groups data by date and aggregates values
 */
export function groupByDate<T>(
  data: T[],
  dateKey: keyof T,
  valueKey: keyof T,
  aggregation: 'sum' | 'avg' | 'count' = 'sum'
): Array<{ date: string; value: number }> {
  const grouped = new Map<string, number[]>();

  data.forEach((item) => {
    const date = new Date(item[dateKey] as any).toISOString().split('T')[0];
    const value = Number(item[valueKey]) || 0;

    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(value);
  });

  return Array.from(grouped.entries())
    .map(([date, values]) => {
      let value: number;
      if (aggregation === 'sum') {
        value = values.reduce((sum, v) => sum + v, 0);
      } else if (aggregation === 'avg') {
        value = values.reduce((sum, v) => sum + v, 0) / values.length;
      } else {
        value = values.length;
      }
      return { date, value };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Group data by month for monthly charts
 */
export function groupByMonth<T>(
  data: T[],
  dateKey: keyof T,
  valueKey: keyof T,
  aggregation: 'sum' | 'avg' | 'count' = 'sum'
): Array<{ month: string; value: number }> {
  const grouped = new Map<string, number[]>();

  data.forEach((item) => {
    const date = new Date(item[dateKey] as any);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const value = Number(item[valueKey]) || 0;

    if (!grouped.has(month)) {
      grouped.set(month, []);
    }
    grouped.get(month)!.push(value);
  });

  return Array.from(grouped.entries())
    .map(([month, values]) => {
      let value: number;
      if (aggregation === 'sum') {
        value = values.reduce((sum, v) => sum + v, 0);
      } else if (aggregation === 'avg') {
        value = values.reduce((sum, v) => sum + v, 0) / values.length;
      } else {
        value = values.length;
      }
      return { month, value };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Calculate distribution (count by category)
 */
export function calculateDistribution<T>(
  data: T[],
  categoryKey: keyof T
): Array<{ name: string; value: number }> {
  const counts = new Map<string, number>();

  data.forEach((item) => {
    const category = String(item[categoryKey] || 'Unknown');
    counts.set(category, (counts.get(category) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Calculate percentage distribution
 */
export function calculatePercentageDistribution<T>(
  data: T[],
  categoryKey: keyof T
): Array<{ name: string; value: number; percentage: number }> {
  const distribution = calculateDistribution(data, categoryKey);
  const total = distribution.reduce((sum, item) => sum + item.value, 0);

  return distribution.map((item) => ({
    ...item,
    percentage: total > 0 ? (item.value / total) * 100 : 0,
  }));
}

/**
 * Get color by index from palette
 * Re-exported from chartConfig for convenience
 */
export { getChartColor as getColorByIndex } from '@/components/analytics/charts/chartConfig';

/**
 * Get consistent color for a role title
 * Uses the role name to map to a specific color from the chart palette
 * Uses a simple character sum with prime number multiplication for better distribution
 */
export function getRoleColor(title: string | null | undefined): string {
  // Original chart palette colors from chartConfig.ts
  const palette = [
    '#7a9db3', // muted blue-grey
    '#9d94af', // muted purple
    '#b5c69f', // sage green
    '#d4a574', // muted gold
    '#fb8674', // muted coral
    '#7fa39b', // muted teal
    '#c89882', // soft terracotta
    '#95a39c', // grey-green
  ];
  
  if (!title) return palette[7]; // grey-green for unknown
  
  // Simple but effective: sum all character codes and multiply by position
  // This gives better distribution than hash functions for short strings
  let sum = 0;
  for (let i = 0; i < title.length; i++) {
    sum += title.charCodeAt(i) * (i + 1);
  }
  
  return palette[sum % palette.length];
}

/**
 * Get consistent color for an industry
 * Uses the industry name to map to a specific color from the chart palette
 */
export function getIndustryColor(industry: string | null | undefined): string {
  // Original chart palette colors from chartConfig.ts
  const palette = [
    '#7a9db3', // muted blue-grey
    '#9d94af', // muted purple
    '#b5c69f', // sage green
    '#d4a574', // muted gold
    '#fb8674', // muted coral
    '#7fa39b', // muted teal
    '#c89882', // soft terracotta
    '#95a39c', // grey-green
  ];
  
  if (!industry) return palette[7]; // grey-green for unknown
  
  // Use same hashing approach as role colors for consistency
  let sum = 0;
  for (let i = 0; i < industry.length; i++) {
    sum += industry.charCodeAt(i) * (i + 1);
  }
  
  return palette[sum % palette.length];
}

/**
 * Get consistent color for a tag
 * Uses the tag name to map to a specific color from the chart palette
 */
export function getTagColor(tagName: string | null | undefined): string {
  // Original chart palette colors from chartConfig.ts
  const palette = [
    '#7a9db3', // muted blue-grey
    '#9d94af', // muted purple
    '#b5c69f', // sage green
    '#d4a574', // muted gold
    '#fb8674', // muted coral
    '#7fa39b', // muted teal
    '#c89882', // soft terracotta
    '#95a39c', // grey-green
  ];
  
  if (!tagName) return palette[7]; // grey-green for unknown
  
  // Use same hashing approach as role and industry colors for consistency
  let sum = 0;
  for (let i = 0; i < tagName.length; i++) {
    sum += tagName.charCodeAt(i) * (i + 1);
  }
  
  return palette[sum % palette.length];
}

/**
 * Format number with abbreviations (K, M, B)
 */
export function formatNumberAbbreviated(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Calculate growth rate between two values
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Calculate moving average
 */
export function calculateMovingAverage(
  data: number[],
  windowSize: number = 7
): number[] {
  if (data.length < windowSize) return data;

  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
    result.push(avg);
  }
  return result;
}

/**
 * Get trend direction based on data points
 */
export function getTrendDirection(data: number[]): 'up' | 'down' | 'stable' {
  if (data.length < 2) return 'stable';

  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));

  const avgFirst = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

  const changePercent = ((avgSecond - avgFirst) / avgFirst) * 100;

  if (Math.abs(changePercent) < 5) return 'stable';
  return changePercent > 0 ? 'up' : 'down';
}

/**
 * Fill missing dates in time series data
 */
export function fillMissingDates(
  data: Array<{ date: string; value: number }>,
  fillValue: number = 0
): Array<{ date: string; value: number }> {
  if (data.length === 0) return [];

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const start = new Date(sorted[0].date);
  const end = new Date(sorted[sorted.length - 1].date);

  const filled: Array<{ date: string; value: number }> = [];
  const dataMap = new Map(data.map((d) => [d.date, d.value]));

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    filled.push({
      date: dateStr,
      value: dataMap.get(dateStr) ?? fillValue,
    });
  }

  return filled;
}

/**
 * Convert minor currency units to major (e.g., cents to dollars)
 */
export function minorToMajor(minorValue: number): number {
  return minorValue / 100;
}

/**
 * Calculate percentile
 */
export function calculatePercentile(data: number[], percentile: number): number {
  if (data.length === 0) return 0;

  const sorted = [...data].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

