import { getOrderStatusTheme, statusTokenBg, statusTokenText } from "./statusTheme";
import { cn } from "@/lib/utils";

interface OrdersStatusFiltersProps {
    activeFilter: string;
    onFilterChange: (status: string) => void;
    counts: Record<string, number>;
}

export function OrdersStatusFilters({ activeFilter, onFilterChange, counts }: OrdersStatusFiltersProps) {
    const statuses = ["all", "draft", "accepted", "cancelled", "backorder", "invoiced"] as const;

    return (
        <div className="flex flex-wrap items-center gap-2">
            {statuses.map((status) => {
                const isActive = activeFilter === status;
                const count = status === "all" ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[status] || 0;

                if (status === "all") {
                    return (
                        <button
                            key={status}
                            type="button"
                            onClick={() => onFilterChange(status)}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-card hover:shadow-card transition",
                                isActive && "ring-2 ring-primary/30 border-primary/50"
                            )}
                            role="button"
                            aria-pressed={isActive ? "true" : "false"}
                        >
                            <span className="font-medium">All</span>
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium">
                                {count}
                            </span>
                        </button>
                    );
                }

                const theme = getOrderStatusTheme(status);
                const Icon = theme.icon;

                return (
                    <button
                        key={status}
                        type="button"
                        onClick={() => onFilterChange(status)}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-card hover:shadow-card transition",
                            isActive && "ring-2 ring-primary/30 border-primary/50",
                            !isActive && "hover:border-muted-foreground/20"
                        )}
                        role="button"
                        aria-pressed={isActive ? "true" : "false"}
                    >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="capitalize">{status}</span>
                        <span className={cn(
                            "rounded-full px-1.5 py-0.5 text-xs font-medium",
                            statusTokenBg(theme.color),
                            statusTokenText(theme.color)
                        )}>
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
