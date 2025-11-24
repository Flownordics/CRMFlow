import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useRelatedTasks } from '@/services/tasks';
import { useQuotes } from '@/services/quotes';
import { useOrders } from '@/services/orders';
import { useInvoices } from '@/services/invoices';
import { formatMoneyMinor } from '@/lib/money';
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  ShoppingCart, 
  Receipt,
  TrendingUp,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectAnalyticsProps {
  dealId: string;
  projectStatus: string;
  budgetMinor?: number;
  currency?: string;
}

export function ProjectAnalytics({ dealId, projectStatus, budgetMinor, currency = 'DKK' }: ProjectAnalyticsProps) {
  const { data: tasks } = useRelatedTasks('deal', dealId);
  const { data: quotesData } = useQuotes({ dealId });
  const { data: ordersData } = useOrders({ dealId });
  const { data: invoicesData } = useInvoices({ orderId: undefined });

  const quotes = quotesData?.data || [];
  const orders = ordersData?.data || [];
  const invoices = (invoicesData?.data || []).filter((inv: any) => inv.dealId === dealId);

  // Task metrics
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
  const inProgressTasks = tasks?.filter(t => t.status === 'in_progress').length || 0;
  const pendingTasks = tasks?.filter(t => t.status === 'pending').length || 0;
  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Document metrics
  const totalQuotes = quotes.length;
  const totalOrders = orders.length;
  const totalInvoices = invoices.length;

  // Financial metrics (from invoices)
  const totalInvoiceValue = invoices.reduce((sum: number, inv: any) => {
    return sum + (inv.total_minor || 0);
  }, 0);

  const paidInvoices = invoices.filter((inv: any) => inv.status === 'paid').length;
  const unpaidInvoices = invoices.filter((inv: any) => inv.status === 'unpaid' || inv.status === 'overdue').length;

  // Time tracking metrics
  const totalEstimatedHours = tasks?.reduce((sum, task) => sum + (task.estimated_hours || 0), 0) || 0;
  const totalActualHours = tasks?.reduce((sum, task) => sum + (task.actual_hours || 0), 0) || 0;
  const hoursVariance = totalEstimatedHours > 0 ? totalActualHours - totalEstimatedHours : 0;
  const hoursVariancePercent = totalEstimatedHours > 0 ? (hoursVariance / totalEstimatedHours) * 100 : 0;
  const tasksWithTimeTracking = tasks?.filter(t => t.estimated_hours || t.actual_hours).length || 0;


  return (
    <div className="space-y-4">
      {/* Task Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{totalTasks}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{inProgressTasks}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingTasks}</p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Completion Rate</span>
                <span className="font-medium">{taskCompletionRate.toFixed(0)}%</span>
              </div>
              <Progress value={taskCompletionRate} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <FileText className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{totalQuotes}</p>
              <p className="text-xs text-muted-foreground">Quotes</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <ShoppingCart className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{totalOrders}</p>
              <p className="text-xs text-muted-foreground">Orders</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <Receipt className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">{totalInvoices}</p>
              <p className="text-xs text-muted-foreground">Invoices</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Tracking */}
      {tasksWithTimeTracking > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Time Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Estimated Hours</p>
                  <p className="text-2xl font-bold">{totalEstimatedHours.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Actual Hours</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    hoursVariance > 0 ? "text-red-600" : hoursVariance < 0 ? "text-green-600" : ""
                  )}>
                    {totalActualHours.toFixed(1)}h
                  </p>
                </div>
              </div>
              
              {totalEstimatedHours > 0 && (
                <>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {((totalActualHours / totalEstimatedHours) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((totalActualHours / totalEstimatedHours) * 100, 100)} 
                      className="h-2" 
                    />
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Variance</span>
                      <span className={cn(
                        "font-medium",
                        hoursVariance > 0 ? "text-red-600" : hoursVariance < 0 ? "text-green-600" : ""
                      )}>
                        {hoursVariance > 0 ? "+" : ""}{hoursVariance.toFixed(1)}h 
                        ({hoursVariancePercent > 0 ? "+" : ""}{hoursVariancePercent.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </>
              )}
              
              <div className="text-xs text-muted-foreground pt-2 border-t">
                {tasksWithTimeTracking} task{tasksWithTimeTracking !== 1 ? 's' : ''} with time tracking
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget vs Actual */}
      {budgetMinor !== undefined && budgetMinor > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Budget vs Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Budget</p>
                  <p className="text-2xl font-bold">
                    {formatMoneyMinor(budgetMinor, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Actual (Invoices)</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    totalInvoiceValue > budgetMinor ? "text-red-600" : "text-green-600"
                  )}>
                    {formatMoneyMinor(totalInvoiceValue, currency)}
                  </p>
                </div>
              </div>
              
              {budgetMinor > 0 && (
                <>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Budget Usage</span>
                      <span className="font-medium">
                        {Math.min((totalInvoiceValue / budgetMinor) * 100, 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((totalInvoiceValue / budgetMinor) * 100, 100)} 
                      className="h-2" 
                    />
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Variance</span>
                      <span className={cn(
                        "font-medium",
                        totalInvoiceValue > budgetMinor ? "text-red-600" : "text-green-600"
                      )}>
                        {totalInvoiceValue > budgetMinor ? "+" : ""}
                        {formatMoneyMinor(totalInvoiceValue - budgetMinor, currency)}
                        ({totalInvoiceValue > budgetMinor ? "+" : ""}
                        {(((totalInvoiceValue - budgetMinor) / budgetMinor) * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Metrics */}
      {totalInvoices > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Invoice Value</p>
                <p className="text-2xl font-bold">
                  {formatMoneyMinor(totalInvoiceValue, currency)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="text-xl font-semibold text-green-600">{paidInvoices}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unpaid</p>
                  <p className="text-xl font-semibold text-red-600">{unpaidInvoices}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

