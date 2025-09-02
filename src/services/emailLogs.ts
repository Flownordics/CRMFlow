import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

// Email log schema
export const EmailLog = z.object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    related_type: z.enum(['quote', 'order', 'invoice']),
    related_id: z.string().uuid(),
    to_email: z.string().email(),
    cc_emails: z.array(z.string().email()).default([]),
    subject: z.string(),
    provider: z.string(),
    provider_message_id: z.string().nullable(),
    status: z.enum(['queued', 'sent', 'error']),
    error_message: z.string().nullable(),
    created_at: z.string(),
});

export type EmailLog = z.infer<typeof EmailLog>;

// Email logs list response
export const EmailLogsResponse = z.array(EmailLog);
export type EmailLogsResponse = z.infer<typeof EmailLogsResponse>;

// Parameters for listing email logs
export interface ListEmailLogsParams {
    relatedType?: 'quote' | 'order' | 'invoice';
    relatedId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
}

// List email logs
export async function listEmailLogs(params: ListEmailLogsParams = {}): Promise<EmailLog[]> {
    try {
        let query = supabase
            .from('email_logs')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply filters
        if (params.relatedType) {
            query = query.eq('related_type', params.relatedType);
        }

        if (params.relatedId) {
            query = query.eq('related_id', params.relatedId);
        }

        if (params.userId) {
            query = query.eq('user_id', params.userId);
        }

        // Apply pagination
        if (params.limit) {
            query = query.limit(params.limit);
        }

        if (params.offset) {
            query = query.range(params.offset, (params.offset + (params.limit || 10)) - 1);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching email logs:', error);
            throw new Error(`Failed to fetch email logs: ${error.message}`);
        }

        return EmailLogsResponse.parse(data || []);
    } catch (error) {
        console.error('Error in listEmailLogs:', error);
        throw error;
    }
}

// Get email logs for a specific quote
export async function getQuoteEmailLogs(quoteId: string): Promise<EmailLog[]> {
    return listEmailLogs({ relatedType: 'quote', relatedId: quoteId });
}

// Get email logs for a specific order
export async function getOrderEmailLogs(orderId: string): Promise<EmailLog[]> {
    return listEmailLogs({ relatedType: 'order', relatedId: orderId });
}

// Get email logs for a specific invoice
export async function getInvoiceEmailLogs(invoiceId: string): Promise<EmailLog[]> {
    return listEmailLogs({ relatedType: 'invoice', relatedId: invoiceId });
}

// React Query hooks
export function useEmailLogs(params: ListEmailLogsParams = {}) {
    return useQuery({
        queryKey: ['email-logs', params],
        queryFn: () => listEmailLogs(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useQuoteEmailLogs(quoteId: string) {
    return useQuery({
        queryKey: ['email-logs', 'quote', quoteId],
        queryFn: () => getQuoteEmailLogs(quoteId),
        enabled: !!quoteId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useOrderEmailLogs(orderId: string) {
    return useQuery({
        queryKey: ['email-logs', 'order', orderId],
        queryFn: () => getOrderEmailLogs(orderId),
        enabled: !!orderId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useInvoiceEmailLogs(invoiceId: string) {
    return useQuery({
        queryKey: ['email-logs', 'invoice', invoiceId],
        queryFn: () => getInvoiceEmailLogs(invoiceId),
        enabled: !!invoiceId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
