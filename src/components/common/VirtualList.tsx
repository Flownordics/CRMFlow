import { useRef, ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  estimateSize?: number;
  overscan?: number;
  className?: string;
  itemClassName?: string;
  getItemKey?: (item: T, index: number) => string | number;
}

/**
 * Virtual scrolling list component for optimal performance with large datasets
 * Uses @tanstack/react-virtual for efficient rendering
 * 
 * Only renders visible items + overscan buffer
 * Ideal for lists with > 50 items
 */
export function VirtualList<T>({
  items,
  renderItem,
  estimateSize = 80,
  overscan = 5,
  className = "h-[600px]",
  itemClassName,
  getItemKey,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  return (
    <div ref={parentRef} className={className} style={{ overflow: "auto" }}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          const key = getItemKey
            ? getItemKey(item, virtualItem.index)
            : virtualItem.key;

          return (
            <div
              key={key}
              className={itemClassName}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Example usage:
 * 
 * <VirtualList
 *   items={companies}
 *   estimateSize={80}
 *   getItemKey={(company) => company.id}
 *   renderItem={(company) => (
 *     <CompanyCard company={company} />
 *   )}
 *   className="h-[calc(100vh-200px)]"
 * />
 */

