import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAccountingSummary, listOverdueInvoices, listRecentlyUpdatedInvoices } from '../accounting';
import { api } from '@/lib/api';

// Mock the API
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn()
  }
}));

describe('Accounting Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAccountingSummary', () => {
    it('should calculate outstanding amount correctly', async () => {
      const mockOutstanding = {
        data: [
          { balance_minor: 1000 },
          { balance_minor: 2000 },
          { balance_minor: 500 }
        ]
      };

      const mockOverdue = {
        data: [
          { balance_minor: 1000, due_date: '2024-01-01' },
          { balance_minor: 500, due_date: '2024-01-01' }
        ]
      };

      vi.mocked(api.get)
        .mockResolvedValueOnce(mockOutstanding)
        .mockResolvedValueOnce(mockOverdue);

      const result = await getAccountingSummary();

      expect(result.outstandingMinor).toBe(3500);
      expect(result.overdueMinor).toBe(1500);
      expect(result.paidMinor).toBe(0);
      // Aging calculation depends on current date, so we just check it exists
      expect(result.aging).toHaveProperty('0-30');
      expect(result.aging).toHaveProperty('31-60');
      expect(result.aging).toHaveProperty('61-90');
      expect(result.aging).toHaveProperty('90+');
    });

    it('should handle empty data', async () => {
      vi.mocked(api.get)
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] });

      const result = await getAccountingSummary();

      expect(result.outstandingMinor).toBe(0);
      expect(result.overdueMinor).toBe(0);
      expect(result.paidMinor).toBe(0);
      expect(result.aging['0-30']).toBe(0);
    });
  });

  describe('listOverdueInvoices', () => {
    it('should fetch overdue invoices with correct parameters', async () => {
      const mockInvoices = {
        data: [
          { id: '1', number: 'INV-001', balance_minor: 1000, due_date: '2024-01-01' }
        ]
      };

      vi.mocked(api.get).mockResolvedValue(mockInvoices);

      const result = await listOverdueInvoices({ limit: 5, offset: 0 });

      expect(api.get).toHaveBeenCalledWith('/invoices', {
        params: {
          select: 'id,number,company_id,due_date,currency,total_minor,paid_minor,balance_minor,status,updated_at',
          balance_minor: 'gt.0',
          due_date: expect.stringMatching(/^lt\.\d{4}-\d{2}-\d{2}$/),
          order: 'due_date.asc',
          limit: 5,
          offset: 0
        }
      });

      expect(result).toEqual(mockInvoices.data);
    });
  });

  describe('listRecentlyUpdatedInvoices', () => {
    it('should fetch recent invoices with correct parameters', async () => {
      const mockInvoices = {
        data: [
          { id: '1', number: 'INV-001', updated_at: '2024-01-01T10:00:00Z' }
        ]
      };

      vi.mocked(api.get).mockResolvedValue(mockInvoices);

      const result = await listRecentlyUpdatedInvoices({ limit: 10, offset: 0 });

      expect(api.get).toHaveBeenCalledWith('/invoices', {
        params: {
          select: 'id,number,company_id,due_date,currency,total_minor,paid_minor,balance_minor,status,updated_at',
          order: 'updated_at.desc',
          limit: 10,
          offset: 0
        }
      });

      expect(result).toEqual(mockInvoices.data);
    });
  });
});
