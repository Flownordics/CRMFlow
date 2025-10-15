/**
 * EnhancedKpiCard
 * Reusable KPI card with progress bar, growth indicator, and icons
 * Matches Analytics page styling
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedKpiCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  
  // Growth/change indicators
  growth?: number;
  growthLabel?: string;
  showGrowthIndicator?: boolean;
  
  // Progress bar
  progress?: number;
  progressLabel?: string;
  showProgress?: boolean;
  
  // Comparison values
  target?: string | number;
  previous?: string | number;
  
  // Styling
  valueColor?: string;
  className?: string;
  isLoading?: boolean;
  
  // Additional content
  subtitle?: string;
  footer?: React.ReactNode;
}

export function EnhancedKpiCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  growth,
  growthLabel,
  showGrowthIndicator = true,
  progress,
  progressLabel,
  showProgress = false,
  target,
  previous,
  valueColor,
  className,
  isLoading = false,
  subtitle,
  footer,
}: EnhancedKpiCardProps) {
  if (isLoading) {
    return (
      <Card className={cn('rounded-2xl border shadow-card', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  const hasGrowth = growth !== undefined && showGrowthIndicator;
  const growthIsPositive = growth !== undefined && growth >= 0;
  const growthIsNeutral = growth !== undefined && Math.abs(growth) < 0.01;

  const GrowthIcon = growthIsNeutral
    ? Minus
    : growthIsPositive
    ? TrendingUp
    : TrendingDown;

  const growthColor = growthIsNeutral
    ? 'text-muted-foreground'
    : growthIsPositive
    ? 'text-[#6b7c5e]'
    : 'text-[#b8695f]';

  return (
    <Card className={cn('rounded-2xl border shadow-card', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className={cn('h-4 w-4 text-muted-foreground', iconColor)} />}
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', valueColor)}>{value}</div>

        {subtitle && !hasGrowth && !target && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}

        {hasGrowth && (
          <div className="flex items-center space-x-2 mt-2">
            <div className="flex items-center space-x-1">
              <GrowthIcon className={cn('h-3 w-3', growthColor)} />
              <span className={cn('text-xs', growthColor)}>
                {growthIsPositive && !growthIsNeutral ? '+' : ''}
                {growth.toFixed(1)}%
              </span>
            </div>
            {(target || growthLabel) && (
              <span className="text-xs text-muted-foreground">
                {target ? `vs target: ${target}` : growthLabel}
              </span>
            )}
          </div>
        )}

        {!hasGrowth && target && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">
              Target: <span className="font-medium">{target}</span>
            </p>
          </div>
        )}

        {!hasGrowth && previous && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">
              Previous: <span className="font-medium">{previous}</span>
            </p>
          </div>
        )}

        {showProgress && progress !== undefined && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{progressLabel || 'Progress'}</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {footer && <div className="mt-3">{footer}</div>}
      </CardContent>
    </Card>
  );
}

/**
 * EnhancedKpiGrid
 * Grid layout for KPI cards
 */
interface EnhancedKpiGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

export function EnhancedKpiGrid({
  children,
  columns = 4,
  className,
}: EnhancedKpiGridProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
    5: 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  };

  return (
    <div className={cn('grid grid-cols-1 gap-4', gridCols[columns], className)}>
      {children}
    </div>
  );
}

