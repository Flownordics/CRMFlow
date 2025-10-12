import { Card } from "@/components/ui/card";
import { Company } from "@/lib/schemas/company";
import { getIndustryTheme, industryTokenBg, industryTokenText, industryTokenRing } from "./industryTheme";
import { cn } from "@/lib/utils";
import { ActivityStatusBadge } from "./ActivityStatusBadge";
import { ActivityStatus } from "@/lib/schemas/callList";

interface CompanyCardProps {
    company: Company;
    onClick?: () => void;
    className?: string;
}

export function CompanyCard({ company, onClick, className }: CompanyCardProps) {
    const theme = getIndustryTheme(company.industry);
    const Icon = theme.icon;

    return (
        <Card
            className={cn(
                "p-4 rounded-2xl border bg-card shadow-card hover:shadow-hover transition-all duration-200 cursor-pointer group",
                industryTokenRing(theme.color),
                "hover:scale-[1.02] hover:-translate-y-1",
                className
            )}
            onClick={onClick}
        >
            <div className="flex items-center gap-2 mb-3">
                <div
                    className={cn("w-1.5 h-8 rounded-sm", industryTokenBg(theme.color))}
                    aria-hidden="true"
                />
                <Icon
                    className={cn("h-4 w-4", industryTokenText(theme.color))}
                    aria-hidden="true"
                />
                <h3 className="font-medium truncate flex-1">{company.name}</h3>
                <ActivityStatusBadge 
                    status={company.activityStatus as ActivityStatus} 
                    lastActivityAt={company.lastActivityAt}
                />
            </div>

            <div className="space-y-2">
                {company.industry && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/30" aria-hidden="true" />
                        {company.industry}
                    </div>
                )}

                {(company.city || company.country) && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" aria-hidden="true" />
                        {[company.city, company.country].filter(Boolean).join(", ")}
                    </div>
                )}

                {company.domain && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50" aria-hidden="true" />
                        {company.domain}
                    </div>
                )}
            </div>

            {/* Subtle hover effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent via-transparent to-transparent group-hover:to-white/5 transition-all duration-300 pointer-events-none" aria-hidden="true" />
        </Card>
    );
}
