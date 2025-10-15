/**
 * AnalyticsCard
 * Reusable card wrapper for charts with consistent Analytics styling
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  headerAction?: React.ReactNode;
  chartName?: string; // For PDF export identification
}

export function AnalyticsCard({
  title,
  description,
  icon: Icon,
  children,
  isLoading = false,
  className,
  headerAction,
  chartName,
}: AnalyticsCardProps) {
  return (
    <Card className={cn('rounded-2xl border shadow-card', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
            <CardTitle>{title}</CardTitle>
          </div>
          {headerAction}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div data-chart-name={chartName}>
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * AnalyticsCardGrid
 * Grid layout for multiple analytics cards
 */
interface AnalyticsCardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function AnalyticsCardGrid({
  children,
  columns = 2,
  className,
}: AnalyticsCardGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-2 xl:grid-cols-4',
  };

  return (
    <div className={cn('grid grid-cols-1 gap-6', gridCols[columns], className)}>
      {children}
    </div>
  );
}

