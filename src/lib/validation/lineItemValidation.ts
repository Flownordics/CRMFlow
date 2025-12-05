import { LineItem } from "@/lib/schemas/lineItem";
import { computeLineTotals } from "@/lib/money";

/**
 * Validation errors for line items
 */
export type LineItemValidationError = {
  field: keyof LineItem;
  message: string;
};

/**
 * Validates a line item and returns any errors
 */
export function validateLineItem(line: Partial<LineItem>): LineItemValidationError[] {
  const errors: LineItemValidationError[] = [];

  // Description is required
  if (!line.description || line.description.trim().length === 0) {
    errors.push({
      field: "description",
      message: "Description is required",
    });
  }

  // Quantity must be positive
  if (line.qty !== undefined) {
    if (line.qty < 0) {
      errors.push({
        field: "qty",
        message: "Quantity must be greater than or equal to 0",
      });
    }
    if (!Number.isFinite(line.qty)) {
      errors.push({
        field: "qty",
        message: "Quantity must be a valid number",
      });
    }
  }

  // Unit price must be non-negative
  if (line.unitMinor !== undefined) {
    if (line.unitMinor < 0) {
      errors.push({
        field: "unitMinor",
        message: "Unit price must be greater than or equal to 0",
      });
    }
    if (!Number.isFinite(line.unitMinor)) {
      errors.push({
        field: "unitMinor",
        message: "Unit price must be a valid number",
      });
    }
  }

  // Discount percentage must be between 0 and 100
  if (line.discountPct !== undefined) {
    if (line.discountPct < 0 || line.discountPct > 100) {
      errors.push({
        field: "discountPct",
        message: "Discount must be between 0 and 100",
      });
    }
    if (!Number.isFinite(line.discountPct)) {
      errors.push({
        field: "discountPct",
        message: "Discount must be a valid number",
      });
    }
  }

  // Tax rate percentage must be between 0 and 100
  if (line.taxRatePct !== undefined) {
    if (line.taxRatePct < 0 || line.taxRatePct > 100) {
      errors.push({
        field: "taxRatePct",
        message: "Tax rate must be between 0 and 100",
      });
    }
    if (!Number.isFinite(line.taxRatePct)) {
      errors.push({
        field: "taxRatePct",
        message: "Tax rate must be a valid number",
      });
    }
  }

  return errors;
}

/**
 * Validates a patch (partial update) to a line item
 */
export function validateLineItemPatch(
  patch: Partial<LineItem>,
  existingLine?: LineItem
): LineItemValidationError[] {
  // Merge patch with existing line for validation
  const mergedLine = existingLine ? { ...existingLine, ...patch } : patch;
  return validateLineItem(mergedLine);
}

/**
 * Computes and validates line totals
 */
export function computeAndValidateLineTotals(line: Partial<LineItem>): {
  totals: ReturnType<typeof computeLineTotals>;
  errors: LineItemValidationError[];
} {
  const errors = validateLineItem(line);

  // Only compute totals if we have the required fields
  if (
    line.qty !== undefined &&
    line.unitMinor !== undefined &&
    line.discountPct !== undefined &&
    line.taxRatePct !== undefined
  ) {
    try {
      const totals = computeLineTotals({
        qty: line.qty,
        unitMinor: line.unitMinor,
        discountPct: line.discountPct,
        taxRatePct: line.taxRatePct,
      });
      return { totals, errors };
    } catch (error) {
      errors.push({
        field: "qty",
        message: "Failed to compute line totals",
      });
      return {
        totals: {
          grossMinor: 0,
          afterDiscMinor: 0,
          taxMinor: 0,
          totalMinor: 0,
        },
        errors,
      };
    }
  }

  return {
    totals: {
      grossMinor: 0,
      afterDiscMinor: 0,
      taxMinor: 0,
      totalMinor: 0,
    },
    errors,
  };
}
