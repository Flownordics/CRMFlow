import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Phone, Mail, Users, FileText, CheckSquare } from 'lucide-react';
import { ActivityMetrics } from '@/services/activityAnalytics';
import { formatPercentage, formatGrowth } from '@/services/analytics';
import { cn } from '@/lib/utils';

interface ActivityMetricsCardProps {
  metrics: ActivityMetrics;
}

export function ActivityMetricsCard({ metrics }: ActivityMetricsCardProps) {
  const metricItems = [
    {
      label: 'Total Activities',
      value: metrics.totalActivities,
      growth: metrics.activitiesGrowth,
      icon: FileText,
      color: 'text-[#c89882]',
    },
    {
      label: 'Calls',
      value: metrics.callCount,
      successRate: metrics.callSuccessRate,
      icon: Phone,
      color: 'text-[#7a9db3]',
    },
    {
      label: 'Emails',
      value: metrics.emailCount,
      successRate: metrics.emailSuccessRate,
      icon: Mail,
      color: 'text-[#9d94af]',
    },
    {
      label: 'Meetings',
      value: metrics.meetingCount,
      successRate: metrics.meetingSuccessRate,
      icon: Users,
      color: 'text-[#6b7c5e]',
    },
    {
      label: 'Notes',
      value: metrics.noteCount,
      icon: FileText,
      color: 'text-[#9d855e]',
    },
    {
      label: 'Tasks',
      value: metrics.taskCount,
      icon: CheckSquare,
      color: 'text-[#b8695f]',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metricItems.map((item, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
            <item.icon className={cn('h-4 w-4', item.color)} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
            <div className="flex items-center gap-2 mt-2">
              {item.growth !== undefined && (
                <div className="flex items-center space-x-1">
                  {item.growth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span
                    className={cn(
                      'text-xs',
                      item.growth >= 0 ? 'text-success' : 'text-destructive'
                    )}
                  >
                    {formatGrowth(item.growth)}
                  </span>
                </div>
              )}
              {item.successRate !== undefined && item.successRate > 0 && (
                <span className="text-xs text-muted-foreground">
                  Success: {formatPercentage(item.successRate)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg per Day</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.avgActivitiesPerDay.toFixed(1)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Activities per day
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg per Company</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.avgActivitiesPerCompany.toFixed(1)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Activities per company
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

