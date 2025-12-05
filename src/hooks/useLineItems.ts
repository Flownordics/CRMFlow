import { useState, useCallback, useMemo, useEffect } from "react";
import { LineItem } from "@/lib/schemas/lineItem";
import {
  validateLineItemPatch,
  computeAndValidateLineTotals,
  LineItemValidationError,
} from "@/lib/validation/lineItemValidation";
import { computeLineTotals } from "@/lib/money";
import { logger } from "@/lib/logger";

export type LineItemPatch = Partial<LineItem>;

export interface UseLineItemsOptions {
  /**
   * Initial lines to use
   */
  initialLines?: LineItem[];
  
  /**
   * Whether to enable optimistic updates
   */
  optimistic?: boolean;
  
  /**
   * Callback when a line is patched
   */
  onPatch?: (lineId: string, patch: LineItemPatch) => void | Promise<void>;
  
  /**
   * Callback when a line is deleted
   */
  onDelete?: (lineId: string) => void | Promise<void>;
  
  /**
   * Callback when validation errors occur
   */
  onValidationError?: (lineId: string, errors: LineItemValidationError[]) => void;
}

export interface UseLineItemsReturn {
  /**
   * Current lines
   */
  lines: LineItem[];
  
  /**
   * Patch a line item (with validation)
   */
  patchLine: (lineId: string, patch: LineItemPatch) => boolean;
  
  /**
   * Delete a line item
   */
  deleteLine: (lineId: string) => void;
  
  /**
   * Add a new line item
   */
  addLine: (line?: Partial<LineItem>) => string;
  
  /**
   * Get validation errors for a line
   */
  getErrors: (lineId: string) => LineItemValidationError[];
  
  /**
   * Check if a line has errors
   */
  hasErrors: (lineId: string) => boolean;
  
  /**
   * Computed totals for all lines
   */
  totals: {
    subtotal: number;
    tax: number;
    total: number;
  };
  
  /**
   * Update lines from external source (e.g., after server sync)
   */
  setLines: (lines: LineItem[]) => void;
  
  /**
   * Check if there are any pending changes
   */
  hasPendingChanges: boolean;
  
  /**
   * Reset pending changes tracking
   */
  resetPendingChanges: () => void;
}

/**
 * Hook for managing line items with validation and simplified callbacks
 * 
 * @example
 * ```tsx
 * const { lines, patchLine, deleteLine, totals } = useLineItems({
 *   initialLines: quote.lines,
 *   onPatch: async (lineId, patch) => {
 *     await upsertLine.mutateAsync({ id: lineId, ...patch });
 *   },
 *   onDelete: async (lineId) => {
 *     await deleteLine.mutateAsync(lineId);
 *   },
 * });
 * ```
 */
export function useLineItems(options: UseLineItemsOptions = {}): UseLineItemsReturn {
  const {
    initialLines = [],
    optimistic = true,
    onPatch,
    onDelete,
    onValidationError,
  } = options;

  const [lines, setLines] = useState<LineItem[]>(initialLines);
  const [errors, setErrors] = useState<Map<string, LineItemValidationError[]>>(new Map());
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());

  // Sync lines when initialLines change
  useEffect(() => {
    if (initialLines.length > 0 || lines.length === 0) {
      setLines(initialLines);
    }
  }, [initialLines]);

  /**
   * Patch a line item with validation
   */
  const patchLine = useCallback(
    (lineId: string, patch: LineItemPatch): boolean => {
      const existingLine = lines.find((l) => l.id === lineId);
      if (!existingLine) {
        logger.warn(`[useLineItems] Line ${lineId} not found`);
        return false;
      }

      // Validate the patch
      const validationErrors = validateLineItemPatch(patch, existingLine);
      
      if (validationErrors.length > 0) {
        setErrors((prev) => new Map(prev).set(lineId, validationErrors));
        onValidationError?.(lineId, validationErrors);
        return false;
      }

      // Clear errors for this line
      setErrors((prev) => {
        const next = new Map(prev);
        next.delete(lineId);
        return next;
      });

      // Compute totals if relevant fields changed
      const needsTotalUpdate =
        patch.qty !== undefined ||
        patch.unitMinor !== undefined ||
        patch.discountPct !== undefined ||
        patch.taxRatePct !== undefined;

      let updatedPatch = { ...patch };
      if (needsTotalUpdate) {
        const mergedLine = { ...existingLine, ...patch };
        const { totals: computedTotals } = computeAndValidateLineTotals(mergedLine);
        // Note: lineTotalMinor is computed on the server, but we can include it for optimistic updates
        updatedPatch = { ...updatedPatch };
      }

      // Optimistically update local state
      if (optimistic) {
        setLines((prev) =>
          prev.map((line) =>
            line.id === lineId ? { ...line, ...updatedPatch } : line
          )
        );
        setPendingChanges((prev) => new Set(prev).add(lineId));
      }

      // Call the onPatch callback
      if (onPatch) {
        try {
          const result = onPatch(lineId, updatedPatch);
          if (result instanceof Promise) {
            result.catch((error) => {
              logger.error(`[useLineItems] Failed to patch line ${lineId}:`, error);
              // Revert optimistic update on error
              if (optimistic) {
                setLines((prev) =>
                  prev.map((line) =>
                    line.id === lineId ? existingLine : line
                  )
                );
                setPendingChanges((prev) => {
                  const next = new Set(prev);
                  next.delete(lineId);
                  return next;
                });
              }
            });
          }
        } catch (error) {
          logger.error(`[useLineItems] Failed to patch line ${lineId}:`, error);
          if (optimistic) {
            setLines((prev) =>
              prev.map((line) => (line.id === lineId ? existingLine : line))
            );
          }
          return false;
        }
      }

      return true;
    },
    [lines, optimistic, onPatch, onValidationError]
  );

  /**
   * Delete a line item
   */
  const deleteLine = useCallback(
    (lineId: string) => {
      const existingLine = lines.find((l) => l.id === lineId);
      if (!existingLine) {
        logger.warn(`[useLineItems] Line ${lineId} not found for deletion`);
        return;
      }

      // Optimistically remove from local state
      if (optimistic) {
        setLines((prev) => prev.filter((line) => line.id !== lineId));
        setErrors((prev) => {
          const next = new Map(prev);
          next.delete(lineId);
          return next;
        });
        setPendingChanges((prev) => {
          const next = new Set(prev);
          next.delete(lineId);
          return next;
        });
      }

      // Call the onDelete callback
      if (onDelete) {
        try {
          const result = onDelete(lineId);
          if (result instanceof Promise) {
            result.catch((error) => {
              logger.error(`[useLineItems] Failed to delete line ${lineId}:`, error);
              // Revert optimistic update on error
              if (optimistic) {
                setLines((prev) => [...prev, existingLine].sort((a, b) => a.id.localeCompare(b.id)));
              }
            });
          }
        } catch (error) {
          logger.error(`[useLineItems] Failed to delete line ${lineId}:`, error);
          if (optimistic) {
            setLines((prev) => [...prev, existingLine].sort((a, b) => a.id.localeCompare(b.id)));
          }
        }
      }
    },
    [lines, optimistic, onDelete]
  );

  /**
   * Add a new line item
   */
  const addLine = useCallback(
    (line?: Partial<LineItem>): string => {
      const newLine: LineItem = {
        id: `temp_${Date.now()}_${Math.random()}`,
        description: line?.description || "",
        qty: line?.qty ?? 1,
        unitMinor: line?.unitMinor ?? 0,
        taxRatePct: line?.taxRatePct ?? 25,
        discountPct: line?.discountPct ?? 0,
        sku: line?.sku ?? null,
      };

      setLines((prev) => [...prev, newLine]);
      setPendingChanges((prev) => new Set(prev).add(newLine.id));

      return newLine.id;
    },
    []
  );

  /**
   * Get validation errors for a line
   */
  const getErrors = useCallback(
    (lineId: string): LineItemValidationError[] => {
      return errors.get(lineId) || [];
    },
    [errors]
  );

  /**
   * Check if a line has errors
   */
  const hasErrors = useCallback(
    (lineId: string): boolean => {
      return (errors.get(lineId)?.length ?? 0) > 0;
    },
    [errors]
  );

  /**
   * Compute totals for all lines
   */
  const totals = useMemo(() => {
    if (lines.length === 0) {
      return { subtotal: 0, tax: 0, total: 0 };
    }

    const subtotal = lines.reduce((acc, line) => {
      const { afterDiscMinor } = computeLineTotals({
        qty: line.qty,
        unitMinor: line.unitMinor,
        discountPct: line.discountPct,
        taxRatePct: line.taxRatePct,
      });
      return acc + afterDiscMinor;
    }, 0);

    const tax = lines.reduce((acc, line) => {
      const { taxMinor } = computeLineTotals({
        qty: line.qty,
        unitMinor: line.unitMinor,
        discountPct: line.discountPct,
        taxRatePct: line.taxRatePct,
      });
      return acc + taxMinor;
    }, 0);

    return {
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }, [lines]);

  /**
   * Reset pending changes tracking
   */
  const resetPendingChanges = useCallback(() => {
    setPendingChanges(new Set());
  }, []);

  return {
    lines,
    patchLine,
    deleteLine,
    addLine,
    getErrors,
    hasErrors,
    totals,
    setLines,
    hasPendingChanges: pendingChanges.size > 0,
    resetPendingChanges,
  };
}
