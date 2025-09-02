import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCompanies, fetchCompany, createCompany, updateCompany } from '../companies';
import { apiClient } from '../../lib/api';

// Mock the API client
vi.mock('../../lib/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn()
  },
  normalizeApiData: vi.fn((response) => response.data)
}));

// Mock the debug module
vi.mock('../../lib/debug', () => ({
  USE_MOCKS: false
}));

describe('Companies Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchCompanies', () => {
    it('should make request with correct Supabase REST parameters', async () => {
      const mockResponse = {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Company 1',
            email: 'contact@company1.com',
            invoice_email: 'invoices@company1.com',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            name: 'Company 2',
            email: 'contact@company2.com',
            invoice_email: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ],
        headers: {
          'x-total-count': '50'
        }
      };

      (apiClient.get as any).mockResolvedValue(mockResponse);

      await fetchCompanies({ page: 2, limit: 10, q: 'test' });

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/companies?select=*&order=updated_at.desc&limit=10&offset=10')
      );
    });

    it('should map invoice_email from snake_case to camelCase', async () => {
      const mockResponse = {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Company 1',
            email: 'contact@company1.com',
            invoice_email: 'invoices@company1.com',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ],
        headers: {
          'x-total-count': '1'
        }
      };

      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await fetchCompanies();

      expect(result.data[0].invoiceEmail).toBe('invoices@company1.com');
      expect(result.data[0].email).toBe('contact@company1.com');
    });

    it('should handle null invoice_email correctly', async () => {
      const mockResponse = {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Company 1',
            email: 'contact@company1.com',
            invoice_email: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ],
        headers: {
          'x-total-count': '1'
        }
      };

      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await fetchCompanies();

      expect(result.data[0].invoiceEmail).toBeNull();
    });

    it('should read total from x-total-count header', async () => {
      const mockResponse = {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Company 1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            name: 'Company 2',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ],
        headers: {
          'x-total-count': '50'
        }
      };

      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await fetchCompanies({ page: 1, limit: 10 });

      expect(result.total).toBe(50);
      expect(result.totalPages).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should fallback to content-range header when x-total-count is missing', async () => {
      const mockResponse = {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Company 1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            name: 'Company 2',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ],
        headers: {
          'content-range': '0-1/25'
        }
      };

      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await fetchCompanies({ page: 1, limit: 10 });

      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
    });

    it('should fallback to array length when no count headers are present', async () => {
      const mockResponse = {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Company 1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            name: 'Company 2',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ],
        headers: {}
      };

      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await fetchCompanies({ page: 1, limit: 10 });

      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
    });

    it('should handle filters correctly', async () => {
      const mockResponse = {
        data: [],
        headers: { 'x-total-count': '0' }
      };

      (apiClient.get as any).mockResolvedValue(mockResponse);

      await fetchCompanies({
        page: 1,
        limit: 10,
        industry: 'Technology',
        country: 'Denmark'
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('industry=eq.Technology&country=eq.Denmark')
      );
    });

    it('should handle text search with OR conditions', async () => {
      const mockResponse = {
        data: [],
        headers: { 'x-total-count': '0' }
      };

      (apiClient.get as any).mockResolvedValue(mockResponse);

      await fetchCompanies({
        page: 1,
        limit: 10,
        q: 'test search'
      });

      // The URL will be URL-encoded, so we check for the encoded version
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('or=%28name.ilike.%25test+search%25%2Cdomain.ilike.%25test+search%25%2Cemail.ilike.%25test+search%25%29')
      );
    });
  });

  describe('fetchCompany', () => {
    it('should fetch single company with invoice_email mapping', async () => {
      const mockResponse = {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Company 1',
            email: 'contact@company1.com',
            invoice_email: 'invoices@company1.com',
            domain: 'company1.com',
            vat: 'DK12345678',
            phone: '+45 12345678',
            address: 'Test Address',
            city: 'Copenhagen',
            country: 'Denmark',
            industry: 'Technology',
            website: 'https://company1.com',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      };

      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await fetchCompany('550e8400-e29b-41d4-a716-446655440001');

      expect(result.invoiceEmail).toBe('invoices@company1.com');
      expect(result.email).toBe('contact@company1.com');
      expect(result.name).toBe('Company 1');
    });
  });

  describe('createCompany', () => {
    it('should create company with invoiceEmail mapping from camelCase to snake_case', async () => {
      const companyData = {
        name: 'New Company',
        email: 'contact@newcompany.com',
        invoiceEmail: 'invoices@newcompany.com',
        domain: 'newcompany.com',
        vat: 'DK87654321',
        phone: '+45 87654321',
        address: 'New Address',
        city: 'Aarhus',
        country: 'Denmark',
        industry: 'Finance',
        website: 'https://newcompany.com'
      };

      const mockResponse = {
        data: {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'New Company',
          email: 'contact@newcompany.com',
          invoice_email: 'invoices@newcompany.com',
          domain: 'newcompany.com',
          vat: 'DK87654321',
          phone: '+45 87654321',
          address: 'New Address',
          city: 'Aarhus',
          country: 'Denmark',
          industry: 'Finance',
          website: 'https://newcompany.com',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      };

      (apiClient.post as any).mockResolvedValue(mockResponse);

      const result = await createCompany(companyData);

      // Verify the API was called with snake_case
      expect(apiClient.post).toHaveBeenCalledWith('/companies', {
        name: 'New Company',
        email: 'contact@newcompany.com',
        invoice_email: 'invoices@newcompany.com',
        domain: 'newcompany.com',
        vat: 'DK87654321',
        phone: '+45 87654321',
        address: 'New Address',
        city: 'Aarhus',
        country: 'Denmark',
        industry: 'Finance',
        website: 'https://newcompany.com'
      });

      // Verify the response is mapped back to camelCase
      expect(result.invoiceEmail).toBe('invoices@newcompany.com');
      expect(result.email).toBe('contact@newcompany.com');
    });

    it('should handle null invoiceEmail correctly', async () => {
      const companyData = {
        name: 'New Company',
        email: 'contact@newcompany.com',
        invoiceEmail: null,
        domain: 'newcompany.com'
      };

      const mockResponse = {
        data: {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'New Company',
          email: 'contact@newcompany.com',
          invoice_email: null,
          domain: 'newcompany.com',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      };

      (apiClient.post as any).mockResolvedValue(mockResponse);

      const result = await createCompany(companyData);

      expect(apiClient.post).toHaveBeenCalledWith('/companies', {
        name: 'New Company',
        email: 'contact@newcompany.com',
        invoice_email: undefined,
        domain: 'newcompany.com'
      });

      expect(result.invoiceEmail).toBeNull();
    });
  });

  describe('updateCompany', () => {
    it('should update company with invoiceEmail mapping', async () => {
      const updateData = {
        name: 'Updated Company',
        invoiceEmail: 'newinvoices@updatedcompany.com'
      };

      const mockResponse = {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Updated Company',
            email: 'contact@company1.com',
            invoice_email: 'newinvoices@updatedcompany.com',
            domain: 'company1.com',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z'
          }
        ]
      };

      (apiClient.patch as any).mockResolvedValue(mockResponse);

      const result = await updateCompany('550e8400-e29b-41d4-a716-446655440001', updateData);

      // Verify the API was called with snake_case
      expect(apiClient.patch).toHaveBeenCalledWith('/companies?id=eq.550e8400-e29b-41d4-a716-446655440001', {
        name: 'Updated Company',
        invoice_email: 'newinvoices@updatedcompany.com'
      });

      // Verify the response is mapped back to camelCase
      expect(result.invoiceEmail).toBe('newinvoices@updatedcompany.com');
      expect(result.name).toBe('Updated Company');
    });

    it('should handle partial updates with invoiceEmail', async () => {
      const updateData = {
        invoiceEmail: 'onlyinvoices@company.com'
      };

      const mockResponse = {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Company 1',
            email: 'contact@company1.com',
            invoice_email: 'onlyinvoices@company.com',
            domain: 'company1.com',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z'
          }
        ]
      };

      (apiClient.patch as any).mockResolvedValue(mockResponse);

      const result = await updateCompany('550e8400-e29b-41d4-a716-446655440001', updateData);

      expect(apiClient.patch).toHaveBeenCalledWith('/companies?id=eq.550e8400-e29b-41d4-a716-446655440001', {
        invoice_email: 'onlyinvoices@company.com'
      });

      expect(result.invoiceEmail).toBe('onlyinvoices@company.com');
    });
  });
});
