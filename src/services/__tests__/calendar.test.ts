import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCalendarStatus, syncGoogleCalendar } from '../calendar';
import { supabase } from '@/integrations/supabase/client';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        auth: {
            getUser: vi.fn(),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(),
                })),
            })),
        })),
    },
}));

describe('Calendar Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getCalendarStatus', () => {
        it('should return connected status when calendar integration exists', async () => {
            const mockUser = { id: 'user-123' };
            const mockIntegration = {
                email: 'test@example.com',
                access_token: 'token123',
                updated_at: '2024-12-01T10:00:00Z',
            };

            vi.mocked(supabase.auth.getUser).mockResolvedValue({
                data: { user: mockUser },
                error: null,
            });

            vi.mocked(supabase.from).mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockIntegration,
                            error: null,
                        }),
                    }),
                }),
            } as any);

            const result = await getCalendarStatus();

            expect(result).toEqual({
                connected: true,
                email: 'test@example.com',
                provider: 'google',
                lastSyncAt: '2024-12-01T10:00:00Z',
            });
        });

        it('should return not connected status when no calendar integration exists', async () => {
            const mockUser = { id: 'user-123' };

            vi.mocked(supabase.auth.getUser).mockResolvedValue({
                data: { user: mockUser },
                error: null,
            });

            vi.mocked(supabase.from).mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: 'No rows returned' },
                        }),
                    }),
                }),
            } as any);

            const result = await getCalendarStatus();

            expect(result).toEqual({
                connected: false,
            });
        });

        it('should return not connected status when user is not authenticated', async () => {
            vi.mocked(supabase.auth.getUser).mockResolvedValue({
                data: { user: null },
                error: null,
            });

            const result = await getCalendarStatus();

            expect(result).toEqual({
                connected: false,
            });
        });

        it('should handle errors gracefully and return not connected', async () => {
            vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error('Auth error'));

            const result = await getCalendarStatus();

            expect(result).toEqual({
                connected: false,
            });
        });
    });

    describe('syncGoogleCalendar', () => {
        it('should return success when calendar is connected', async () => {
            const mockUser = { id: 'user-123' };
            const mockIntegration = {
                email: 'test@example.com',
                access_token: 'token123',
            };

            vi.mocked(supabase.auth.getUser).mockResolvedValue({
                data: { user: mockUser },
                error: null,
            });

            vi.mocked(supabase.from).mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockIntegration,
                            error: null,
                        }),
                    }),
                }),
            } as any);

            const result = await syncGoogleCalendar();

            expect(result).toEqual({
                ok: true,
            });
        });

        it('should return error when calendar is not connected', async () => {
            const mockUser = { id: 'user-123' };

            vi.mocked(supabase.auth.getUser).mockResolvedValue({
                data: { user: mockUser },
                error: null,
            });

            vi.mocked(supabase.from).mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: 'No rows returned' },
                        }),
                    }),
                }),
            } as any);

            const result = await syncGoogleCalendar();

            expect(result).toEqual({
                ok: false,
                error: 'Google Calendar not connected',
            });
        });

        it('should handle errors gracefully', async () => {
            vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error('Auth error'));

            const result = await syncGoogleCalendar();

            expect(result).toEqual({
                ok: false,
                error: 'Auth error',
            });
        });
    });
});
