import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash } from "lucide-react";
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
  labels?: Record<string, string>;
}) {
  return (
    <div className="overflow-auto">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[20%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[16%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[14%]" />
          <col className="w-[4%]" />
        </colgroup>
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">{labels.description}</th>
            <th className="p-2">{labels.sku}</th>
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
            const { totalMinor } = computeLineTotals({
              qty: l.qty,
              unitMinor: l.unitMinor,
              discountPct: l.discountPct,
              taxRatePct: l.taxRatePct,
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
                <td className="p-2">
                  <Input
                    defaultValue={l.sku ?? ""}
                    onBlur={(e) =>
                      onPatch(l.id, { sku: e.target.value || null })
                    }
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={l.qty}
                    onBlur={(e) =>
                      onPatch(l.id, { qty: Number(e.target.value) })
                    }
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={fromMinor(l.unitMinor)}
                    onBlur={(e) =>
                      onPatch(l.id, {
                        unitMinor: toMinor(Number(e.target.value || 0)),
                      })
                    }
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    defaultValue={l.discountPct ?? 0}
                    onBlur={(e) =>
                      onPatch(l.id, {
                        discountPct: Number(e.target.value || 0),
                      })
                    }
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    defaultValue={l.taxRatePct ?? 25}
                    onBlur={(e) =>
                      onPatch(l.id, { taxRatePct: Number(e.target.value || 0) })
                    }
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
