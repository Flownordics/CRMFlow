import { Card } from "@/components/ui/card";
import { Building2, Globe, Briefcase, Factory } from "lucide-react";
import { Company } from "@/lib/schemas/company";

interface CompaniesKpiHeaderProps {
    companies: Company[];
}

export function CompaniesKpiHeader({ companies }: CompaniesKpiHeaderProps) {
    const totalCompanies = companies.length;

    if (companies.length === 0) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-4 overflow-hidden relative">
                        <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                                <div className="h-3 bg-muted rounded w-20" />
                                <div className="h-6 bg-muted rounded w-16" />
                            </div>
                            <div className="rounded-full p-2 bg-muted w-8 h-8" />
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    // Count by country
    const countryCounts = companies.reduce((acc, company) => {
        const country = company.country || "Unknown";
        acc[country] = (acc[country] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topCountries = Object.entries(countryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

    // Count by industry
    const industryCounts = companies.reduce((acc, company) => {
        const industry = company.industry || "Unknown";
        acc[industry] = (acc[industry] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topIndustries = Object.entries(industryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Total Companies */}
            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Total companies</div>
                        <div className="text-h2">{totalCompanies}</div>
                    </div>
                    <div className="rounded-full p-2 bg-primary/10">
                        <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/5 to-transparent" aria-hidden="true" />
            </Card>

            {/* By Country */}
            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">By country</div>
                        <div className="text-h2">{Object.keys(countryCounts).length}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {topCountries.map(([country, count]) => (
                                <span key={country} className="inline-block mr-2">
                                    {country}: {count}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-full p-2 bg-accent/10">
                        <Globe className="h-4 w-4 text-accent" aria-hidden="true" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-accent/5 to-transparent" aria-hidden="true" />
            </Card>

            {/* By Industry */}
            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">By industry</div>
                        <div className="text-h2">{Object.keys(industryCounts).length}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {topIndustries.map(([industry, count]) => (
                                <span key={industry} className="inline-block mr-2">
                                    {industry}: {count}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-full p-2 bg-warning/10">
                        <Briefcase className="h-4 w-4 text-warning" aria-hidden="true" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-warning/5 to-transparent" aria-hidden="true" />
            </Card>
        </div>
    );
}
