import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => ReactNode;
  className?: string;
  mobileLabel?: string; // Label to show in mobile card view
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  getRowKey: (item: T) => string | number;
  emptyMessage?: string;
  className?: string;
}

/**
 * Responsive table component that adapts to screen size
 * - Mobile: Card view (stacked)
 * - Tablet: Horizontal scroll
 * - Desktop: Full table
 */
export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  getRowKey,
  emptyMessage = "No data available",
  className,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Mobile: Card view
  if (isMobile) {
    return (
      <div className={cn("space-y-3", className)}>
        {data.map((item) => (
          <Card
            key={getRowKey(item)}
            className={cn(
              "cursor-pointer hover:shadow-md transition-shadow",
              onRowClick && "active:scale-[0.98]"
            )}
            onClick={() => onRowClick?.(item)}
          >
            <CardContent className="p-4">
              <div className="space-y-2">
                {columns.map((column) => {
                  const value = column.render
                    ? column.render(item)
                    : item[column.key as keyof T];

                  return (
                    <div
                      key={String(column.key)}
                      className="flex justify-between items-start gap-2"
                    >
                      <span className="text-xs text-muted-foreground font-medium min-w-[100px]">
                        {column.mobileLabel || column.label}
                      </span>
                      <div className="text-sm text-right flex-1">{value}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop/Tablet: Traditional table with horizontal scroll on tablet
  return (
    <div className={cn("overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0", className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn(
                  "text-left py-3 px-4 text-sm font-medium text-muted-foreground",
                  column.className
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={getRowKey(item)}
              onClick={() => onRowClick?.(item)}
              className={cn(
                "border-b transition-colors",
                onRowClick &&
                  "cursor-pointer hover:bg-muted/50 active:bg-muted"
              )}
            >
              {columns.map((column) => {
                const value = column.render
                  ? column.render(item)
                  : item[column.key as keyof T];

                return (
                  <td
                    key={String(column.key)}
                    className={cn("py-3 px-4 text-sm", column.className)}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

