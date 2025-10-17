import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('Calendar Sync Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCalendarSyncStatus', () => {
    it('should return enabled status when sync is active', async () => {
      const mockUser = { data: { user: { id: 'user123' } } };
      const mockIntegration = {
        data: {
          resource_id: 'resource123',
          channel_id: 'channel123',
          webhook_expiration: '2025-10-24T00:00:00Z',
          updated_at: '2025-10-17T12:00:00Z',
        },
        error: null,
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue(mockUser as any);
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockIntegration),
      } as any);

      const { getCalendarSyncStatus } = await import('../calendarSync');

      const status = await getCalendarSyncStatus();

      expect(status.enabled).toBe(true);
      expect(status.resourceId).toBe('resource123');
      expect(status.channelId).toBe('channel123');
    });

    it('should return disabled when not configured', async () => {
      const mockUser = { data: { user: { id: 'user123' } } };
      const mockIntegration = {
        data: {
          resource_id: null,
          channel_id: null,
        },
        error: null,
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue(mockUser as any);
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockIntegration),
      } as any);

      const { getCalendarSyncStatus } = await import('../calendarSync');

      const status = await getCalendarSyncStatus();

      expect(status.enabled).toBe(false);
    });
  });

  describe('enableCalendarSync', () => {
    it('should set up Google Calendar watch and store resource ID', async () => {
      const mockUser = { data: { user: { id: 'user123' } } };
      const mockIntegration = {
        data: {
          user_id: 'user123',
          access_token: 'access-token',
        },
        error: null,
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue(mockUser as any);
      
      const mockUpdate = vi.fn().mockReturnThis();
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockIntegration),
        update: mockUpdate,
      } as any);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          resourceId: 'new-resource-id',
          expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString(),
        }),
      });

      const { enableCalendarSync } = await import('../calendarSync');

      const result = await enableCalendarSync();

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/calendar/v3/calendars/primary/events/watch'),
        expect.any(Object)
      );
    });
  });
});

