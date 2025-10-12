import { useQuery } from "@tanstack/react-query";
import { useEnhancedDashboardMetrics } from "./dashboardMetrics";
import { useUpcomingTasks } from "./tasks";

export interface DashboardAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  count?: number;
  value?: number;
  currency?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function useDashboardAlerts() {
  const { data: metrics } = useEnhancedDashboardMetrics();
  const { data: tasks } = useUpcomingTasks();

  return useQuery({
    queryKey: ['dashboard-alerts', metrics, tasks],
    queryFn: () => {
      const alerts: DashboardAlert[] = [];

      if (!metrics) return alerts;

      // Overdue Invoices
      if (metrics.overdueInvoicesCount > 0) {
        alerts.push({
          id: 'overdue-invoices',
          type: 'error',
          title: 'Overdue Invoices',
          description: `${metrics.overdueInvoicesCount} invoice${metrics.overdueInvoicesCount > 1 ? 's' : ''} overdue`,
          count: metrics.overdueInvoicesCount,
          value: metrics.overdueInvoices,
          currency: 'DKK',
          action: {
            label: 'View Invoices',
            href: '/invoices?status=overdue'
          }
        });
      }

      // Deals Closing This Week
      if (metrics.dealsClosingThisWeek > 0) {
        alerts.push({
          id: 'deals-closing',
          type: 'info',
          title: 'Deals Closing This Week',
          description: `${metrics.dealsClosingThisWeek} deal${metrics.dealsClosingThisWeek > 1 ? 's' : ''} expected to close`,
          count: metrics.dealsClosingThisWeek,
          action: {
            label: 'View Deals',
            href: '/deals'
          }
        });
      }

      // Stale Deals
      if (metrics.staleDeals > 0) {
        alerts.push({
          id: 'stale-deals',
          type: 'warning',
          title: 'Stale Deals',
          description: `${metrics.staleDeals} deal${metrics.staleDeals > 1 ? 's' : ''} with no activity > 30 days`,
          count: metrics.staleDeals,
          action: {
            label: 'Review Deals',
            href: '/deals'
          }
        });
      }

      // Companies Needing Attention
      if (metrics.companiesNeedingAttention > 0) {
        alerts.push({
          id: 'companies-attention',
          type: 'warning',
          title: 'Companies Need Attention',
          description: `${metrics.companiesNeedingAttention} compan${metrics.companiesNeedingAttention > 1 ? 'ies' : 'y'} with red/yellow status`,
          count: metrics.companiesNeedingAttention,
          action: {
            label: 'View Companies',
            href: '/companies?activityStatus=red,yellow'
          }
        });
      }

      // Quotes Expiring Soon
      if (metrics.quotesExpiringSoon > 0) {
        alerts.push({
          id: 'quotes-expiring',
          type: 'warning',
          title: 'Quotes Expiring Soon',
          description: `${metrics.quotesExpiringSoon} quote${metrics.quotesExpiringSoon > 1 ? 's' : ''} expiring within 7 days`,
          count: metrics.quotesExpiringSoon,
          action: {
            label: 'View Quotes',
            href: '/quotes'
          }
        });
      }

      // Overdue Tasks
      if (tasks && tasks.length > 0) {
        const overdueTasks = tasks.filter(task => 
          task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
        );
        
        if (overdueTasks.length > 0) {
          alerts.push({
            id: 'overdue-tasks',
            type: 'error',
            title: 'Overdue Tasks',
            description: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} overdue`,
            count: overdueTasks.length,
            action: {
              label: 'View Tasks',
              href: '/tasks'
            }
          });
        }
      }

      return alerts;
    },
    enabled: !!metrics,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

