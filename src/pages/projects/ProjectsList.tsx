import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { useProjects } from "@/services/projects";
import { useDeal } from "@/services/deals";
import { useCompanies } from "@/services/companies";
import { useRelatedTasks } from "@/services/tasks";
import { useUsers } from "@/services/users";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderKanban, Search, ExternalLink, TrendingUp, Grid3X3, List, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AnalyticsCard, AnalyticsCardGrid } from "@/components/common/charts/AnalyticsCard";
import { ProjectsTable } from "@/components/projects/ProjectsTable";

const statusColors = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export default function ProjectsList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Get companies and users for filters
  const { data: companiesData } = useCompanies({ limit: 1000 });
  const companies = companiesData?.data || [];
  const { data: users } = useUsers();

  const { data: projects, isLoading, error } = useProjects({
    search: searchTerm || undefined,
    status: statusFilter !== "all" ? [statusFilter] : undefined,
    company_id: companyFilter !== "all" ? companyFilter : undefined,
    owner_user_id: ownerFilter !== "all" ? ownerFilter : undefined,
  });

  const allProjects = projects || [];
  
  // Client-side pagination
  const totalPages = Math.ceil(allProjects.length / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedProjects = allProjects.slice(startIndex, endIndex);

  // Calculate KPIs for all projects (not just current page)
  const kpis = useMemo(() => {
    const total = allProjects.length;
    const active = allProjects.filter(p => p.status === 'active').length;
    const onHold = allProjects.filter(p => p.status === 'on_hold').length;
    const completed = allProjects.filter(p => p.status === 'completed').length;
    const cancelled = allProjects.filter(p => p.status === 'cancelled').length;
    
    return { total, active, onHold, completed, cancelled };
  }, [allProjects]);

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-6 w-64 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="p-6 text-destructive">
        Failed to load projects
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Projects"
        description="Manage your projects linked to deals"
        icon={FolderKanban}
      />

      {/* Analytics/KPI Cards */}
      {allProjects.length > 0 && (
        <AnalyticsCardGrid columns={4}>
          <AnalyticsCard title="Total Projects" icon={FolderKanban}>
            <div className="text-3xl font-bold">{kpis.total}</div>
            <p className="text-sm text-muted-foreground mt-1">All projects</p>
          </AnalyticsCard>
          <AnalyticsCard title="Active" icon={TrendingUp}>
            <div className="text-3xl font-bold text-green-600">{kpis.active}</div>
            <p className="text-sm text-muted-foreground mt-1">In progress</p>
          </AnalyticsCard>
          <AnalyticsCard title="On Hold" icon={FolderKanban}>
            <div className="text-3xl font-bold text-yellow-600">{kpis.onHold}</div>
            <p className="text-sm text-muted-foreground mt-1">Paused</p>
          </AnalyticsCard>
          <AnalyticsCard title="Completed" icon={FolderKanban}>
            <div className="text-3xl font-bold text-blue-600">{kpis.completed}</div>
            <p className="text-sm text-muted-foreground mt-1">Finished</p>
          </AnalyticsCard>
        </AnalyticsCardGrid>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            {users?.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Projects List */}
      {allProjects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No projects found</p>
          <p className="text-sm mt-2">
            Projects are created from deals. Create a project from a deal to get started.
          </p>
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            <div className="grid gap-4">
              {paginatedProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <ProjectsTable projects={paginatedProjects} />
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, allProjects.length)} of {allProjects.length} projects
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm">
                  Page {page} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: any }) {
  const navigate = useNavigate();
  const { data: deal } = useDeal(project.deal_id);
  const { data: companyData } = useCompanies({ q: deal?.company_id });
  const company = companyData?.data?.[0];
  const { data: tasks } = useRelatedTasks('deal', project.deal_id || '');
  const { data: users } = useUsers();
  const owner = users?.find(u => u.id === project.owner_user_id);

  // Calculate health score and task metrics
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const healthScore = useMemo(() => {
    let score = 0;
    let factors = 0;
    
    // Task completion (40% weight)
    if (totalTasks > 0) {
      score += (taskCompletionRate / 100) * 40;
      factors += 40;
    }
    
    // Project status (30% weight)
    if (project.status === 'active') {
      score += 30;
    } else if (project.status === 'on_hold') {
      score += 15;
    } else if (project.status === 'completed') {
      score += 30;
    }
    factors += 30;
    
    return factors > 0 ? Math.round((score / factors) * 100) : 0;
  }, [taskCompletionRate, project.status, totalTasks]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  };

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-semibold">
              <Link
                to={`/projects/${project.id}`}
                className="hover:underline"
              >
                {project.name}
              </Link>
            </h3>
            <Badge
              className={cn(
                "text-xs",
                statusColors[project.status as keyof typeof statusColors]
              )}
            >
              {project.status}
            </Badge>
            <Badge className={cn("text-xs font-semibold", getHealthColor(healthScore))}>
              Health: {healthScore}%
            </Badge>
          </div>

          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}

          {/* Task Progress */}
          {totalTasks > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Task Progress</span>
                <span className="font-medium">{completedTasks}/{totalTasks} completed</span>
              </div>
              <Progress value={taskCompletionRate} className="h-2" />
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {owner && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Owner:</span>
                <span>{owner.name || owner.email}</span>
              </div>
            )}
            {deal && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Deal:</span>
                <Link
                  to={`/deals/${deal.id}`}
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {deal.title}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
            {company && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Company:</span>
                <Link
                  to={`/companies/${company.id}`}
                  className="text-primary hover:underline"
                >
                  {company.name}
                </Link>
              </div>
            )}
            {project.start_date && (
              <div>
                <span className="font-medium">Start:</span>{" "}
                {format(new Date(project.start_date), "MMM d, yyyy")}
              </div>
            )}
            {project.end_date && (
              <div>
                <span className="font-medium">End:</span>{" "}
                {format(new Date(project.end_date), "MMM d, yyyy")}
              </div>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/projects/${project.id}`)}
        >
          View Details
        </Button>
      </div>
    </div>
  );
}

