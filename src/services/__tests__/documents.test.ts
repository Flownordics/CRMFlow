import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
    supabaseUrl: 'https://test.supabase.co',
  },
}));

describe('Documents Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Document Upload', () => {
    it('should generate presigned upload URL', async () => {
      const mockSession = {
        data: {
          session: {
            access_token: 'test-token',
          },
        },
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue(mockSession as any);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          url: 'https://storage.test.com/upload',
          path: 'user123/file.pdf',
          token: 'upload-token',
        }),
      });

      const { getPresignedUpload } = await import('../documents');
      
      const result = await getPresignedUpload({
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
      });

      expect(result.url).toBe('https://storage.test.com/upload');
      expect(result.path).toBe('user123/file.pdf');
    });

    it('should throw error when user not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
      } as any);

      const { getPresignedUpload } = await import('../documents');

      await expect(
        getPresignedUpload({ fileName: 'test.pdf', mimeType: 'application/pdf' })
      ).rejects.toThrow('Failed to get upload URL');
    });
  });

  describe('Document Download', () => {
    it('should generate signed download URL', async () => {
      const mockDocument = {
        file_name: 'test.pdf',
        storage_path: 'user123/test.pdf',
      };

      const mockStorageFrom = {
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://storage.test.com/download' },
          error: null,
        }),
      };

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorageFrom as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDocument,
          error: null,
        }),
      } as any);

      const { getDownloadUrl } = await import('../documents');

      const result = await getDownloadUrl('doc-id');

      expect(result.url).toBe('https://storage.test.com/download');
      expect(result.filename).toBe('test.pdf');
    });
  });
});
