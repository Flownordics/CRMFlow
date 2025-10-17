import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { qk } from "@/lib/queryKeys";
import { toastBus } from "@/lib/toastBus";
import { logger } from '@/lib/logger';

// Email Template Schema
export const EmailTemplate = z.object({
    id: z.string().uuid(),
    name: z.string(),
    type: z.enum(['quote', 'order', 'invoice', 'general']),
    subject: z.string(),
    body_html: z.string(),
    body_text: z.string(),
    is_default: z.boolean(),
    variables: z.array(z.string()),
    created_by: z.string().uuid().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
});

export type EmailTemplate = z.infer<typeof EmailTemplate>;

export const EmailTemplateCreate = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(['quote', 'order', 'invoice', 'general']),
    subject: z.string().min(1, "Subject is required"),
    body_html: z.string().min(1, "HTML body is required"),
    body_text: z.string().min(1, "Text body is required"),
    is_default: z.boolean().optional().default(false),
    variables: z.array(z.string()).optional().default([]),
});

export type EmailTemplateCreate = z.infer<typeof EmailTemplateCreate>;

// Variable replacement function
export function replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    
    // Replace simple variables: {{variable_name}}
    Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, value != null ? String(value) : '');
    });
    
    // Handle conditional blocks: {{#if variable}}...{{/if}}
    const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    result = result.replace(ifRegex, (match, varName, content) => {
        const value = variables[varName];
        return (value != null && value !== '' && value !== false) ? content : '';
    });
    
    // Clean up any remaining unmatched variables
    result = result.replace(/\{\{[^}]+\}\}/g, '');
    
    return result;
}

// Fetch all templates
export async function fetchEmailTemplates(type?: string): Promise<EmailTemplate[]> {
    try {
        let query = supabase
            .from('email_templates')
            .select('*')
            .order('name');
        
        if (type) {
            query = query.eq('type', type);
        }
        
        const { data, error } = await query;
        
        if (error) {
            logger.error("Failed to fetch email templates:", error);
            throw new Error("Failed to fetch email templates");
        }
        
        return z.array(EmailTemplate).parse(data || []);
    } catch (error) {
        logger.error("Failed to fetch email templates:", error);
        throw error;
    }
}

// Fetch default template for type
export async function fetchDefaultTemplate(type: string): Promise<EmailTemplate | null> {
    try {
        const { data, error } = await supabase
            .from('email_templates')
            .select('*')
            .eq('type', type)
            .eq('is_default', true)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                // No default template found
                return null;
            }
            logger.error("Failed to fetch default template:", error);
            throw new Error("Failed to fetch default template");
        }
        
        return EmailTemplate.parse(data);
    } catch (error) {
        logger.error("Failed to fetch default template:", error);
        return null;
    }
}

// Fetch single template
export async function fetchEmailTemplate(id: string): Promise<EmailTemplate> {
    try {
        const { data, error } = await supabase
            .from('email_templates')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            logger.error("Failed to fetch email template:", error);
            throw new Error("Failed to fetch email template");
        }
        
        return EmailTemplate.parse(data);
    } catch (error) {
        logger.error("Failed to fetch email template:", error);
        throw error;
    }
}

// Create template
export async function createEmailTemplate(template: EmailTemplateCreate): Promise<EmailTemplate> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }
        
        // If setting as default, unset other defaults for this type
        if (template.is_default) {
            await supabase
                .from('email_templates')
                .update({ is_default: false })
                .eq('type', template.type)
                .eq('is_default', true);
        }
        
        const { data, error } = await supabase
            .from('email_templates')
            .insert({
                ...template,
                created_by: user.id,
            })
            .select()
            .single();
        
        if (error) {
            logger.error("Failed to create email template:", error);
            throw new Error("Failed to create email template");
        }
        
        return EmailTemplate.parse(data);
    } catch (error) {
        logger.error("Failed to create email template:", error);
        throw error;
    }
}

// Update template
export async function updateEmailTemplate(id: string, updates: Partial<EmailTemplateCreate>): Promise<EmailTemplate> {
    try {
        // If setting as default, unset other defaults for this type
        if (updates.is_default && updates.type) {
            await supabase
                .from('email_templates')
                .update({ is_default: false })
                .eq('type', updates.type)
                .eq('is_default', true)
                .neq('id', id);
        }
        
        const { data, error } = await supabase
            .from('email_templates')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            logger.error("Failed to update email template:", error);
            throw new Error("Failed to update email template");
        }
        
        return EmailTemplate.parse(data);
    } catch (error) {
        logger.error("Failed to update email template:", error);
        throw error;
    }
}

// Delete template
export async function deleteEmailTemplate(id: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('email_templates')
            .delete()
            .eq('id', id);
        
        if (error) {
            logger.error("Failed to delete email template:", error);
            throw new Error("Failed to delete email template");
        }
    } catch (error) {
        logger.error("Failed to delete email template:", error);
        throw error;
    }
}

// Render template with variables
export async function renderEmailTemplate(
    templateId: string,
    variables: Record<string, any>
): Promise<{ subject: string; bodyHtml: string; bodyText: string }> {
    try {
        const template = await fetchEmailTemplate(templateId);
        
        return {
            subject: replaceVariables(template.subject, variables),
            bodyHtml: replaceVariables(template.body_html, variables),
            bodyText: replaceVariables(template.body_text, variables),
        };
    } catch (error) {
        logger.error("Failed to render email template:", error);
        throw error;
    }
}

// React Query Hooks
export function useEmailTemplates(type?: string) {
    return useQuery({
        queryKey: qk.emailTemplates(type),
        queryFn: () => fetchEmailTemplates(type),
    });
}

export function useEmailTemplate(id: string) {
    return useQuery({
        queryKey: qk.emailTemplate(id),
        queryFn: () => fetchEmailTemplate(id),
        enabled: !!id,
    });
}

export function useDefaultEmailTemplate(type: string) {
    return useQuery({
        queryKey: qk.defaultEmailTemplate(type),
        queryFn: () => fetchDefaultTemplate(type),
        enabled: !!type,
    });
}

export function useCreateEmailTemplate() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: createEmailTemplate,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.emailTemplates() });
            toastBus.emit({
                title: "Template Created",
                description: "Email template has been created successfully.",
                variant: "success"
            });
        },
        onError: (error) => {
            toastBus.emit({
                title: "Creation Failed",
                description: error instanceof Error ? error.message : "Failed to create email template",
                variant: "destructive"
            });
        }
    });
}

export function useUpdateEmailTemplate() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<EmailTemplateCreate> }) =>
            updateEmailTemplate(id, updates),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.emailTemplates() });
            toastBus.emit({
                title: "Template Updated",
                description: "Email template has been updated successfully.",
                variant: "success"
            });
        },
        onError: (error) => {
            toastBus.emit({
                title: "Update Failed",
                description: error instanceof Error ? error.message : "Failed to update email template",
                variant: "destructive"
            });
        }
    });
}

export function useDeleteEmailTemplate() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: deleteEmailTemplate,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.emailTemplates() });
            toastBus.emit({
                title: "Template Deleted",
                description: "Email template has been deleted successfully.",
                variant: "success"
            });
        },
        onError: (error) => {
            toastBus.emit({
                title: "Delete Failed",
                description: error instanceof Error ? error.message : "Failed to delete email template",
                variant: "destructive"
            });
        }
    });
}

