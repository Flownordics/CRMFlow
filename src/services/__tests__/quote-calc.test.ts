import { describe, it, expect } from "vitest";
import { fromMinor, toMinor } from "@/lib/money";

describe("Quote Line Calculations", () => {
  describe("Line Total Calculation", () => {
    it("should calculate line total correctly with no discount and 25% tax", () => {
      const qty = 2;
      const unitMinor = 10000; // 100.00 DKK
      const discountPct = 0;
      const taxRatePct = 25;

      // Calculate line total
      const gross = fromMinor(unitMinor) * qty; // 100.00 * 2 = 200.00
      const afterDisc = gross * (1 - discountPct / 100); // 200.00 * 1 = 200.00
      const tax = (taxRatePct / 100) * afterDisc; // 25% * 200.00 = 50.00
      const lineTotal = afterDisc + tax; // 200.00 + 50.00 = 250.00
      const lineTotalMinor = toMinor(lineTotal); // 250.00 → 25000

      expect(gross).toBe(200);
      expect(afterDisc).toBe(200);
      expect(tax).toBe(50);
      expect(lineTotal).toBe(250);
      expect(lineTotalMinor).toBe(25000);
    });

    it("should calculate line total correctly with 10% discount and 25% tax", () => {
      const qty = 1.5;
      const unitMinor = 20000; // 200.00 DKK
      const discountPct = 10;
      const taxRatePct = 25;

      // Calculate line total
      const gross = fromMinor(unitMinor) * qty; // 200.00 * 1.5 = 300.00
      const afterDisc = gross * (1 - discountPct / 100); // 300.00 * 0.9 = 270.00
      const tax = (taxRatePct / 100) * afterDisc; // 25% * 270.00 = 67.50
      const lineTotal = afterDisc + tax; // 270.00 + 67.50 = 337.50
      const lineTotalMinor = toMinor(lineTotal); // 337.50 → 33750

      expect(gross).toBe(300);
      expect(afterDisc).toBe(270);
      expect(tax).toBe(67.5);
      expect(lineTotal).toBe(337.5);
      expect(lineTotalMinor).toBe(33750);
    });

    it("should handle zero quantity", () => {
      const qty = 0;
      const unitMinor = 10000; // 100.00 DKK
      const discountPct = 0;
      const taxRatePct = 25;

      const gross = fromMinor(unitMinor) * qty;
      const afterDisc = gross * (1 - discountPct / 100);
      const tax = (taxRatePct / 100) * afterDisc;
      const lineTotal = afterDisc + tax;
      const lineTotalMinor = toMinor(lineTotal);

      expect(gross).toBe(0);
      expect(afterDisc).toBe(0);
      expect(tax).toBe(0);
      expect(lineTotal).toBe(0);
      expect(lineTotalMinor).toBe(0);
    });

    it("should handle 100% discount", () => {
      const qty = 1;
      const unitMinor = 10000; // 100.00 DKK
      const discountPct = 100;
      const taxRatePct = 25;

      const gross = fromMinor(unitMinor) * qty;
      const afterDisc = gross * (1 - discountPct / 100);
      const tax = (taxRatePct / 100) * afterDisc;
      const lineTotal = afterDisc + tax;
      const lineTotalMinor = toMinor(lineTotal);

      expect(gross).toBe(100);
      expect(afterDisc).toBe(0);
      expect(tax).toBe(0);
      expect(lineTotal).toBe(0);
      expect(lineTotalMinor).toBe(0);
    });
  });

  describe("Quote Totals Calculation", () => {
    it("should sum multiple lines correctly", () => {
      const lines = [
        {
          qty: 1,
          unitMinor: 10000, // 100.00 DKK
          discountPct: 0,
          taxRatePct: 25,
        },
        {
          qty: 2,
          unitMinor: 5000, // 50.00 DKK
          discountPct: 10,
          taxRatePct: 25,
        },
      ];

      const subtotal = lines.reduce((acc, l) => {
        const gross = fromMinor(l.unitMinor) * l.qty;
        const afterDisc = gross * (1 - l.discountPct / 100);
        return acc + afterDisc;
      }, 0);

      const tax = lines.reduce((acc, l) => {
        const gross = fromMinor(l.unitMinor) * l.qty;
        const afterDisc = gross * (1 - l.discountPct / 100);
        return acc + (afterDisc * l.taxRatePct) / 100;
      }, 0);

      const total = subtotal + tax;

      // Line 1: 100.00 * 1 = 100.00 (no discount)
      // Line 2: 50.00 * 2 * 0.9 = 90.00 (10% discount)
      // Subtotal: 100.00 + 90.00 = 190.00
      // Tax: 100.00 * 0.25 + 90.00 * 0.25 = 25.00 + 22.50 = 47.50
      // Total: 190.00 + 47.50 = 237.50

      expect(subtotal).toBe(190);
      expect(tax).toBe(47.5);
      expect(total).toBe(237.5);
    });
  });

  describe("Money Conversion Precision", () => {
    it("should maintain precision through minor unit conversions", () => {
      const testCases = [
        { amount: 199.99, expectedMinor: 19999 },
        { amount: 0.01, expectedMinor: 1 },
        { amount: 1234.56, expectedMinor: 123456 },
        { amount: 0, expectedMinor: 0 },
      ];

      testCases.forEach(({ amount, expectedMinor }) => {
        const minor = toMinor(amount);
        const back = fromMinor(minor);

        expect(minor).toBe(expectedMinor);
        expect(back).toBe(amount);
      });
    });
  });
});
