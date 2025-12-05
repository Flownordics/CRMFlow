import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash } from "lucide-react";
import { useState, useEffect } from "react";
import {
  computeLineTotals,
  fromMinor,
  toMinor,
  formatMoneyMinor,
} from "@/lib/money";
import { LineItem } from "@/lib/schemas/lineItem";

type Line = LineItem;

export function LineItemsTable({
  currency,
  lines,
  onPatch,
  onDelete,
  showSku = true,
  labels = {
    description: "Description",
    sku: "SKU",
    qty: "Qty",
    unit: "Unit",
    discount_pct: "Discount %",
    tax_pct: "Tax %",
    line_total: "Line total",
  },
}: {
  currency: string;
  lines: Line[];
  onPatch: (lineId: string, patch: Partial<Line>) => void;
  onDelete: (lineId: string) => void;
  showSku?: boolean;
  labels?: Record<string, string>;
}) {
  // Track local input values for real-time total calculation
  const [localValues, setLocalValues] = useState<Record<string, {
    qty?: number;
    unit?: number;
    discountPct?: number;
    taxRatePct?: number;
  }>>({});

  const getLocalValue = (lineId: string, key: keyof Line, defaultValue: number): number => {
    return localValues[lineId]?.[key as keyof typeof localValues[string]] ?? defaultValue;
  };

  const setLocalValue = (lineId: string, key: keyof Line, value: number) => {
    setLocalValues(prev => ({
      ...prev,
      [lineId]: {
        ...prev[lineId],
        [key]: value
      }
    }));
  };

  // Clear local values when lines change (e.g., after server sync)
  useEffect(() => {
    // Only clear values for lines that no longer exist or have been updated
    setLocalValues(prev => {
      const next = { ...prev };
      const lineIds = new Set(lines.map(l => l.id));
      
      // Remove local values for lines that no longer exist
      Object.keys(next).forEach(lineId => {
        if (!lineIds.has(lineId)) {
          delete next[lineId];
        }
      });
      
      return next;
    });
  }, [lines.map(l => l.id).join(',')]);

  return (
    <div className="overflow-auto">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className={showSku ? "w-[20%]" : "w-[24%]"} />
          {showSku && <col className="w-[12%]" />}
          <col className={showSku ? "w-[10%]" : "w-[12%]"} />
          <col className={showSku ? "w-[16%]" : "w-[18%]"} />
          <col className={showSku ? "w-[12%]" : "w-[14%]"} />
          <col className={showSku ? "w-[12%]" : "w-[14%]"} />
          <col className={showSku ? "w-[14%]" : "w-[14%]"} />
          <col className="w-[4%]" />
        </colgroup>
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">{labels.description}</th>
            {showSku && <th className="p-2">{labels.sku}</th>}
            <th className="p-2">{labels.qty}</th>
            <th className="p-2">{labels.unit}</th>
            <th className="p-2">{labels.discount_pct}</th>
            <th className="p-2">{labels.tax_pct}</th>
            <th className="p-2">{labels.line_total}</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => {
            // Use local values if available, otherwise use line values
            const qty = getLocalValue(l.id, 'qty', l.qty);
            const unitMinor = getLocalValue(l.id, 'unit', Math.round(fromMinor(l.unitMinor) as number));
            const discountPct = getLocalValue(l.id, 'discountPct', l.discountPct ?? 0);
            const taxRatePct = getLocalValue(l.id, 'taxRatePct', l.taxRatePct ?? 25);
            
            // Calculate total using current values (local or line)
            const { totalMinor } = computeLineTotals({
              qty: qty,
              unitMinor: toMinor(unitMinor),
              discountPct: discountPct,
              taxRatePct: taxRatePct,
            });
            
            return (
              <tr key={l.id} className="border-b hover:bg-muted/30">
                <td className="p-2">
                  <Input
                    defaultValue={l.description}
                    onBlur={(e) =>
                      onPatch(l.id, { description: e.target.value })
                    }
                  />
                </td>
                {showSku && (
                  <td className="p-2">
                    <Input
                      defaultValue={l.sku ?? ""}
                      onBlur={(e) =>
                        onPatch(l.id, { sku: e.target.value || null })
                      }
                    />
                  </td>
                )}
                <td className="p-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={l.qty}
                    onChange={(e) => {
                      const value = Number(e.target.value || 0);
                      setLocalValue(l.id, 'qty', value);
                    }}
                    onBlur={(e) => {
                      const value = Number(e.target.value || 0);
                      setLocalValue(l.id, 'qty', value);
                      onPatch(l.id, { qty: value });
                      // Clear local value after save
                      setLocalValues(prev => {
                        const next = { ...prev };
                        if (next[l.id]) {
                          delete next[l.id].qty;
                          if (Object.keys(next[l.id]).length === 0) {
                            delete next[l.id];
                          }
                        }
                        return next;
                      });
                    }}
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    defaultValue={Math.round(fromMinor(l.unitMinor) as number)}
                    onChange={(e) => {
                      const value = Number(e.target.value || 0);
                      setLocalValue(l.id, 'unit', value);
                    }}
                    onBlur={(e) => {
                      const value = Number(e.target.value || 0);
                      setLocalValue(l.id, 'unit', value);
                      // Treat input as major currency units (not minor), so multiply by 100
                      onPatch(l.id, {
                        unitMinor: toMinor(value),
                      });
                      // Clear local value after save
                      setLocalValues(prev => {
                        const next = { ...prev };
                        if (next[l.id]) {
                          delete next[l.id].unit;
                          if (Object.keys(next[l.id]).length === 0) {
                            delete next[l.id];
                          }
                        }
                        return next;
                      });
                    }}
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    defaultValue={l.discountPct ?? 0}
                    onChange={(e) => {
                      const value = Number(e.target.value || 0);
                      setLocalValue(l.id, 'discountPct', value);
                    }}
                    onBlur={(e) => {
                      const value = Number(e.target.value || 0);
                      setLocalValue(l.id, 'discountPct', value);
                      onPatch(l.id, {
                        discountPct: value,
                      });
                      // Clear local value after save
                      setLocalValues(prev => {
                        const next = { ...prev };
                        if (next[l.id]) {
                          delete next[l.id].discountPct;
                          if (Object.keys(next[l.id]).length === 0) {
                            delete next[l.id];
                          }
                        }
                        return next;
                      });
                    }}
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    defaultValue={l.taxRatePct ?? 25}
                    onChange={(e) => {
                      const value = Number(e.target.value || 25);
                      setLocalValue(l.id, 'taxRatePct', value);
                    }}
                    onBlur={(e) => {
                      const value = Number(e.target.value || 25);
                      setLocalValue(l.id, 'taxRatePct', value);
                      onPatch(l.id, { taxRatePct: value });
                      // Clear local value after save
                      setLocalValues(prev => {
                        const next = { ...prev };
                        if (next[l.id]) {
                          delete next[l.id].taxRatePct;
                          if (Object.keys(next[l.id]).length === 0) {
                            delete next[l.id];
                          }
                        }
                        return next;
                      });
                    }}
                  />
                </td>
                <td className="p-2 font-medium">
                  {formatMoneyMinor(totalMinor, currency)}
                </td>
                <td className="p-2 text-right">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete line"
                        onClick={() => onDelete(l.id)}
                      >
                        <Trash
                          aria-hidden="true"
                          focusable="false"
                          className="h-4 w-4"
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete line</TooltipContent>
                  </Tooltip>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
