import { useMemo } from "react";
import { useCompanies } from "@/services/companies";
import { generateFriendlyCompanyRef } from "@/lib/friendlyNumbers";

/**
 * Hook for efficient company name lookup by ID
 * Fetches all companies once and provides a lookup function
 */
export function useCompanyLookup() {
    const { data: companiesData, isLoading, error } = useCompanies({ limit: 1000 });

    const companies = companiesData?.data || [];

    // Create a lookup map for O(1) access
    const companyMap = useMemo(() => {
        const map = new Map<string, string>();
        companies.forEach(company => {
            map.set(company.id, company.name);
        });
        return map;
    }, [companies]);

    // Function to get company name by ID
    const getCompanyName = (companyId: string | null | undefined): string => {
        if (!companyId) return "—";
        return companyMap.get(companyId) || generateFriendlyCompanyRef(companyId);
    };

    return {
        getCompanyName,
        isLoading,
        error,
        companies
    };
}
