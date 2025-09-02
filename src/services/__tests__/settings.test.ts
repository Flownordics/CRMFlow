import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserSettings, updateUserSettings, createDefaultUserSettings } from '../settings';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
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
            insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    single: vi.fn(),
                })),
            })),
            update: vi.fn(() => ({
                eq: vi.fn(() => ({
                    select: vi.fn(() => ({
                        single: vi.fn(),
                    })),
                })),
            })),
        })),
    },
}));

describe('Settings Service', () => {
    const mockUser = { id: '123e4567-e89b-12d3-a456-426614174000' };

    beforeEach(() => {
        vi.clearAllMocks();
        (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser } });
    });

    describe('getUserSettings', () => {
        it('should return user settings when they exist', async () => {
            const mockSettings = {
                id: '123e4567-e89b-12d3-a456-426614174001',
                user_id: mockUser.id,
                locale: 'da',
                theme: 'dark',
                calendar_show_google: true,
                calendar_default_sync: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
            };

            const mockFrom = supabase.from as any;
            mockFrom.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: mockSettings, error: null }),
                    }),
                }),
            });

            const result = await getUserSettings();
            expect(result).toEqual(mockSettings);
        });

        it('should create default settings when none exist', async () => {
            // First call: select().eq().single() returns error
            const mockFrom = supabase.from as any;
            mockFrom.mockReturnValueOnce({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                    }),
                }),
            });

            const mockDefaultSettings = {
                id: '123e4567-e89b-12d3-a456-426614174002',
                user_id: mockUser.id,
                locale: 'en',
                theme: 'system',
                calendar_show_google: false,
                calendar_default_sync: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
            };

            // Second call: insert().select().single() returns default settings
            mockFrom.mockReturnValueOnce({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: mockDefaultSettings, error: null }),
                    }),
                }),
            });

            const result = await getUserSettings();
            expect(result).toEqual(mockDefaultSettings);
        });
    });

    describe('updateUserSettings', () => {
        it('should update user settings successfully', async () => {
            const updatePayload = {
                locale: 'da' as const,
                theme: 'dark' as const,
                calendar_show_google: true,
            };

            const mockUpdatedSettings = {
                id: '123e4567-e89b-12d3-a456-426614174001',
                user_id: mockUser.id,
                locale: 'da',
                theme: 'dark',
                calendar_show_google: true,
                calendar_default_sync: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
            };

            const mockFrom = supabase.from as any;
            mockFrom.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({ data: mockUpdatedSettings, error: null }),
                        }),
                    }),
                }),
            });

            const result = await updateUserSettings(updatePayload);
            expect(result).toEqual(mockUpdatedSettings);
        });
    });
});
