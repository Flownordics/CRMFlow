import { describe, it, expect, vi } from "vitest";
import { getPdfUrl } from "./PDFService";

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(async () => ({ data: new Uint8Array([37, 80, 68, 70]) })), // %PDF...
  },
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn(() => "blob:mock-url-123");
const mockRevokeObjectURL = vi.fn();

Object.defineProperty(global, "URL", {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
  writable: true,
});

describe("PDFService", () => {
  it("returns object URL", async () => {
    const result = await getPdfUrl("quote", "q1");
    expect(result.url).toMatch(/^blob:/);
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });
});
