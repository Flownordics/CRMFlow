import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { memo } from "react";

interface KanbanDroppableColumnProps {
    id: string;
    children: React.ReactNode;
    className?: string;
}

function KanbanDroppableColumnBase({
    id,
    children,
    className,
}: KanbanDroppableColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "rounded-2xl border bg-background shadow-card p-3 min-h-[200px] flex flex-col gap-2 transition-all duration-200",
                isOver && "bg-muted/40 border-primary/50 shadow-lg",
                className
            )}
            aria-live="polite"
            aria-label={`Drop zone for ${id.startsWith('col:') ? 'column' : 'item'}`}
        >
            {children}
        </div>
    );
}

// Export memoized version for better performance
export const KanbanDroppableColumn = memo(KanbanDroppableColumnBase);
