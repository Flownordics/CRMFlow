import { describe, it, expect } from "vitest";
import { formatMoneyMinor, toMinor, fromMinor } from "../money";

describe("Money Utils", () => {
  describe("formatMoneyMinor", () => {
    it("should format DKK correctly", () => {
      const result = formatMoneyMinor(19900, "DKK");
      expect(result).toContain("199,00");
      expect(result).toContain("kr");
    });

    it("should format USD correctly", () => {
      const result = formatMoneyMinor(19900, "USD");
      expect(result).toContain("199,00");
      expect(result).toContain("US$");
    });

    it("should handle zero values", () => {
      const result = formatMoneyMinor(0, "DKK");
      expect(result).toContain("0,00");
      expect(result).toContain("kr");
    });

    it("should handle large values", () => {
      const result = formatMoneyMinor(1234567, "DKK");
      expect(result).toContain("12.345,67");
      expect(result).toContain("kr");
    });
  });

  describe("toMinor", () => {
    it("should convert to minor units", () => {
      expect(toMinor(199.99)).toBe(19999);
      expect(toMinor(0.01)).toBe(1);
      expect(toMinor(0)).toBe(0);
    });

    it("should round correctly", () => {
      expect(toMinor(199.999)).toBe(20000);
      expect(toMinor(199.001)).toBe(19900);
    });
  });

  describe("fromMinor", () => {
    it("should convert from minor units", () => {
      expect(fromMinor(19999)).toBe(199.99);
      expect(fromMinor(1)).toBe(0.01);
      expect(fromMinor(0)).toBe(0);
    });
  });

  describe("round trip conversion", () => {
    it("should maintain precision through conversions", () => {
      const original = 199.99;
      const minor = toMinor(original);
      const back = fromMinor(minor);
      expect(back).toBe(original);
    });
  });
});
