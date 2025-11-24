import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";

// Project types
export interface Project {
    id: string;
    deal_id: string;
    name: string;
    description?: string;
    status: 'active' | 'on_hold' | 'completed' | 'cancelled';
    company_id?: string;
    owner_user_id?: string;
    start_date?: string;
    end_date?: string;
    budget_minor?: number;
    created_at: string;
    updated_at: string;
}

export interface CreateProjectData {
    deal_id: string;
    name: string;
    description?: string;
    status?: 'active' | 'on_hold' | 'completed' | 'cancelled';
    company_id?: string;
    owner_user_id?: string;
    start_date?: string;
    end_date?: string;
    budget_minor?: number;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
    id: string;
}

export interface ProjectFilters {
    status?: string[];
    company_id?: string;
    owner_user_id?: string;
    search?: string;
    start_date_from?: string;
    start_date_to?: string;
    end_date_from?: string;
    end_date_to?: string;
}

// Project service functions
export const projectService = {
    // Get all projects
    async getProjects(filters: ProjectFilters = {}): Promise<Project[]> {
        let query = supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply filters
        if (filters.status && filters.status.length > 0) {
            query = query.in('status', filters.status);
        }

        if (filters.company_id) {
            query = query.eq('company_id', filters.company_id);
        }

        if (filters.owner_user_id) {
            query = query.eq('owner_user_id', filters.owner_user_id);
        }

        if (filters.search) {
            query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        if (filters.start_date_from) {
            query = query.gte('start_date', filters.start_date_from);
        }

        if (filters.start_date_to) {
            query = query.lte('start_date', filters.start_date_to);
        }

        if (filters.end_date_from) {
            query = query.gte('end_date', filters.end_date_from);
        }

        if (filters.end_date_to) {
            query = query.lte('end_date', filters.end_date_to);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch projects: ${error.message}`);
        }

        return data || [];
    },

    // Get single project
    async getProject(id: string): Promise<Project | null> {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            throw new Error(`Failed to fetch project: ${error.message}`);
        }

        return data;
    },

    // Get project by deal_id
    async getProjectByDealId(dealId: string): Promise<Project | null> {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('deal_id', dealId)
            .maybeSingle();

        if (error) {
            // PGRST116 = no rows returned, which is fine for maybeSingle
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to fetch project by deal_id: ${error.message}`);
        }

        return data || null;
    },

    // Create project
    async createProject(data: CreateProjectData): Promise<Project> {
        const { data: project, error } = await supabase
            .from('projects')
            .insert(data)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create project: ${error.message}`);
        }

        return project;
    },

    // Update project
    async updateProject(id: string, updates: Partial<CreateProjectData>): Promise<Project> {
        const { data, error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update project: ${error.message}`);
        }

        return data;
    },

    // Delete project
    async deleteProject(id: string): Promise<void> {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete project: ${error.message}`);
        }
    },

    // Update project status by deal_id
    async updateProjectStatusByDealId(dealId: string, status: 'active' | 'on_hold' | 'completed' | 'cancelled'): Promise<Project | null> {
        // First, find the project by deal_id
        const project = await this.getProjectByDealId(dealId);
        if (!project) {
            return null; // No project exists for this deal
        }

        // Update the project status
        return await this.updateProject(project.id, { status });
    },
};

// React Query hooks
export function useProjects(filters: ProjectFilters = {}) {
    return useQuery({
        queryKey: qk.projects.list(filters),
        queryFn: () => projectService.getProjects(filters),
    });
}

export function useProject(id: string | null | undefined) {
    return useQuery({
        queryKey: qk.projects.detail(id),
        queryFn: () => {
            if (!id) return null;
            return projectService.getProject(id);
        },
        enabled: !!id,
    });
}

export function useProjectFromDeal(dealId: string | null | undefined) {
    return useQuery({
        queryKey: ['project', 'deal', dealId],
        queryFn: async () => {
            if (!dealId) return null;
            return projectService.getProjectByDealId(dealId);
        },
        enabled: !!dealId,
    });
}

export function useCreateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateProjectData) => projectService.createProject(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['project'] });
        },
    });
}

export function useUpdateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, ...updates }: UpdateProjectData) => 
            projectService.updateProject(id, updates),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['project', data.id] });
            queryClient.invalidateQueries({ queryKey: ['project', 'deal', data.deal_id] });
        },
    });
}

export function useDeleteProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => projectService.deleteProject(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['project'] });
        },
    });
}

