import { useParams, Link, useNavigate } from "react-router-dom";
import { useProject, useUpdateProject } from "@/services/projects";
import { useDeal } from "@/services/deals";
import { useCompanies } from "@/services/companies";
import { useQuotes } from "@/services/quotes";
import { useOrders } from "@/services/orders";
import { useInvoices } from "@/services/invoices";
import { useRelatedTasks } from "@/services/tasks";
import { useUsers } from "@/services/users";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { RelatedTasksList } from "@/components/tasks/RelatedTasksList";
import { ProjectAnalytics } from "@/components/projects/ProjectAnalytics";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
import { DealActivityList } from "@/components/deals/DealActivityList";
import { ProjectTeam } from "@/components/projects/ProjectTeam";
import { formatMoneyMinor } from "@/lib/money";
import { toastBus } from "@/lib/toastBus";
import { format } from "date-fns";
import { FolderKanban, ExternalLink, ArrowLeft, Calendar, User, TrendingUp, FileText, ShoppingCart, Receipt, Building2, Activity, Edit, MoreVertical, Download, Archive, CheckCircle2 } from "lucide-react";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusColors = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export default function ProjectDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: project, isLoading, error } = useProject(id);
  const updateProject = useUpdateProject();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Get deal from project
  const { data: deal } = useDeal(project?.deal_id);
  
  // Get company
  const { data: companyData } = useCompanies({ q: deal?.company_id });
  const company = companyData?.data?.[0];

  // Get users for owner lookup
  const { data: users } = useUsers();
  const owner = users?.find(u => u.id === project?.owner_user_id);

  // Get related entities via deal_id
  const { data: quotesData } = useQuotes({ dealId: project?.deal_id });
  const quotes = quotesData?.data || [];
  
  const { data: ordersData } = useOrders({ dealId: project?.deal_id });
  const orders = ordersData?.data || [];
  
  const { data: invoicesData } = useInvoices({ orderId: undefined }); // We'll filter by deal_id manually
  const invoices = (invoicesData?.data || []).filter(
    (inv: any) => inv.dealId === project?.deal_id
  );

  // Get tasks for health score calculation
  const { data: tasks } = useRelatedTasks('deal', project?.deal_id || '');
  
  // Calculate project health score (same logic as ProjectAnalytics)
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
  const pendingTasks = tasks?.filter(t => t.status === 'pending').length || 0;
  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const totalQuotes = quotes.length;
  const totalOrders = orders.length;
  const totalInvoices = invoices.length;
  
  const healthScore = React.useMemo(() => {
    let score = 0;
    let factors = 0;
    
    // Task completion (40% weight)
    if (totalTasks > 0) {
      score += (taskCompletionRate / 100) * 40;
      factors += 40;
    }
    
    // Project status (30% weight)
    if (project?.status === 'active') {
      score += 30;
    } else if (project?.status === 'on_hold') {
      score += 15;
    } else if (project?.status === 'completed') {
      score += 30;
    }
    factors += 30;
    
    // Document progression (30% weight)
    const hasQuotes = totalQuotes > 0;
    const hasOrders = totalOrders > 0;
    const hasInvoices = totalInvoices > 0;
    let docScore = 0;
    if (hasQuotes) docScore += 10;
    if (hasOrders) docScore += 10;
    if (hasInvoices) docScore += 10;
    score += docScore;
    factors += 30;
    
    return factors > 0 ? Math.round((score / factors) * 100) : 0;
  }, [taskCompletionRate, project?.status, totalTasks, totalQuotes, totalOrders, totalInvoices]);
  
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getHealthBadge = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div role="alert" className="p-6 text-destructive">
        Failed to load project
      </div>
    );
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateProject.mutateAsync({
        id: project.id,
        status: newStatus as any,
      });
    } catch (error) {
      console.error("Failed to update project status:", error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/projects" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <Badge
            className={cn(
              "text-xs",
              statusColors[project.status as keyof typeof statusColors]
            )}
          >
            {project.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Select value={project.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                // Export Project Report - placeholder
                toastBus.emit({
                  title: "Export",
                  description: "Project report export coming soon",
                });
              }}>
                <Download className="h-4 w-4 mr-2" />
                Export Project Report
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                if (project.status !== 'cancelled') {
                  handleStatusChange('cancelled');
                }
              }}>
                <Archive className="h-4 w-4 mr-2" />
                Archive Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {project.description && (
        <p className="text-muted-foreground">{project.description}</p>
      )}

      {/* Merged Project Information, Linked Deal & Health Score */}
      <div className="rounded-2xl border p-6 shadow-card bg-gradient-to-br from-background to-muted/20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Project Information & Linked Deal */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FolderKanban className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Project Information</h2>
            </div>
            
            <div className="space-y-3">
              {project.start_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Start Date: </span>
                    <span className="font-medium">{format(new Date(project.start_date), "PPP")}</span>
                  </div>
                </div>
              )}
              {project.end_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">End Date: </span>
                    <span className="font-medium">{format(new Date(project.end_date), "PPP")}</span>
                  </div>
                </div>
              )}
              {project.owner_user_id && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Owner: </span>
                    <span className="font-medium">{owner ? owner.name : 'Loading...'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Linked Deal */}
            {deal && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Linked Deal</h2>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Link
                      to={`/deals/${deal.id}`}
                      className="text-base font-semibold text-primary hover:underline flex items-center gap-2 group"
                    >
                      {deal.title}
                      <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </div>
                  {company && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Company: </span>
                        <Link
                          to={`/companies/${company.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {company.name}
                        </Link>
                      </div>
                    </div>
                  )}
                  {typeof deal.expected_value_minor === "number" && deal.expected_value_minor > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Expected Value: </span>
                        <span className="font-medium">{formatMoneyMinor(deal.expected_value_minor, deal.currency)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Middle Column: Task Metrics */}
          <div className="space-y-4 border-l pl-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Tasks</h2>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="text-lg font-semibold">{totalTasks}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                  <div className="text-lg font-semibold text-green-600">{completedTasks}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">In Progress</div>
                  <div className="text-lg font-semibold text-blue-600">{tasks?.filter(t => t.status === 'in_progress').length || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                  <div className="text-lg font-semibold text-yellow-600">{pendingTasks}</div>
                </div>
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span className="font-medium">{taskCompletionRate.toFixed(0)}%</span>
                </div>
                <Progress value={taskCompletionRate} className="h-2" />
              </div>
            </div>
          </div>

          {/* Right Column: Project Health */}
          <div className="space-y-4 border-l pl-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Project Health</h2>
              </div>
              <Badge className={cn("text-sm font-semibold", getHealthBadge(healthScore))}>
                {healthScore}%
              </Badge>
            </div>
            
            <div className="space-y-3">
              <div>
                <Progress value={healthScore} className="h-3 mb-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall status</span>
                  <span className={cn("font-medium", getHealthColor(healthScore))}>
                    {healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : 'Needs Attention'}
                  </span>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-2">Documents</div>
                <div className="text-lg font-semibold">{totalQuotes + totalOrders + totalInvoices}</div>
                <div className="text-xs text-muted-foreground">
                  {totalQuotes}Q / {totalOrders}O / {totalInvoices}I
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Tasks - Most Important, comes right after project details */}
      {deal && (
        <Card>
          <CardHeader>
            <CardTitle>Project Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <RelatedTasksList
              relatedType="deal"
              relatedId={deal.id}
              relatedTitle={deal.title}
            />
          </CardContent>
        </Card>
      )}

      {/* Activity Timeline and Related Documents - Side by Side */}
      {deal && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Timeline */}
          <div className="rounded-2xl border p-4 shadow-card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Timeline
            </h2>
            <DealActivityList dealId={deal.id} />
          </div>

          {/* Related Documents Section - Compact Design */}
          {(quotes.length > 0 || orders.length > 0 || invoices.length > 0) && (
            <div className="rounded-2xl border p-4 shadow-card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Related Documents
              </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quotes.length > 0 && (
              <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Quotes</span>
                  </div>
                  <Badge variant="outline">{quotes.length}</Badge>
                </div>
                <div className="space-y-1">
                  {quotes.slice(0, 2).map((quote: any) => (
                    <Link
                      key={quote.id}
                      to={`/quotes/${quote.id}`}
                      className="block text-sm text-primary hover:underline"
                    >
                      {quote.number || `Quote ${quote.id.slice(0, 8)}`}
                    </Link>
                  ))}
                  {quotes.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{quotes.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {orders.length > 0 && (
              <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Orders</span>
                  </div>
                  <Badge variant="outline">{orders.length}</Badge>
                </div>
                <div className="space-y-1">
                  {orders.slice(0, 2).map((order: any) => (
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}`}
                      className="block text-sm text-primary hover:underline"
                    >
                      {order.number || `Order ${order.id.slice(0, 8)}`}
                    </Link>
                  ))}
                  {orders.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{orders.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {invoices.length > 0 && (
              <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Invoices</span>
                  </div>
                  <Badge variant="outline">{invoices.length}</Badge>
                </div>
                <div className="space-y-1">
                  {invoices.slice(0, 2).map((invoice: any) => (
                    <Link
                      key={invoice.id}
                      to={`/invoices/${invoice.id}`}
                      className="block text-sm text-primary hover:underline"
                    >
                      {invoice.number || `Invoice ${invoice.id.slice(0, 8)}`}
                    </Link>
                  ))}
                  {invoices.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{invoices.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
          )}
        </div>
      )}

      {/* Detailed Project Analytics - Only show if there's substantial data */}
      {deal && (totalTasks > 0 || totalQuotes > 0 || totalOrders > 0 || totalInvoices > 0) && (
        <ProjectAnalytics 
          dealId={deal.id} 
          projectStatus={project.status}
          budgetMinor={project.budget_minor}
          currency={deal.currency}
        />
      )}

      {/* Team Members */}
      {deal && <ProjectTeam dealId={deal.id} />}

      <div className="text-sm">
        <Link className="underline" to="/projects">
          ← Back to projects
        </Link>
      </div>

      {project && (
        <EditProjectDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          project={project}
          onUpdated={() => {
            // Project data will refresh via React Query
          }}
        />
      )}
    </div>
  );
}

