import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDeal } from "./deals";
import { Deal } from "./deals";

// Mock the mockData import
const mockMockDeals: any[] = [];
vi.mock("./mockData", () => ({
  mockDeals: mockMockDeals,
}));

describe("deals service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMockDeals.length = 0; // Clear the array
  });

  describe("createDeal", () => {
    it("creates deal with all required fields", async () => {
      const dealData = {
        title: "Test Deal",
        stageId: "prospecting",
        companyId: "company-1",
        contactId: "contact-1",
        currency: "DKK",
        defaultTaxPct: 25,
        notes: null,
        lines: [],
        expectedValue: 100000, // 1,000 DKK in minor units
        closeDate: "2024-12-31T00:00:00.000Z",
      };

      const result = await createDeal(dealData);

      expect(result).toMatchObject({
        ...dealData,
        id: expect.any(String),
      });
      expect(result.id).toHaveLength(9);
    });

    it("creates deal with minimal required fields", async () => {
      const dealData = {
        title: "Minimal Deal",
        stageId: "prospecting",
        companyId: "company-1",
        contactId: null,
        currency: "DKK",
        defaultTaxPct: 25,
        notes: null,
        lines: [],
        expectedValue: 0,
        closeDate: null,
      };

      const result = await createDeal(dealData);

      expect(result).toMatchObject({
        ...dealData,
        id: expect.any(String),
      });
    });

    it("sets default values correctly", async () => {
      const dealData = {
        title: "Default Deal",
        stageId: "prospecting",
        companyId: "company-1",
        contactId: null,
        currency: "DKK",
        defaultTaxPct: 25,
        notes: null,
        lines: [],
        expectedValue: 0,
        closeDate: null,
      };

      const result = await createDeal(dealData);

      expect(result.currency).toBe("DKK");
      expect(result.defaultTaxPct).toBe(25);
      expect(result.expectedValue).toBe(0);
      expect(result.closeDate).toBeNull();
    });
  });
});
