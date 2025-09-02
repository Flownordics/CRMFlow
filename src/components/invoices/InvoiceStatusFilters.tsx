import { getInvoiceTheme, tokenBg, tokenText, tokenRing } from "./invoiceTheme";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface InvoiceStatusFiltersProps {
    activeFilter: string;
    onFilterChange: (status: string) => void;
    counts: Record<string, number>;
}

export function InvoiceStatusFilters({ activeFilter, onFilterChange, counts }: InvoiceStatusFiltersProps) {
    const { t } = useI18n();

    const filters = [
        { key: "all", label: t("common_all") },
        { key: "draft", label: t("draft") },
        { key: "sent", label: t("sent") },
        { key: "paid", label: t("paid") },
        { key: "overdue", label: t("overdue") },
    ];

    return (
        <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
                const isActive = activeFilter === filter.key;
                const count = filter.key === "all"
                    ? Object.values(counts).reduce((a, b) => a + b, 0)
                    : counts[filter.key] || 0;

                if (filter.key === "all") {
                    return (
                        <button
                            key={filter.key}
                            type="button"
                            onClick={() => onFilterChange(filter.key)}
                            aria-pressed={isActive}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-card hover:shadow-card transition",
                                isActive && "ring-2 ring-primary/30 border-primary/50"
                            )}
                        >
                            <span className="font-medium">{filter.label}</span>
                            <span className="text-muted-foreground">{count}</span>
                        </button>
                    );
                }

                const theme = getInvoiceTheme(filter.key);
                const Icon = theme.icon;

                return (
                    <button
                        key={filter.key}
                        type="button"
                        onClick={() => onFilterChange(filter.key)}
                        aria-pressed={isActive}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-card hover:shadow-card transition",
                            isActive && "ring-2",
                            tokenRing(theme.color)
                        )}
                    >
                        <span className={cn("h-2 w-2 rounded-full", tokenBg(theme.color), tokenText(theme.color))} aria-hidden="true" />
                        <span className="font-medium">{filter.label}</span>
                        {count > 0 && <span className="text-muted-foreground">{count}</span>}
                    </button>
                );
            })}
        </div>
    );
}
