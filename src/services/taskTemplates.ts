import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { supabase } from "@/integrations/supabase/client";

// Task template types
export interface TaskTemplate {
    id: string;
    name: string;
    description?: string;
    title: string;
    task_description?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    estimated_hours?: number;
    tags: string[];
    trigger_type: 'deal_stage' | 'entity_type' | 'manual';
    trigger_value?: string;
    company_id?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateTaskTemplateData {
    name: string;
    description?: string;
    title: string;
    task_description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    estimated_hours?: number;
    tags?: string[];
    trigger_type: 'deal_stage' | 'entity_type' | 'manual';
    trigger_value?: string;
    company_id?: string;
    is_active?: boolean;
}

export interface UpdateTaskTemplateData extends Partial<CreateTaskTemplateData> {
    id: string;
}

// Task template service
export const taskTemplateService = {
    // Get all templates
    async getTemplates(filters?: { trigger_type?: string; trigger_value?: string; company_id?: string; is_active?: boolean }): Promise<TaskTemplate[]> {
        let query = supabase
            .from('task_templates')
            .select('*')
            .order('created_at', { ascending: false });

        if (filters?.trigger_type) {
            query = query.eq('trigger_type', filters.trigger_type);
        }

        if (filters?.trigger_value) {
            query = query.eq('trigger_value', filters.trigger_value);
        }

        if (filters?.company_id) {
            query = query.eq('company_id', filters.company_id);
        }

        if (filters?.is_active !== undefined) {
            query = query.eq('is_active', filters.is_active);
        } else {
            query = query.eq('is_active', true); // Default to active only
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch task templates: ${error.message}`);
        }

        return data || [];
    },

    // Get template by ID
    async getTemplate(id: string): Promise<TaskTemplate | null> {
        const { data, error } = await supabase
            .from('task_templates')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            throw new Error(`Failed to fetch task template: ${error.message}`);
        }

        return data;
    },

    // Get templates matching criteria
    async getMatchingTemplates(
        triggerType: 'deal_stage' | 'entity_type',
        triggerValue: string,
        companyId?: string
    ): Promise<TaskTemplate[]> {
        let query = supabase
            .from('task_templates')
            .select('*')
            .eq('trigger_type', triggerType)
            .eq('trigger_value', triggerValue)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        // Include templates with no company_id (global) or matching company_id
        if (companyId) {
            query = query.or(`company_id.is.null,company_id.eq.${companyId}`);
        } else {
            query = query.is('company_id', null);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch matching templates: ${error.message}`);
        }

        return data || [];
    },

    // Create template
    async createTemplate(data: CreateTaskTemplateData): Promise<TaskTemplate> {
        const { data: template, error } = await supabase
            .from('task_templates')
            .insert(data)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create task template: ${error.message}`);
        }

        return template;
    },

    // Update template
    async updateTemplate(data: UpdateTaskTemplateData): Promise<TaskTemplate> {
        const { id, ...updateData } = data;
        const { data: template, error } = await supabase
            .from('task_templates')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update task template: ${error.message}`);
        }

        return template;
    },

    // Delete template
    async deleteTemplate(id: string): Promise<void> {
        const { error } = await supabase
            .from('task_templates')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete task template: ${error.message}`);
        }
    },
};

// React hooks
export function useTaskTemplates(filters?: { trigger_type?: string; trigger_value?: string; company_id?: string; is_active?: boolean }) {
    return useQuery({
        queryKey: qk.taskTemplates.list(filters),
        queryFn: () => taskTemplateService.getTemplates(filters),
    });
}

export function useTaskTemplate(id: string) {
    return useQuery({
        queryKey: qk.taskTemplates.detail(id),
        queryFn: () => taskTemplateService.getTemplate(id),
        enabled: !!id,
    });
}

export function useMatchingTaskTemplates(
    triggerType: 'deal_stage' | 'entity_type',
    triggerValue: string,
    companyId?: string
) {
    return useQuery({
        queryKey: qk.taskTemplates.matching(triggerType, triggerValue, companyId),
        queryFn: () => taskTemplateService.getMatchingTemplates(triggerType, triggerValue, companyId),
        enabled: !!triggerType && !!triggerValue,
    });
}

export function useCreateTaskTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: taskTemplateService.createTemplate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qk.taskTemplates.all });
        },
    });
}

export function useUpdateTaskTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: taskTemplateService.updateTemplate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qk.taskTemplates.all });
        },
    });
}

export function useDeleteTaskTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: taskTemplateService.deleteTemplate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qk.taskTemplates.all });
        },
    });
}

