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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, formatTaskDueDate } from "@/services/tasks";
import { useUpdateTask, useDeleteTask } from "@/services/tasks";
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

  const handleStatusChange = async (newStatus: Task['status']) => {
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


  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onView?.(task)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(
                  task.status === 'completed' ? 'pending' : 'completed'
                );
              }}
              className="p-0 h-auto"
            >
              {getStatusIcon(task.status)}
            </Button>
            <h3 className="font-medium text-sm leading-tight">{task.title}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
                className="h-8 w-8 p-0"
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
      </CardHeader>

      <CardContent className="pt-0">
        {task.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-3">
            <TaskStatusBadge status={task.status} showLabel={true} />
            <TaskPriorityBadge priority={task.priority} showLabel={true} />
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            {task.due_date && (
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{formatTaskDueDate(task.due_date)}</span>
              </div>
            )}
            {task.estimated_hours && (
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{task.estimated_hours}h</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {task.assigned_to && (
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span className="text-xs">Assigned</span>
              </div>
            )}
            {task.tags.length > 0 && (
              <div className="flex items-center space-x-1">
                <Tag className="h-3 w-3" />
                <span>{task.tags.length}</span>
              </div>
            )}
          </div>
        </div>

        {task.related_type && task.related_id && (
          <div className="mt-2 pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              Related to {task.related_type}: {task.related_id}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
