import { cn } from "@/lib/utils";
import { Mail, Phone, User2, Briefcase, ShieldCheck, Rocket } from "lucide-react";

interface PeopleFiltersProps {
    filters: {
        hasEmail: boolean;
        hasPhone: boolean;
        role: string | null;
    };
    onFilterChange: (filter: "hasEmail" | "hasPhone" | "role", value: boolean | string | null) => void;
}

const roleOptions = [
    { key: "ceo", label: "CEO", icon: ShieldCheck },
    { key: "cto", label: "CTO", icon: Rocket },
    { key: "manager", label: "Manager", icon: User2 },
    { key: "sales", label: "Sales", icon: Briefcase },
];

export function PeopleFilters({ filters, onFilterChange }: PeopleFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Has Email Filter */}
            <button
                type="button"
                className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-card hover:shadow-card transition",
                    filters.hasEmail && "ring-2 ring-success/30 border-success/30"
                )}
                role="button"
                aria-pressed={filters.hasEmail ? "true" : "false"}
                onClick={() => onFilterChange("hasEmail", !filters.hasEmail)}
                aria-label="Filter people with email"
            >
                <Mail className="h-3 w-3" aria-hidden="true" />
                Has email
            </button>

            {/* Has Phone Filter */}
            <button
                type="button"
                className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-card hover:shadow-card transition",
                    filters.hasPhone && "ring-2 ring-accent/30 border-accent/30"
                )}
                role="button"
                aria-pressed={filters.hasPhone ? "true" : "false"}
                onClick={() => onFilterChange("hasPhone", !filters.hasPhone)}
                aria-label="Filter people with phone"
            >
                <Phone className="h-3 w-3" aria-hidden="true" />
                Has phone
            </button>

            {/* Role Filters */}
            {roleOptions.map((role) => {
                const isActive = filters.role === role.key;
                return (
                    <button
                        key={role.key}
                        type="button"
                        className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-card hover:shadow-card transition",
                            isActive && "ring-2 ring-primary/30 border-primary/30"
                        )}
                        role="button"
                        aria-pressed={isActive ? "true" : "false"}
                        onClick={() => onFilterChange("role", isActive ? null : role.key)}
                        aria-label={`Filter by role: ${role.label}`}
                    >
                        <role.icon className="h-3 w-3" aria-hidden="true" />
                        {role.label}
                    </button>
                );
            })}

            {/* Clear All Filters */}
            {(filters.hasEmail || filters.hasPhone || filters.role) && (
                <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-card hover:shadow-card transition text-muted-foreground"
                    onClick={() => {
                        onFilterChange("hasEmail", false);
                        onFilterChange("hasPhone", false);
                        onFilterChange("role", null);
                    }}
                    aria-label="Clear all filters"
                >
                    Clear all
                </button>
            )}
        </div>
    );
}
