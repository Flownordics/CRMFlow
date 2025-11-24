import React from "react";
import { Task } from "@/services/tasks";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock } from "lucide-react";

interface TaskStatisticsProps {
  tasks: Task[];
  className?: string;
}

export function TaskStatistics({ tasks, className }: TaskStatisticsProps) {
  if (!tasks || tasks.length === 0) {
    return null;
  }

  const now = new Date();
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const cancelled = tasks.filter((t) => t.status === "cancelled").length;

  // Calculate overdue and upcoming tasks
  const overdue = tasks.filter((task) => {
    if (!task.due_date || task.status === "completed" || task.status === "cancelled") {
      return false;
    }
    return new Date(task.due_date) < now;
  }).length;

  const upcoming = tasks.filter((task) => {
    if (!task.due_date || task.status === "completed" || task.status === "cancelled") {
      return false;
    }
    const dueDate = new Date(task.due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue > 0 && daysUntilDue <= 7; // Next 7 days
  }).length;

  const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">
            {completed} / {total} completed
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Status Counts */}
      <div className="flex flex-wrap gap-2 text-xs">
        {pending > 0 && (
          <Badge variant="outline" className="text-xs">
            {pending} Pending
          </Badge>
        )}
        {inProgress > 0 && (
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary">
            {inProgress} In Progress
          </Badge>
        )}
        {completed > 0 && (
          <Badge variant="outline" className="text-xs bg-success/10 text-success dark:bg-success/20 dark:text-success">
            {completed} Completed
          </Badge>
        )}
        {cancelled > 0 && (
          <Badge variant="outline" className="text-xs bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground">
            {cancelled} Cancelled
          </Badge>
        )}
      </div>

      {/* Deadline Warnings */}
      {(overdue > 0 || upcoming > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {overdue > 0 && (
            <Badge variant="destructive" className="text-xs flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {overdue} Overdue
            </Badge>
          )}
          {upcoming > 0 && (
            <Badge variant="outline" className="text-xs bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {upcoming} Due Soon
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

