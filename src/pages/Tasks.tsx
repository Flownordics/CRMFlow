import React, { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Plus,
    Search,
    Filter,
    Calendar,
    Clock,
    CheckCircle,
    AlertCircle,
    MoreHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { useTasks, useUpcomingTasks, useOverdueTasks, Task, TaskFilters } from "@/services/tasks";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskForm } from "@/components/tasks/TaskForm";
import { logger } from '@/lib/logger';

export default function Tasks() {
    const [selectedTask, setSelectedTask] = useState<Task | undefined>();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [filters, setFilters] = useState<TaskFilters>({});
    const [searchTerm, setSearchTerm] = useState("");

    const { data: tasks, isLoading: tasksLoading } = useTasks({
        ...filters,
        search: searchTerm || undefined,
    });

    const { data: upcomingTasks, isLoading: upcomingLoading } = useUpcomingTasks();
    const { data: overdueTasks, isLoading: overdueLoading } = useOverdueTasks();

    const handleCreateTask = () => {
        setSelectedTask(undefined);
        setIsFormOpen(true);
    };

    const handleEditTask = (task: Task) => {
        setSelectedTask(task);
        setIsFormOpen(true);
    };

    const handleViewTask = (task: Task) => {
        // TODO: Implement task detail view
        logger.debug('View task:', task);
    };

    const handleStatusFilter = (status: string) => {
        if (status === "all") {
            setFilters({ ...filters, status: undefined });
        } else {
            setFilters({ ...filters, status: [status] });
        }
    };

    const handlePriorityFilter = (priority: string) => {
        if (priority === "all") {
            setFilters({ ...filters, priority: undefined });
        } else {
            setFilters({ ...filters, priority: [priority] });
        }
    };

    const getStatusCounts = () => {
        if (!tasks) return { pending: 0, in_progress: 0, completed: 0, cancelled: 0 };

        return tasks.reduce((counts, task) => {
            counts[task.status] = (counts[task.status] || 0) + 1;
            return counts;
        }, {} as Record<string, number>);
    };

    const statusCounts = getStatusCounts();

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <PageHeader
                title="Tasks"
                actions={
                    <Button onClick={handleCreateTask}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Task
                    </Button>
                }
            />

            {/* Quick Stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statusCounts.pending || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statusCounts.in_progress || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statusCounts.completed || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{overdueTasks?.length || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Search */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search tasks..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <Select onValueChange={handleStatusFilter} defaultValue="all">
                            <SelectTrigger className="w-40">
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

                        <Select onValueChange={handlePriorityFilter} defaultValue="all">
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priority</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Upcoming Tasks */}
            {upcomingTasks && upcomingTasks.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Upcoming Tasks
                        </CardTitle>
                        <CardDescription>Tasks due in the next 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {upcomingLoading ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <Skeleton key={index} className="h-32" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {upcomingTasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onEdit={handleEditTask}
                                        onView={handleViewTask}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Overdue Tasks */}
            {overdueTasks && overdueTasks.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            Overdue Tasks
                        </CardTitle>
                        <CardDescription>Tasks that are past their due date</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {overdueLoading ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <Skeleton key={index} className="h-32" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {overdueTasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onEdit={handleEditTask}
                                        onView={handleViewTask}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* All Tasks */}
            <Card>
                <CardHeader>
                    <CardTitle>All Tasks</CardTitle>
                    <CardDescription>
                        {tasks?.length || 0} total tasks
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {tasksLoading ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <Skeleton key={index} className="h-32" />
                            ))}
                        </div>
                    ) : tasks && tasks.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {tasks.map((task) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onEdit={handleEditTask}
                                    onView={handleViewTask}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium mb-2">No tasks found</h3>
                            <p className="mb-4">Get started by creating your first task.</p>
                            <Button onClick={handleCreateTask}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Task
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Task Form Modal */}
            <TaskForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                task={selectedTask}
            />
        </div>
    );
}
