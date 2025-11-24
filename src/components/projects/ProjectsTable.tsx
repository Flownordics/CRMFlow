import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useDeal } from "@/services/deals";
import { useCompanies } from "@/services/companies";
import { useRelatedTasks } from "@/services/tasks";
import { useUsers } from "@/services/users";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { Project } from "@/services/projects";
import { useMemo } from "react";

interface ProjectsTableProps {
  projects: Project[];
}

const statusColors = {
  active: "bg-success/10 text-success dark:bg-success/20 dark:text-success",
  on_hold: "bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning",
  completed: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
  cancelled: "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground",
};

export function ProjectsTable({ projects }: ProjectsTableProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Health</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Tasks</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Owner</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Dates</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <ProjectTableRow key={project.id} project={project} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectTableRow({ project }: { project: Project }) {
  const navigate = useNavigate();
  const { data: deal } = useDeal(project.deal_id);
  const { data: companyData } = useCompanies({ q: deal?.company_id });
  const company = companyData?.data?.[0];
  const { data: tasks } = useRelatedTasks('deal', project.deal_id || '');
  const { data: users } = useUsers();
  const owner = users?.find(u => u.id === project.owner_user_id);

  // Calculate health score
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const healthScore = useMemo(() => {
    let score = 0;
    let factors = 0;
    
    if (totalTasks > 0) {
      score += (taskCompletionRate / 100) * 40;
      factors += 40;
    }
    
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
    if (score >= 80) return 'bg-success/10 text-success dark:bg-success/20 dark:text-success';
    if (score >= 60) return 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning';
    return 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive';
  };

  return (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      <td className="px-4 py-3">
        <Link
          to={`/projects/${project.id}`}
          className="font-medium text-primary hover:underline"
        >
          {project.name}
        </Link>
        {company && (
          <div className="text-xs text-muted-foreground mt-1">
            {company.name}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge
          className={cn(
            "text-xs",
            statusColors[project.status as keyof typeof statusColors]
          )}
        >
          {project.status}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <Badge className={cn("text-xs font-semibold", getHealthColor(healthScore))}>
          {healthScore}%
        </Badge>
      </td>
      <td className="px-4 py-3">
        {totalTasks > 0 ? (
          <div className="space-y-1">
            <div className="text-sm font-medium">{completedTasks}/{totalTasks}</div>
            <Progress value={taskCompletionRate} className="h-1.5 w-20" />
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-sm">{owner ? owner.name || owner.email : "—"}</span>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm space-y-0.5">
          {project.start_date && (
            <div className="text-muted-foreground">
              Start: {format(new Date(project.start_date), "MMM d, yyyy")}
            </div>
          )}
          {project.end_date && (
            <div className="text-muted-foreground">
              End: {format(new Date(project.end_date), "MMM d, yyyy")}
            </div>
          )}
          {!project.start_date && !project.end_date && (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/projects/${project.id}`)}
        >
          View
        </Button>
      </td>
    </tr>
  );
}

