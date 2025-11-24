import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";

// Task types
export interface Task {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    due_date?: string;
    completed_at?: string;
    assigned_to?: string;
    assigned_by?: string;
    related_type?: 'deal' | 'quote' | 'order' | 'invoice' | 'company' | 'person';
    related_id?: string;
    depends_on_task_id?: string;
    tags: string[];
    is_private: boolean;
    estimated_hours?: number;
    actual_hours?: number;
    created_at: string;
    updated_at: string;
}

export interface TaskComment {
    id: string;
    task_id: string;
    user_id: string;
    comment: string;
    created_at: string;
    user?: {
        id: string;
        name: string;
        email: string;
    };
}

export interface TaskActivity {
    id: string;
    task_id: string;
    user_id: string;
    activity_type: 'created' | 'updated' | 'assigned' | 'completed' | 'cancelled' | 'commented';
    old_value?: any;
    new_value?: any;
    description?: string;
    created_at: string;
    user?: {
        id: string;
        name: string;
        email: string;
    };
}

export interface CreateTaskData {
    title: string;
    description?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    due_date?: string;
    assigned_to?: string;
    related_type?: 'deal' | 'quote' | 'order' | 'invoice' | 'company' | 'person';
    related_id?: string;
    depends_on_task_id?: string;
    tags?: string[];
    is_private?: boolean;
    estimated_hours?: number;
    actual_hours?: number;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
    id: string;
}

export interface TaskFilters {
    status?: string[];
    priority?: string[];
    assigned_to?: string;
    related_type?: string;
    related_id?: string;
    due_date_from?: string;
    due_date_to?: string;
    tags?: string[];
    search?: string;
}

// Task service functions
export const taskService = {
    // Get all tasks
    async getTasks(filters: TaskFilters = {}): Promise<Task[]> {
        let query = supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply filters
        if (filters.status && filters.status.length > 0) {
            query = query.in('status', filters.status);
        }

        if (filters.priority && filters.priority.length > 0) {
            query = query.in('priority', filters.priority);
        }

        if (filters.assigned_to) {
            query = query.eq('assigned_to', filters.assigned_to);
        }

        if (filters.related_type) {
            query = query.eq('related_type', filters.related_type);
        }

        if (filters.related_id) {
            query = query.eq('related_id', filters.related_id);
        }

        if (filters.due_date_from) {
            query = query.gte('due_date', filters.due_date_from);
        }

        if (filters.due_date_to) {
            query = query.lte('due_date', filters.due_date_to);
        }

        if (filters.tags && filters.tags.length > 0) {
            query = query.overlaps('tags', filters.tags);
        }

        if (filters.search) {
            query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch tasks: ${error.message}`);
        }

        return data || [];
    },

    // Get task by ID
    async getTask(id: string): Promise<Task> {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            throw new Error(`Failed to fetch task: ${error.message}`);
        }

        return data;
    },

    // Create task
    async createTask(taskData: CreateTaskData): Promise<Task> {
        const { user } = useAuthStore.getState();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const { data, error } = await supabase
            .from('tasks')
            .insert({
                ...taskData,
                user_id: user.id,
                assigned_to: taskData.assigned_to === 'unassigned' ? null : taskData.assigned_to,
                depends_on_task_id: taskData.depends_on_task_id || null,
            })
            .select('*')
            .single();

        if (error) {
            throw new Error(`Failed to create task: ${error.message}`);
        }

        return data;
    },

    // Update task
    async updateTask(taskData: UpdateTaskData): Promise<Task> {
        const { id, ...updateData } = taskData;

        const { data, error } = await supabase
            .from('tasks')
            .update({
                ...updateData,
                assigned_to: updateData.assigned_to === 'unassigned' ? null : updateData.assigned_to,
                depends_on_task_id: updateData.depends_on_task_id || null,
            })
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            throw new Error(`Failed to update task: ${error.message}`);
        }

        return data;
    },

    // Delete task
    async deleteTask(id: string): Promise<void> {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete task: ${error.message}`);
        }
    },

    // Get task comments
    async getTaskComments(taskId: string): Promise<TaskComment[]> {
        const { data, error } = await supabase
            .from('task_comments')
            .select(`
        *,
        user:user_id(id, name, email)
      `)
            .eq('task_id', taskId)
            .order('created_at', { ascending: true });

        if (error) {
            throw new Error(`Failed to fetch task comments: ${error.message}`);
        }

        return data || [];
    },

    // Add task comment
    async addTaskComment(taskId: string, comment: string): Promise<TaskComment> {
        const { user } = useAuthStore.getState();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const { data, error } = await supabase
            .from('task_comments')
            .insert({
                task_id: taskId,
                user_id: user.id,
                comment,
            })
            .select(`
        *,
        user:user_id(id, name, email)
      `)
            .single();

        if (error) {
            throw new Error(`Failed to add comment: ${error.message}`);
        }

        return data;
    },

    // Get task activities
    async getTaskActivities(taskId: string): Promise<TaskActivity[]> {
        const { data, error } = await supabase
            .from('task_activities')
            .select(`
        *,
        user:user_id(id, name, email)
      `)
            .eq('task_id', taskId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch task activities: ${error.message}`);
        }

        return data || [];
    },

    // Get upcoming tasks (due in next 7 days)
    async getUpcomingTasks(): Promise<Task[]> {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .gte('due_date', now.toISOString())
            .lte('due_date', nextWeek.toISOString())
            .in('status', ['pending', 'in_progress'])
            .order('due_date', { ascending: true });

        if (error) {
            throw new Error(`Failed to fetch upcoming tasks: ${error.message}`);
        }

        return data || [];
    },

    // Get task dependencies (tasks that depend on this task)
    async getTaskDependencies(taskId: string): Promise<Task[]> {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('depends_on_task_id', taskId)
            .order('created_at', { ascending: true });

        if (error) {
            throw new Error(`Failed to fetch task dependencies: ${error.message}`);
        }

        return data || [];
    },

    // Get task that this task depends on
    async getTaskDependency(taskId: string): Promise<Task | null> {
        const task = await this.getTask(taskId);
        if (!task || !task.depends_on_task_id) {
            return null;
        }

        return await this.getTask(task.depends_on_task_id);
    },

    // Check if task can be completed (all dependencies completed)
    async canCompleteTask(taskId: string): Promise<{ canComplete: boolean; blockingTasks: Task[] }> {
        const task = await this.getTask(taskId);
        if (!task || !task.depends_on_task_id) {
            return { canComplete: true, blockingTasks: [] };
        }

        const dependency = await this.getTask(task.depends_on_task_id);
        if (!dependency) {
            return { canComplete: true, blockingTasks: [] };
        }

        const isDependencyCompleted = dependency.status === 'completed';
        return {
            canComplete: isDependencyCompleted,
            blockingTasks: isDependencyCompleted ? [] : [dependency],
        };
    },

    // Get overdue tasks
    async getOverdueTasks(): Promise<Task[]> {
        const now = new Date();

        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .lt('due_date', now.toISOString())
            .in('status', ['pending', 'in_progress'])
            .order('due_date', { ascending: true });

        if (error) {
            throw new Error(`Failed to fetch overdue tasks: ${error.message}`);
        }

        return data || [];
    },
};

// React hooks
export function useTasks(filters: TaskFilters = {}) {
    return useQuery({
        queryKey: qk.tasks.list(filters),
        queryFn: () => taskService.getTasks(filters),
    });
}

/**
 * Hook to fetch tasks related to a specific entity (deal, quote, order, invoice)
 * Wrapper around useTasks with pre-configured filters
 */
export function useRelatedTasks(
    relatedType: 'deal' | 'quote' | 'order' | 'invoice' | 'company' | 'person',
    relatedId: string
) {
    return useTasks({
        related_type: relatedType,
        related_id: relatedId
    });
}

export function useTask(id: string) {
    return useQuery({
        queryKey: qk.tasks.detail(id),
        queryFn: () => taskService.getTask(id),
        enabled: !!id,
    });
}

export function useUpcomingTasks() {
    return useQuery({
        queryKey: qk.tasks.upcoming(),
        queryFn: () => taskService.getUpcomingTasks(),
    });
}

export function useOverdueTasks() {
    return useQuery({
        queryKey: qk.tasks.overdue(),
        queryFn: () => taskService.getOverdueTasks(),
    });
}

export function useTaskComments(taskId: string) {
    return useQuery({
        queryKey: qk.tasks.comments(taskId),
        queryFn: () => taskService.getTaskComments(taskId),
        enabled: !!taskId,
    });
}

export function useTaskActivities(taskId: string) {
    return useQuery({
        queryKey: qk.tasks.activities(taskId),
        queryFn: () => taskService.getTaskActivities(taskId),
        enabled: !!taskId,
    });
}

// Mutations
export function useCreateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: taskService.createTask,
        onSuccess: () => {
            // Invalidate all task queries to ensure UI updates immediately
            queryClient.invalidateQueries({ queryKey: qk.tasks.all });
            queryClient.invalidateQueries({ queryKey: qk.tasks.list() });
            queryClient.invalidateQueries({ queryKey: qk.tasks.upcoming() });
            queryClient.invalidateQueries({ queryKey: qk.tasks.overdue() });
        },
    });
}

export function useUpdateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: taskService.updateTask,
        onSuccess: (data) => {
            // Invalidate all task queries to ensure UI updates immediately
            queryClient.invalidateQueries({ queryKey: qk.tasks.all });
            queryClient.invalidateQueries({ queryKey: qk.tasks.list() });
            queryClient.invalidateQueries({ queryKey: qk.tasks.detail(data.id) });
            queryClient.invalidateQueries({ queryKey: qk.tasks.upcoming() });
            queryClient.invalidateQueries({ queryKey: qk.tasks.overdue() });
        },
    });
}

export function useDeleteTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: taskService.deleteTask,
        onSuccess: () => {
            // Invalidate all task queries to ensure UI updates immediately
            queryClient.invalidateQueries({ queryKey: qk.tasks.all });
            queryClient.invalidateQueries({ queryKey: qk.tasks.list() });
            queryClient.invalidateQueries({ queryKey: qk.tasks.upcoming() });
            queryClient.invalidateQueries({ queryKey: qk.tasks.overdue() });
        },
    });
}

export function useAddTaskComment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ taskId, comment }: { taskId: string; comment: string }) =>
            taskService.addTaskComment(taskId, comment),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: qk.tasks.comments(data.task_id) });
            queryClient.invalidateQueries({ queryKey: qk.tasks.activities(data.task_id) });
        },
    });
}

// Helper functions for status and priority dot colors (used by badge components)
export function getTaskStatusDotColor(status: Task['status']): string {
    switch (status) {
        case 'pending':
            return 'bg-[#9d855e]';
        case 'in_progress':
            return 'bg-[#7a9db3]';
        case 'completed':
            return 'bg-[#6b7c5e]';
        case 'cancelled':
            return 'bg-gray-400';
        default:
            return 'bg-gray-400';
    }
}

export function getTaskPriorityDotColor(priority: Task['priority']): string {
    switch (priority) {
        case 'low':
            return 'bg-gray-400';
        case 'medium':
            return 'bg-[#7a9db3]';
        case 'high':
            return 'bg-[#9d855e]';
        case 'urgent':
            return 'bg-[#b8695f]';
        default:
            return 'bg-gray-400';
    }
}

// Legacy helper functions (kept for backward compatibility if used elsewhere)
export function getTaskStatusColor(status: Task['status']): string {
    switch (status) {
        case 'pending':
            return 'text-[#9d855e] bg-[#faf5ef]';
        case 'in_progress':
            return 'text-[#7a9db3] bg-[#eff4f7]';
        case 'completed':
            return 'text-[#6b7c5e] bg-[#f0f4ec]';
        case 'cancelled':
            return 'text-gray-600 bg-gray-100';
        default:
            return 'text-gray-600 bg-gray-100';
    }
}

export function getTaskPriorityColor(priority: Task['priority']): string {
    switch (priority) {
        case 'low':
            return 'text-gray-600 bg-gray-100';
        case 'medium':
            return 'text-[#7a9db3] bg-[#eff4f7]';
        case 'high':
            return 'text-[#9d855e] bg-[#faf5ef]';
        case 'urgent':
            return 'text-[#b8695f] bg-[#fef2f0]';
        default:
            return 'text-gray-600 bg-gray-100';
    }
}

export function formatTaskDueDate(dueDate: string): string {
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
    } else if (diffDays === 0) {
        return 'Due today';
    } else if (diffDays === 1) {
        return 'Due tomorrow';
    } else if (diffDays <= 7) {
        return `Due in ${diffDays} days`;
    } else {
        return date.toLocaleDateString();
    }
}
