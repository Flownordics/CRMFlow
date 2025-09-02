import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendQuoteEmail, isEmailAvailable, getEmailProviderName } from '../email';

// Mock environment variables
vi.mock('@/lib/api', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

describe('Email Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset environment variables
        delete import.meta.env.VITE_EMAIL_PROVIDER;
        delete import.meta.env.VITE_EMAIL_FROM;
        delete import.meta.env.VITE_RESEND_API_KEY;
        delete import.meta.env.VITE_SUPABASE_URL;
    });

    describe('isEmailAvailable', () => {
        it('should return true when Resend is configured', () => {
            import.meta.env.VITE_EMAIL_PROVIDER = 'resend';
            import.meta.env.VITE_EMAIL_FROM = 'sales@example.com';
            import.meta.env.VITE_RESEND_API_KEY = 'test_key';

            expect(isEmailAvailable()).toBe(true);
        });

        it('should return false when Resend is configured but missing API key', () => {
            import.meta.env.VITE_EMAIL_PROVIDER = 'resend';
            import.meta.env.VITE_EMAIL_FROM = 'sales@example.com';
            // Missing VITE_RESEND_API_KEY

            expect(isEmailAvailable()).toBe(false);
        });

        it('should return true for console fallback', () => {
            import.meta.env.VITE_EMAIL_PROVIDER = 'console';
            // Missing other config

            expect(isEmailAvailable()).toBe(true);
        });

        it('should return true when no provider specified (defaults to console)', () => {
            // No environment variables set

            expect(isEmailAvailable()).toBe(true);
        });
    });

    describe('getEmailProviderName', () => {
        it('should return Resend for resend provider', () => {
            import.meta.env.VITE_EMAIL_PROVIDER = 'resend';
            expect(getEmailProviderName()).toBe('Resend');
        });

        it('should return SMTP for smtp provider', () => {
            import.meta.env.VITE_EMAIL_PROVIDER = 'smtp';
            expect(getEmailProviderName()).toBe('SMTP');
        });

        it('should return Console for unknown provider', () => {
            import.meta.env.VITE_EMAIL_PROVIDER = 'unknown';
            expect(getEmailProviderName()).toBe('Console (Development)');
        });

        it('should return Console when no provider specified', () => {
            expect(getEmailProviderName()).toBe('Console (Development)');
        });
    });

    describe('sendQuoteEmail', () => {
        it('should throw error when SUPABASE_URL is not configured', async () => {
            // Missing VITE_SUPABASE_URL

            await expect(sendQuoteEmail({
                quoteId: 'test-id',
                to: 'test@example.com'
            })).rejects.toThrow('VITE_SUPABASE_URL is not configured');
        });

        it('should make request to Edge Function when configured', async () => {
            import.meta.env.VITE_SUPABASE_URL = 'https://test.supabase.co';

            // Mock fetch
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            await sendQuoteEmail({
                quoteId: 'test-id',
                to: 'test@example.com',
                subject: 'Test Subject',
                body: 'Test Body'
            });

            expect(fetch).toHaveBeenCalledWith(
                'https://test.supabase.co/functions/v1/send-quote',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'Idempotency-Key': expect.stringMatching(/^send_quote_\d+_[a-z0-9]+$/)
                    }),
                    body: JSON.stringify({
                        quoteId: 'test-id',
                        to: 'test@example.com',
                        subject: 'Test Subject',
                        body: 'Test Body'
                    })
                })
            );
        });

        it('should handle HTTP errors', async () => {
            import.meta.env.VITE_SUPABASE_URL = 'https://test.supabase.co';

            // Mock fetch with error
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                json: () => Promise.resolve({ error: 'Internal server error' })
            });

            await expect(sendQuoteEmail({
                quoteId: 'test-id',
                to: 'test@example.com'
            })).rejects.toThrow('Internal server error');
        });
    });
});
