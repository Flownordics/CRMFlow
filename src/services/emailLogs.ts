import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { logger } from '@/lib/logger';

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
            logger.error('Error fetching email logs:', error);
            throw new Error(`Failed to fetch email logs: ${error.message}`);
        }

        return EmailLogsResponse.parse(data || []);
    } catch (error) {
        logger.error('Error in listEmailLogs:', error);
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

// Extended email log with company info
export interface EmailLogWithCompany extends EmailLog {
    company_id: string | null;
    company_name: string | null;
    entity_number: string | null; // quote/order/invoice number
}

// Get recent email logs with company information
export async function getRecentEmailLogsWithCompany(limit: number = 10): Promise<EmailLogWithCompany[]> {
    try {
        // Fetch email logs
        const { data: emailLogs, error: logsError } = await supabase
            .from('email_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (logsError) {
            logger.error('Error fetching email logs:', logsError);
            throw new Error(`Failed to fetch email logs: ${logsError.message}`);
        }

        if (!emailLogs || emailLogs.length === 0) {
            return [];
        }

        // Parse email logs
        const parsedLogs = EmailLogsResponse.parse(emailLogs);

        // Group by related_type for batch fetching
        const quotes = parsedLogs.filter(log => log.related_type === 'quote');
        const orders = parsedLogs.filter(log => log.related_type === 'order');
        const invoices = parsedLogs.filter(log => log.related_type === 'invoice');

        // Batch fetch quotes with company info
        const quoteIds = quotes.map(log => log.related_id);
        const quoteData: Record<string, { company_id: string | null; number: string | null }> = {};
        if (quoteIds.length > 0) {
            const { data: quotesData } = await supabase
                .from('quotes')
                .select('id, company_id, number')
                .in('id', quoteIds);
            
            quotesData?.forEach(quote => {
                quoteData[quote.id] = { company_id: quote.company_id, number: quote.number };
            });
        }

        // Batch fetch orders with company info
        const orderIds = orders.map(log => log.related_id);
        const orderData: Record<string, { company_id: string | null; number: string | null }> = {};
        if (orderIds.length > 0) {
            const { data: ordersData } = await supabase
                .from('orders')
                .select('id, company_id, number')
                .in('id', orderIds);
            
            ordersData?.forEach(order => {
                orderData[order.id] = { company_id: order.company_id, number: order.number };
            });
        }

        // Batch fetch invoices with company info
        const invoiceIds = invoices.map(log => log.related_id);
        const invoiceData: Record<string, { company_id: string | null; number: string | null }> = {};
        if (invoiceIds.length > 0) {
            const { data: invoicesData } = await supabase
                .from('invoices')
                .select('id, company_id, number')
                .in('id', invoiceIds);
            
            invoicesData?.forEach(invoice => {
                invoiceData[invoice.id] = { company_id: invoice.company_id, number: invoice.number };
            });
        }

        // Collect all unique company IDs
        const companyIds = new Set<string>();
        [...Object.values(quoteData), ...Object.values(orderData), ...Object.values(invoiceData)]
            .forEach(item => {
                if (item.company_id) {
                    companyIds.add(item.company_id);
                }
            });

        // Batch fetch company names
        const companyData: Record<string, string> = {};
        if (companyIds.size > 0) {
            const { data: companies } = await supabase
                .from('companies')
                .select('id, name')
                .in('id', Array.from(companyIds));
            
            companies?.forEach(company => {
                companyData[company.id] = company.name;
            });
        }

        // Map logs with company info
        const logsWithCompany: EmailLogWithCompany[] = parsedLogs.map((log) => {
            let companyId: string | null = null;
            let companyName: string | null = null;
            let entityNumber: string | null = null;

            if (log.related_type === 'quote' && quoteData[log.related_id]) {
                companyId = quoteData[log.related_id].company_id;
                entityNumber = quoteData[log.related_id].number;
            } else if (log.related_type === 'order' && orderData[log.related_id]) {
                companyId = orderData[log.related_id].company_id;
                entityNumber = orderData[log.related_id].number;
            } else if (log.related_type === 'invoice' && invoiceData[log.related_id]) {
                companyId = invoiceData[log.related_id].company_id;
                entityNumber = invoiceData[log.related_id].number;
            }

            if (companyId && companyData[companyId]) {
                companyName = companyData[companyId];
            }

            return {
                ...log,
                company_id: companyId,
                company_name: companyName,
                entity_number: entityNumber,
            };
        });

        return logsWithCompany;
    } catch (error) {
        logger.error('Error in getRecentEmailLogsWithCompany:', error);
        throw error;
    }
}

// React Query hook for recent email logs with company info
export function useRecentEmailLogsWithCompany(limit: number = 10) {
    return useQuery({
        queryKey: ['email-logs', 'recent', limit],
        queryFn: () => getRecentEmailLogsWithCompany(limit),
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
}
