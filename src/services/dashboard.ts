import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { useCompanies } from "./companies";
import { useDeals } from "./deals";
import { useInvoices } from "./invoices";
import { useQuotes } from "./quotes";
import { useOrders } from "./orders";
import { usePeople } from "./people";
import { formatMoneyMinor } from "@/lib/money";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCompanyLookup } from "@/hooks/useCompanyLookup";
import { useStageLookup } from "@/hooks/useStageLookup";

// Dashboard metrics type
export interface DashboardMetrics {
    totalRevenue: number;
    totalRevenueChange: number;
    activeDeals: number;
    activeDealsChange: number;
    totalCompanies: number;
    totalCompaniesChange: number;
    totalContacts: number;
    totalContactsChange: number;
    totalQuotes: number;
    totalQuotesChange: number;
    totalOrders: number;
    totalOrdersChange: number;
    totalInvoices: number;
    totalInvoicesChange: number;
}

// Recent activity types
export interface RecentDeal {
    id: string;
    title: string;
    company_id: string;
    company_name: string;
    stage_id: string;
    stage_name: string;
    expected_value_minor: number;
    currency: string;
    probability: number;
    close_date: string | null;
    updated_at: string;
}

export interface RecentQuote {
    id: string;
    number: string | null;
    total_minor: number;
    currency: string;
    status: string;
    company_id: string;
    company_name: string;
    issue_date: string | null;
    valid_until: string | null;
    updated_at: string;
}

export interface RecentInvoice {
    id: string;
    number: string | null;
    total_minor: number;
    currency: string;
    status: string;
    company_id: string;
    company_name: string;
    issue_date: string | null;
    due_date: string | null;
    updated_at: string;
}

// Custom hook for dashboard data
export function useDashboardData() {
    const { user } = useAuthStore();

    // Fetch all the data we need
    const { data: companies, isLoading: companiesLoading } = useCompanies({ limit: 1000 });
    const { data: deals, isLoading: dealsLoading } = useDeals({ limit: 1000 });
    const { data: invoices, isLoading: invoicesLoading } = useInvoices({ limit: 1000 });
    const { data: quotes, isLoading: quotesLoading } = useQuotes({ limit: 1000 });
    const { data: orders, isLoading: ordersLoading } = useOrders({ limit: 1000 });
    const { data: people, isLoading: peopleLoading } = usePeople({ limit: 1000 });

    // Get lookup functions
    const { getCompanyName } = useCompanyLookup();
    const { getStageName } = useStageLookup();

    const isLoading = companiesLoading || dealsLoading || invoicesLoading || quotesLoading || ordersLoading || peopleLoading;

    // Calculate metrics
    const metrics: DashboardMetrics = {
        totalRevenue: 0,
        totalRevenueChange: 0,
        activeDeals: 0,
        activeDealsChange: 0,
        totalCompanies: companies?.data?.length || 0,
        totalCompaniesChange: 0, // TODO: Calculate change from previous period
        totalContacts: people?.data?.length || 0,
        totalContactsChange: 0, // TODO: Calculate change from previous period
        totalQuotes: quotes?.data?.length || 0,
        totalQuotesChange: 0, // TODO: Calculate change from previous period
        totalOrders: orders?.data?.length || 0,
        totalOrdersChange: 0, // TODO: Calculate change from previous period
        totalInvoices: invoices?.data?.length || 0,
        totalInvoicesChange: 0, // TODO: Calculate change from previous period
    };

    // Calculate revenue from paid invoices
    if (invoices?.data) {
        const paidInvoices = invoices.data.filter(invoice => invoice.status === 'paid');
        metrics.totalRevenue = paidInvoices.reduce((sum, invoice) => sum + invoice.total_minor, 0);
    }

    // Calculate active deals (deals that are not closed/won)
    if (deals?.data) {
        const activeDeals = deals.data.filter(deal => {
            const stageName = getStageName(deal.stage_id);
            return stageName !== 'Closed Won' && stageName !== 'Closed Lost';
        });
        metrics.activeDeals = activeDeals.length;
    }

    // Get recent deals (last 5)
    const recentDeals: RecentDeal[] = deals?.data?.slice(0, 5).map(deal => ({
        id: deal.id,
        title: deal.title,
        company_id: deal.company_id,
        company_name: getCompanyName(deal.company_id),
        stage_id: deal.stage_id,
        stage_name: getStageName(deal.stage_id),
        expected_value_minor: deal.expected_value_minor,
        currency: deal.currency,
        probability: deal.probability || 0,
        close_date: deal.close_date,
        updated_at: deal.updated_at,
    })) || [];

    // Get recent quotes (last 5)
    const recentQuotes: RecentQuote[] = quotes?.data?.slice(0, 5).map(quote => ({
        id: quote.id,
        number: quote.number,
        total_minor: quote.total_minor,
        currency: quote.currency || 'DKK',
        status: quote.status,
        company_id: quote.company_id || '',
        company_name: getCompanyName(quote.company_id),
        issue_date: quote.issue_date,
        valid_until: quote.valid_until,
        updated_at: quote.updated_at,
    })) || [];

    // Get recent invoices (last 5)
    const recentInvoices: RecentInvoice[] = invoices?.data?.slice(0, 5).map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        total_minor: invoice.total_minor,
        currency: invoice.currency || 'DKK',
        status: invoice.status,
        company_id: invoice.company_id || '',
        company_name: getCompanyName(invoice.company_id),
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        updated_at: invoice.updated_at,
    })) || [];

    return {
        metrics,
        recentDeals,
        recentQuotes,
        recentInvoices,
        isLoading,
        user,
    };
}

// Helper function to format currency for display
export function formatCurrency(amount: number, currency: string = 'DKK'): string {
    return formatMoneyMinor(amount, currency);
}

// Helper function to calculate percentage change (placeholder for now)
export function calculateChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
}
