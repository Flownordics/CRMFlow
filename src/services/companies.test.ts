import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, apiPostWithReturn, apiClient, normalizeApiData } from "@/lib/api";
import { createCompany, updateCompany, searchCompanies } from "./companies";
import { Company } from "@/lib/schemas/company";
import type { CompanyCreate } from "@/lib/schemas/company";

// Mock the API module
vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  apiPostWithReturn: vi.fn(),
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  normalizeApiData: vi.fn(),
}));

const mockApi = vi.mocked(api);
const mockApiPostWithReturn = vi.mocked(apiPostWithReturn);
const mockApiClient = vi.mocked(apiClient);
const mockNormalizeApiData = vi.mocked(normalizeApiData);

describe("Companies Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCompany", () => {
    it("should create company successfully", async () => {
      const mockCompanyData = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Company",
        email: "info@test.com",
        invoice_email: "invoice@test.com",
        vat: "123456789",
        phone: "+1234567890",
        address: "123 Test St",
        city: "Test City",
        country: "Test Country",
        industry: "Technology",
        website: "https://test.com",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const createData = {
        name: "Test Company",
        email: "info@test.com",
        invoiceEmail: "invoice@test.com",
        vat: "123456789",
        phone: "+1234567890",
        address: "123 Test St",
        city: "Test City",
        country: "Test Country",
        industry: "Technology",
        website: "https://test.com",
      };

      const mockResponse = {
        data: [mockCompanyData],
        status: 201,
        statusText: "Created",
        headers: {},
        config: {} as any
      };

      mockApiPostWithReturn.mockResolvedValueOnce(mockResponse);
      mockNormalizeApiData.mockReturnValueOnce([mockCompanyData]);

      const result = await createCompany(createData);

      expect(mockApiPostWithReturn).toHaveBeenCalledWith("/companies", {
        name: "Test Company",
        email: "info@test.com",
        invoice_email: "invoice@test.com",
        vat: "123456789",
        phone: "+1234567890",
        address: "123 Test St",
        city: "Test City",
        country: "Test Country",
        industry: "Technology",
        website: "https://test.com",
      });
      expect(result).toMatchObject({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Company",
        email: "info@test.com",
        invoiceEmail: "invoice@test.com",
      });
    });

    it("should handle API errors gracefully", async () => {
      const error = new Error("API Error");
      mockApiPostWithReturn.mockRejectedValueOnce(error);

      const createData = {
        name: "Test Company",
      };

      await expect(createCompany(createData)).rejects.toThrow("Failed to create company");
    });
  });

  describe("updateCompany", () => {
    it("should update company successfully", async () => {
      const mockCompanyData = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Updated Company",
        email: "info@updated.com",
        invoice_email: "invoice@updated.com",
        vat: "987654321",
        phone: "+0987654321",
        address: "456 Updated St",
        city: "Updated City",
        country: "Updated Country",
        industry: "Technology",
        website: "https://updated.com",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updateData = {
        name: "Updated Company",
        email: "info@updated.com",
      };

      const mockResponse = {
        data: [mockCompanyData],
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any
      };

      mockApiClient.patch.mockResolvedValueOnce(mockResponse);
      mockNormalizeApiData.mockReturnValueOnce([mockCompanyData]);

      const result = await updateCompany("1", updateData);

      expect(mockApiClient.patch).toHaveBeenCalledWith("/companies?id=eq.1", {
        name: "Updated Company",
        email: "info@updated.com",
      });
      expect(result).toMatchObject({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Updated Company",
        email: "info@updated.com",
      });
    });
  });

  describe("searchCompanies", () => {
    it("should search companies successfully", async () => {
      const mockCompanies = [
        { id: "123e4567-e89b-12d3-a456-426614174000", name: "Company A", email: "a@company.com" },
        { id: "123e4567-e89b-12d3-a456-426614174001", name: "Company B", email: "b@company.com" },
      ];

      mockApiClient.get.mockResolvedValueOnce({
        data: mockCompanies,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any
      });

      mockNormalizeApiData.mockReturnValueOnce(mockCompanies);

      const result = await searchCompanies("test");

      expect(mockApiClient.get).toHaveBeenCalledWith("/companies?or=(name.ilike.*%25test%25*%2Cemail.ilike.*%25test%25*%2Cwebsite.ilike.*%25test%25*)&select=id,name,email,website&limit=20");
      expect(result).toEqual(mockCompanies);
    });
  });

  describe("API parsing", () => {
    it("should parse valid company data with zod", async () => {
      const validCompanyData = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Valid Company",
        email: "info@valid.com",
        invoice_email: "invoice@valid.com",
        vat: "123456789",
        phone: "+1234567890",
        address: "123 Valid St",
        city: "Valid City",
        country: "Valid Country",
        industry: "Technology",
        website: "https://valid.com",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockResponse = {
        data: [validCompanyData],
        status: 201,
        statusText: "Created",
        headers: {},
        config: {} as any
      };

      mockApiPostWithReturn.mockResolvedValueOnce(mockResponse);
      mockNormalizeApiData.mockReturnValueOnce([validCompanyData]);

      const result = await createCompany({ name: "Valid Company" });

      // The data should be parsed and validated by zod
      expect(result).toMatchObject({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Valid Company",
        email: "info@valid.com",
      });
    });

    it("should reject invalid company data", async () => {
      const invalidCompanyData = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        // Missing required name field
        email: "invalid.com",
      };

      const mockResponse = {
        data: [invalidCompanyData],
        status: 201,
        statusText: "Created",
        headers: {},
        config: {} as any
      };

      mockApiPostWithReturn.mockResolvedValueOnce(mockResponse);
      mockNormalizeApiData.mockReturnValueOnce([invalidCompanyData]);

      // This should fail zod validation
      await expect(createCompany({ name: "Valid Name" })).rejects.toThrow();
    });
  });
});
