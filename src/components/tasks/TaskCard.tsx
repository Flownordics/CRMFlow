import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Clock,
  MoreHorizontal,
  User,
  Tag,
  CheckCircle,
  Circle,
  Play,
  X,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, formatTaskDueDate, taskService } from "@/services/tasks";
import { useUpdateTask, useDeleteTask, useTask } from "@/services/tasks";
import { useUsers } from "@/services/users";
import { logger } from '@/lib/logger';
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onView?: (task: Task) => void;
}

export function TaskCard({ task, onEdit, onView }: TaskCardProps) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: dependencyTask } = useTask(task.depends_on_task_id || '');
  const { data: users } = useUsers();
  
  const assignedUser = users?.find(u => u.id === task.assigned_to);

  const handleStatusChange = async (newStatus: Task['status']) => {
    // Check if trying to complete a task with incomplete dependencies
    if (newStatus === 'completed' && task.depends_on_task_id) {
      const { canComplete, blockingTasks } = await taskService.canCompleteTask(task.id);
      if (!canComplete && blockingTasks.length > 0) {
        alert(`Cannot complete this task. The following task must be completed first: ${blockingTasks[0].title}`);
        return;
      }
    }

    try {
      await updateTask.mutateAsync({
        id: task.id,
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined,
      });
    } catch (error) {
      logger.error('Failed to update task status:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask.mutateAsync(task.id);
      } catch (error) {
        logger.error('Failed to delete task:', error);
      }
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return <Circle className="h-4 w-4" />;
      case 'in_progress':
        return <Play className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <X className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  // Check if task is overdue or due soon
  const getDueDateStatus = () => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') {
      return null;
    }
    const now = new Date();
    const dueDate = new Date(task.due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) {
      return { type: 'overdue', days: Math.abs(daysUntilDue) };
    } else if (daysUntilDue <= 7 && daysUntilDue > 0) {
      return { type: 'upcoming', days: daysUntilDue };
    }
    return null;
  };

  const dueDateStatus = getDueDateStatus();


  return (
    <div 
      className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => onView?.(task)}
    >
      <div className="grid grid-cols-12 gap-4 items-center py-3 px-4">
        {/* Status Icon & Title */}
        <div className="col-span-12 md:col-span-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleStatusChange(
                task.status === 'completed' ? 'pending' : 'completed'
              );
            }}
            className="p-0 h-auto flex-shrink-0"
          >
            {getStatusIcon(task.status)}
          </Button>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm leading-tight truncate">{task.title}</h3>
            {task.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Status & Priority */}
        <div className="col-span-6 md:col-span-2 flex items-center gap-2">
          <TaskStatusBadge status={task.status} showLabel={true} />
          <TaskPriorityBadge priority={task.priority} showLabel={true} />
        </div>

        {/* Due Date & Hours */}
        <div className="col-span-6 md:col-span-2 flex items-center gap-3 text-xs text-muted-foreground">
          {task.due_date && (
            <div className={cn(
              "flex items-center gap-1",
              dueDateStatus?.type === 'overdue' && "text-destructive font-medium",
              dueDateStatus?.type === 'upcoming' && "text-warning"
            )}>
              <Calendar className="h-3 w-3" />
              <span>{formatTaskDueDate(task.due_date)}</span>
            </div>
          )}
          {task.estimated_hours && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{task.estimated_hours}h</span>
            </div>
          )}
        </div>

        {/* Assignee */}
        <div className="col-span-6 md:col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
          {task.assigned_to && assignedUser && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{assignedUser.name || assignedUser.email}</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2">
          {task.status !== 'completed' && task.status !== 'cancelled' && (
            <>
              {task.status === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange('completed');
                  }}
                  disabled={updateTask.isPending || (task.depends_on_task_id && dependencyTask?.status !== 'completed')}
                  title={task.depends_on_task_id && dependencyTask?.status !== 'completed' 
                    ? `Cannot complete: depends on "${dependencyTask?.title}"` 
                    : undefined}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Done
                </Button>
              )}
              {task.status === 'in_progress' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange('completed');
                  }}
                  disabled={updateTask.isPending || (task.depends_on_task_id && dependencyTask?.status !== 'completed')}
                  title={task.depends_on_task_id && dependencyTask?.status !== 'completed' 
                    ? `Cannot complete: depends on "${dependencyTask?.title}"` 
                    : undefined}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange('cancelled');
                }}
                disabled={updateTask.isPending}
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
                className="h-7 w-7 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onEdit?.(task);
              }}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Additional info row (due date warning, dependency) */}
      {(dueDateStatus || (task.depends_on_task_id && dependencyTask)) && (
        <div className="px-4 pb-2 flex items-center gap-4 text-xs">
          {dueDateStatus && (
            <Badge
              variant={dueDateStatus.type === 'overdue' ? 'destructive' : 'outline'}
              className={cn(
                "text-xs flex items-center gap-1",
                dueDateStatus.type === 'upcoming' && "bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning"
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              {dueDateStatus.type === 'overdue'
                ? `${dueDateStatus.days} day${dueDateStatus.days > 1 ? 's' : ''} overdue`
                : `Due in ${dueDateStatus.days} day${dueDateStatus.days > 1 ? 's' : ''}`}
            </Badge>
          )}
          {task.depends_on_task_id && dependencyTask && (
            <div className="text-muted-foreground flex items-center gap-1">
              <span>Depends on:</span>
              <span className={cn(
                "font-medium",
                dependencyTask.status === 'completed' ? "text-success" : "text-warning"
              )}>
                {dependencyTask.title}
              </span>
              {dependencyTask.status !== 'completed' && (
                <Badge variant="outline" className="text-xs bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning">
                  Blocking
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
