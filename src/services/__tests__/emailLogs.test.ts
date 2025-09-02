import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listEmailLogs, getQuoteEmailLogs, EmailLog } from '../emailLogs';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: vi.fn()
    }
}));

describe('Email Logs Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('listEmailLogs', () => {
        it('should call supabase with correct parameters', async () => {
            const mockSupabase = await import('@/integrations/supabase/client');

            // Create a proper mock query chain
            const mockQuery = {
                select: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                })
            };

            mockSupabase.supabase.from = vi.fn().mockReturnValue(mockQuery);

            await listEmailLogs({ relatedType: 'quote', relatedId: 'test-id' });

            expect(mockSupabase.supabase.from).toHaveBeenCalledWith('email_logs');
            expect(mockQuery.select).toHaveBeenCalledWith('*');
            expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
            expect(mockQuery.eq).toHaveBeenCalledWith('related_type', 'quote');
            expect(mockQuery.eq).toHaveBeenCalledWith('related_id', 'test-id');
        });

        it('should handle errors gracefully', async () => {
            const mockSupabase = await import('@/integrations/supabase/client');

            // Mock the supabase client to throw an error
            mockSupabase.supabase.from = vi.fn().mockImplementation(() => {
                throw new Error('Database connection failed');
            });

            // The function should throw an error when there's a database error
            await expect(listEmailLogs({ relatedType: 'quote' }))
                .rejects
                .toThrow('Database connection failed');
        });
    });

    describe('getQuoteEmailLogs', () => {
        it('should call listEmailLogs with quote parameters', async () => {
            // Mock the supabase client for this test
            const mockSupabase = await import('@/integrations/supabase/client');

            const mockQuery = {
                select: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                })
            };

            mockSupabase.supabase.from = vi.fn().mockReturnValue(mockQuery);

            await getQuoteEmailLogs('test-quote-id');

            expect(mockSupabase.supabase.from).toHaveBeenCalledWith('email_logs');
            expect(mockQuery.eq).toHaveBeenCalledWith('related_type', 'quote');
            expect(mockQuery.eq).toHaveBeenCalledWith('related_id', 'test-quote-id');
        });
    });

    describe('EmailLog schema', () => {
        it('should validate correct email log data', () => {
            const validEmailLog = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                user_id: '123e4567-e89b-12d3-a456-426614174001',
                related_type: 'quote' as const,
                related_id: '123e4567-e89b-12d3-a456-426614174002',
                to_email: 'test@example.com',
                cc_emails: ['cc@example.com'],
                subject: 'Test Quote',
                provider: 'gmail',
                provider_message_id: 'msg123',
                status: 'sent' as const,
                error_message: null,
                created_at: '2023-01-01T00:00:00Z'
            };

            expect(() => EmailLog.parse(validEmailLog)).not.toThrow();
        });

        it('should reject invalid email log data', () => {
            const invalidEmailLog = {
                id: 'invalid-uuid',
                user_id: '123e4567-e89b-12d3-a456-426614174001',
                related_type: 'invalid_type',
                related_id: '123e4567-e89b-12d3-a456-426614174002',
                to_email: 'invalid-email',
                cc_emails: ['invalid-email'],
                subject: '',
                provider: 'unknown',
                provider_message_id: null,
                status: 'invalid_status',
                error_message: null,
                created_at: 'invalid-date'
            };

            expect(() => EmailLog.parse(invalidEmailLog)).toThrow();
        });
    });
});
