import { Building2, Globe, Briefcase, Activity } from "lucide-react";
import { Company } from "@/lib/schemas/company";
import { EnhancedKpiCard, EnhancedKpiGrid } from "@/components/common/kpi/EnhancedKpiCard";
import { useCompaniesStats } from "@/services/companies";

interface CompaniesKpiHeaderProps {
    companies: Company[];
    total?: number; // Total count from backend (not just current page)
}

export function CompaniesKpiHeader({ companies, total }: CompaniesKpiHeaderProps) {
    // Fetch all companies stats for accurate KPI calculations
    const { data: allCompaniesStats, isLoading: statsLoading } = useCompaniesStats();
    
    // Use total from backend if provided, otherwise fall back to companies.length
    const totalCompanies = total ?? companies.length;

    if (statsLoading || companies.length === 0) {
        return (
            <EnhancedKpiGrid columns={4}>
                {[1, 2, 3, 4].map((i) => (
                    <EnhancedKpiCard
                        key={i}
                        title="Loading..."
                        value="..."
                        isLoading={true}
                    />
                ))}
            </EnhancedKpiGrid>
        );
    }

    // Use all companies stats for accurate counts (not just current page)
    const statsData = allCompaniesStats || companies;

    // Count by country from ALL companies
    const countryCounts = statsData.reduce((acc, company) => {
        const country = company.country || "Unknown";
        acc[country] = (acc[country] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topCountries = Object.entries(countryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

    // Count by industry from ALL companies
    const industryCounts = statsData.reduce((acc, company) => {
        const industry = company.industry || "Unknown";
        acc[industry] = (acc[industry] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topIndustries = Object.entries(industryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

    // Calculate activity status counts from ALL companies
    const greenCount = statsData.filter((c) => c.activityStatus === 'green').length;
    const yellowCount = statsData.filter((c) => c.activityStatus === 'yellow').length;
    const redCount = statsData.filter((c) => c.activityStatus === 'red').length;
    const activePercentage = totalCompanies > 0 ? (greenCount / totalCompanies) * 100 : 0;

    return (
        <EnhancedKpiGrid columns={4}>
            <EnhancedKpiCard
                title="Total Companies"
                value={totalCompanies}
                icon={Building2}
                iconColor="text-[#7a9db3]"
            />

            <EnhancedKpiCard
                title="Countries"
                value={Object.keys(countryCounts).length}
                subtitle={topCountries.length > 0 ? `Top: ${topCountries[0][0]} (${topCountries[0][1]})` : ''}
                icon={Globe}
                iconColor="text-[#7fa39b]"
            />

            <EnhancedKpiCard
                title="Industries"
                value={Object.keys(industryCounts).length}
                subtitle={topIndustries.length > 0 ? `Top: ${topIndustries[0][0]} (${topIndustries[0][1]})` : ''}
                icon={Briefcase}
                iconColor="text-[#c89882]"
            />

            <EnhancedKpiCard
                title="Active Engagement"
                value={`${activePercentage.toFixed(0)}%`}
                subtitle={`${greenCount} active companies`}
                icon={Activity}
                iconColor="text-[#6b7c5e]"
                progress={activePercentage}
                showProgress={true}
                progressLabel="Active"
                valueColor={
                    activePercentage >= 70
                        ? "text-[#6b7c5e]"
                        : activePercentage >= 40
                        ? "text-[#9d855e]"
                        : "text-[#b8695f]"
                }
            />
        </EnhancedKpiGrid>
    );
}
