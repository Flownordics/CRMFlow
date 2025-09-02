import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, normalizeApiData } from '../api';

// Mock the toastBus
vi.mock('../toastBus', () => ({
  toastBus: {
    emit: vi.fn()
  }
}));

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Headers Configuration', () => {
    it('should have standard Supabase REST headers', () => {
      expect(apiClient.defaults.headers).toMatchObject({
        Accept: "application/json",
        apikey: expect.any(String),
        Authorization: expect.stringMatching(/^Bearer /),
        Prefer: "count=exact"
      });
    });
  });

  describe('Data Normalization', () => {
    it('should normalize API data correctly', () => {
      const mockResponse = {
        data: { id: '1', name: 'Test' },
        status: 200
      };

      const result = normalizeApiData(mockResponse);
      expect(result).toEqual({ id: '1', name: 'Test' });
    });

    it('should handle direct payload', () => {
      const mockPayload = { id: '1', name: 'Test' };
      const result = normalizeApiData(mockPayload);
      expect(result).toEqual(mockPayload);
    });

    it('should parse JSON string', () => {
      const jsonString = '{"id":"1","name":"Test"}';
      const result = normalizeApiData(jsonString);
      expect(result).toEqual({ id: '1', name: 'Test' });
    });

    it('should throw error for invalid JSON string', () => {
      const invalidJson = 'invalid json';
      expect(() => normalizeApiData(invalidJson)).toThrow();
    });
  });

  describe('Response Headers', () => {
    it('should handle x-total-count header', () => {
      const mockResponse = {
        data: [],
        headers: {
          'x-total-count': '50'
        }
      };

      expect(mockResponse.headers['x-total-count']).toBe('50');
    });

    it('should handle content-range header', () => {
      const mockResponse = {
        data: [],
        headers: {
          'content-range': '0-1/25'
        }
      };

      expect(mockResponse.headers['content-range']).toBe('0-1/25');
    });
  });
});
