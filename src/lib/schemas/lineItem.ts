import { z } from "zod";

export const LineItem = z.object({
  id: z.string(),
  sku: z.string().nullable().optional(),
  description: z.string(),
  qty: z.number(), // 1.00
  unitMinor: z.number().int().nonnegative(), // i minor units
  taxRatePct: z.number().default(25),
  discountPct: z.number().default(0),
});
export type LineItem = z.infer<typeof LineItem>;
