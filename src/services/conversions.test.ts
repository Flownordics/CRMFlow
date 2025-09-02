import { describe, it, expect, vi } from "vitest";
import * as conv from "./conversions";

vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(async (_: string, __: any, ___: any) => ({
      data: { id: "123e4567-e89b-12d3-a456-426614174000", dealId: "123e4567-e89b-12d3-a456-426614174001" },
    })),
  },
}));

describe("conversions", () => {
  it("creates quote from deal", async () => {
    const res = await conv.createQuoteFromDeal("123e4567-e89b-12d3-a456-426614174001");
    expect(res.id).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(res.dealId).toBe("123e4567-e89b-12d3-a456-426614174001");
  });
});
