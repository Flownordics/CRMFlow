import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, CheckSquare2, Filter, ArrowUpDown } from "lucide-react";
import { Task } from "@/services/tasks";
import { useRelatedTasks } from "@/services/tasks";
import { TaskCard } from "./TaskCard";
import { TaskForm } from "./TaskForm";
import { TaskDetailView } from "./TaskDetailView";
import { TaskStatistics } from "./TaskStatistics";
import { TaskBulkCreateTable } from "./TaskBulkCreateTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsers } from "@/services/users";

interface RelatedTasksListProps {
  relatedType: 'deal' | 'quote' | 'order' | 'invoice' | 'company' | 'person';
  relatedId: string;
  relatedTitle?: string;
  showCreateButton?: boolean;
  compact?: boolean;
}

export function RelatedTasksList({
  relatedType,
  relatedId,
  relatedTitle,
  showCreateButton = true,
  compact = false,
}: RelatedTasksListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [isBulkCreateMode, setIsBulkCreateMode] = useState(false);
  
  // Filter and sort state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("priority");

  const { data: tasks, isLoading, error } = useRelatedTasks(relatedType, relatedId);
  const { data: users } = useUsers();

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    if (!tasks) return [];

    let filtered = [...tasks];

    // Apply filters
    if (statusFilter !== "all") {
      filtered = filtered.filter((task) => task.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((task) => task.priority === priorityFilter);
    }

    if (assigneeFilter !== "all") {
      filtered = filtered.filter((task) => task.assigned_to === assigneeFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "priority":
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        case "due_date":
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case "created":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [tasks, statusFilter, priorityFilter, assigneeFilter, sortBy]);

  const handleCreateTask = () => {
    setEditingTask(undefined);
    setIsFormOpen(true);
  };

  const handleBulkCreateSuccess = () => {
    setIsBulkCreateMode(false);
    // Tasks will refresh automatically via React Query
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setIsDetailViewOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingTask(undefined);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            Failed to load tasks. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tasks</CardTitle>
            {showCreateButton && !isBulkCreateMode && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsBulkCreateMode(true)}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Bulk Create
                </Button>
                <Button onClick={handleCreateTask} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </div>
            )}
          </div>
          {/* Task Statistics */}
          {!isLoading && tasks && tasks.length > 0 && (
            <div className="mt-4">
              <TaskStatistics tasks={tasks} />
            </div>
          )}
          
          {/* Filters and Sort */}
          {!isLoading && tasks && tasks.length > 0 && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Filters:</span>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger className="w-[160px] h-8">
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 ml-auto">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="due_date">Due Date</SelectItem>
                      <SelectItem value="created">Created Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isBulkCreateMode ? (
            <TaskBulkCreateTable
              relatedType={relatedType}
              relatedId={relatedId}
              onSuccess={handleBulkCreateSuccess}
              onCancel={() => setIsBulkCreateMode(false)}
            />
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading tasks...</p>
            </div>
          ) : !tasks || tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="rounded-full bg-muted p-4">
                <CheckSquare2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">No tasks yet</p>
                <p className="text-xs text-muted-foreground">
                  {relatedTitle 
                    ? `Get started by creating a task for ${relatedTitle}`
                    : "Create your first task to get started"}
                </p>
              </div>
              {showCreateButton && (
                <div className="flex flex-col items-center gap-2 mt-2">
                  <Button
                    onClick={() => setIsBulkCreateMode(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Bulk Create Tasks
                  </Button>
                  <Button
                    onClick={handleCreateTask}
                    variant="default"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first task
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {filteredAndSortedTasks.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No tasks match the current filters
                </div>
              ) : (
                <div>
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 items-center py-2 px-4 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
                    <div className="col-span-12 md:col-span-4">Task</div>
                    <div className="col-span-6 md:col-span-2">Status & Priority</div>
                    <div className="col-span-6 md:col-span-2">Due Date & Hours</div>
                    <div className="col-span-6 md:col-span-2">Assignee</div>
                    <div className="col-span-12 md:col-span-2 text-right">Actions</div>
                  </div>
                  {/* Task Rows */}
                  {filteredAndSortedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={handleEditTask}
                      onView={handleViewTask}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <TaskForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        task={editingTask}
        relatedType={relatedType}
        relatedId={relatedId}
        relatedTitle={relatedTitle}
      />

      {selectedTask && (
        <TaskDetailView
          task={selectedTask}
          open={isDetailViewOpen}
          onOpenChange={setIsDetailViewOpen}
          onEdit={(task) => {
            setIsDetailViewOpen(false);
            setEditingTask(task);
            setIsFormOpen(true);
          }}
        />
      )}
    </>
  );
}

