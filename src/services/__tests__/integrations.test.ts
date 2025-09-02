import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGmailStatus } from '../integrations';
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

describe('Integrations Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGmailStatus', () => {
    it('should return connected status when Gmail integration exists', async () => {
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

      const result = await getGmailStatus();

      expect(result).toEqual({
        connected: true,
        email: 'test@example.com',
      });
    });

    it('should return not connected status when no Gmail integration exists', async () => {
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

      const result = await getGmailStatus();

      expect(result).toEqual({
        connected: false,
      });
    });

    it('should return not connected status when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getGmailStatus();

      expect(result).toEqual({
        connected: false,
      });
    });

    it('should handle errors gracefully and return not connected', async () => {
      vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error('Auth error'));

      const result = await getGmailStatus();

      expect(result).toEqual({
        connected: false,
      });
    });
  });
});

