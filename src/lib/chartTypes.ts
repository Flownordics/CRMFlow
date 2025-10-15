/**
 * Chart Type Definitions
 * Shared types for Recharts components
 */

export interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: Record<string, any>;
    value?: number;
    name?: string;
    dataKey?: string;
    color?: string;
  }>;
  label?: string;
}

export interface ChartDataPoint {
  [key: string]: string | number | undefined;
}

