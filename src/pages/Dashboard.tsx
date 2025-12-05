import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  Handshake,
  TrendingUp,
  DollarSign,
  Calendar,
  FileText,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Receipt,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { useDashboardData, formatCurrency } from "@/services/dashboard";
import { useUpcomingTasks } from "@/services/tasks";
import { useNavigate } from "react-router-dom";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { PipelineSummary } from "@/components/dashboard/PipelineSummary";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { DealsChart } from "@/components/dashboard/DealsChart";
import { EnhancedKPIs } from "@/components/dashboard/EnhancedKPIs";
import { ForecastWidget } from "@/components/dashboard/ForecastWidget";
import { CompaniesWidget } from "@/components/dashboard/CompaniesWidget";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { EmailActivityWidget } from "@/components/dashboard/EmailActivityWidget";
import { DateRangeSelector, getInitialDateRange, type DateRange } from "@/components/dashboard/DateRangeSelector";
import { generateFriendlyNumber } from "@/lib/friendlyNumbers";

// Loading skeleton component
function MetricCardSkeleton() {
  return (
    <Card className="ease-out-soft rounded-2xl border shadow-card">
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange>(() => getInitialDateRange());
  const { metrics, recentDeals, recentQuotes, recentInvoices, isLoading, user } = useDashboardData();
  const { data: upcomingTasks, isLoading: tasksLoading } = useUpcomingTasks();

  // Create metric cards data
  const metricCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(metrics.totalRevenue),
      change: metrics.totalRevenueChange > 0 ? `+${metrics.totalRevenueChange}%` : `${metrics.totalRevenueChange}%`,
      trend: metrics.totalRevenueChange >= 0 ? "up" : "down",
      icon: DollarSign,
      color: "text-success",
    },
    {
      title: "Active Deals",
      value: metrics.activeDeals.toString(),
      change: metrics.activeDealsChange > 0 ? `+${metrics.activeDealsChange}` : `${metrics.activeDealsChange}`,
      trend: metrics.activeDealsChange >= 0 ? "up" : "down",
      icon: Handshake,
      color: "text-primary",
    },
    {
      title: "Companies",
      value: metrics.totalCompanies.toString(),
      change: metrics.totalCompaniesChange > 0 ? `+${metrics.totalCompaniesChange}` : `${metrics.totalCompaniesChange}`,
      trend: metrics.totalCompaniesChange >= 0 ? "up" : "down",
      icon: Building2,
      color: "text-accent",
    },
    {
      title: "Contacts",
      value: metrics.totalContacts.toString(),
      change: metrics.totalContactsChange > 0 ? `+${metrics.totalContactsChange}` : `${metrics.totalContactsChange}`,
      trend: metrics.totalContactsChange >= 0 ? "up" : "down",
      icon: Users,
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Welcome Header */}
      <PageHeader
        title={`Welcome back, ${user?.name || 'User'}`}
        actions={
          <div className="hidden sm:block">
            <DateRangeSelector value={dateRange} onChange={setDateRange} />
          </div>
        }
      />

      {/* Second Row: Alerts, Forecast, Companies, Email Activity */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <AlertsPanel />
        <ForecastWidget />
        <CompaniesWidget />
        <EmailActivityWidget />
      </div>

      {/* Enhanced KPIs */}
      <EnhancedKPIs />

      {/* Sales Pipeline */}
      <PipelineSummary />

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <RevenueChart />
        <DealsChart />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2 xl:grid-cols-5">
        {/* Recent Deals */}
        <Card className="rounded-2xl border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake aria-hidden="true" className="h-5 w-5" />
              Recent Deals
            </CardTitle>
            <CardDescription>Latest sales opportunities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-8" />
                  </div>
                </div>
              ))
            ) : recentDeals.length > 0 ? (
              recentDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/deals/${deal.id}`)}
                >
                  <div>
                    <div className="text-sm font-medium">{deal.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {deal.company_name} • {deal.stage_name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatCurrency(deal.expected_value_minor, deal.currency)}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(deal.probability * 100)}%
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-4">
                No deals found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Quotes */}
        <Card className="rounded-2xl border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText aria-hidden="true" className="h-5 w-5" />
              Recent Quotes
            </CardTitle>
            <CardDescription>Latest quote requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                </div>
              ))
            ) : recentQuotes.length > 0 ? (
              recentQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/quotes/${quote.id}`)}
                >
                  <div>
                    <div className="text-sm font-medium">
                      {quote.number || generateFriendlyNumber(quote.id, 'quote')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {quote.company_name} • {quote.status}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatCurrency(quote.total_minor, quote.currency)}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {quote.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-4">
                No quotes found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="rounded-2xl border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt aria-hidden="true" className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
            <CardDescription>Latest invoice activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                </div>
              ))
            ) : recentInvoices.length > 0 ? (
              recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                >
                  <div>
                    <div className="text-sm font-medium">
                      {invoice.number || generateFriendlyNumber(invoice.id, 'invoice')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {invoice.company_name} • {invoice.status}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatCurrency(invoice.total_minor, invoice.currency)}
                    </div>
                    <Badge
                      variant={invoice.status === 'paid' ? 'default' : invoice.status === 'overdue' ? 'destructive' : 'outline'}
                      className="text-xs"
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-4">
                No invoices found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card className="rounded-2xl border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar aria-hidden="true" className="h-5 w-5" />
              Upcoming Tasks
            </CardTitle>
            <CardDescription>Tasks due soon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tasksLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-8" />
                  </div>
                </div>
              ))
            ) : upcomingTasks && upcomingTasks.length > 0 ? (
              upcomingTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/tasks`)}
                >
                  <div>
                    <div className="text-sm font-medium">{task.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Due {new Date(task.due_date!).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-4">
                No upcoming tasks
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <ActivityFeed />
      </div>
    </div>
  );
}
