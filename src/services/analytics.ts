import { useDeals } from "./deals";
import { useInvoices } from "./invoices";
import { useQuotes } from "./quotes";
import { useOrders } from "./orders";
import { useStageLookup } from "@/hooks/useStageLookup";
import { formatMoneyMinor } from "@/lib/money";

// Date range type
export interface DateRange {
    start: Date;
    end: Date;
}

// Revenue trend data point
export interface RevenueTrendPoint {
    date: string;
    revenue: number;
    deals: number;
    quotes: number;
    invoices: number;
}

// Deal pipeline stage data
export interface PipelineStageData {
    stageId: string;
    stageName: string;
    dealCount: number;
    totalValue: number;
    averageValue: number;
    conversionRate: number;
    winRate: number;
}

// Performance metrics
export interface PerformanceMetrics {
    totalRevenue: number;
    revenueGrowth: number;
    totalDeals: number;
    dealsGrowth: number;
    averageDealSize: number;
    averageDealSizeGrowth: number;
    winRate: number;
    winRateGrowth: number;
    averageSalesCycle: number;
    averageSalesCycleGrowth: number;
    quoteToOrderConversion: number;
    orderToInvoiceConversion: number;
    invoiceToPaymentConversion: number;
}

// KPI data
export interface KPIData {
    revenue: {
        current: number;
        previous: number;
        growth: number;
        target: number;
        progress: number;
    };
    deals: {
        current: number;
        previous: number;
        growth: number;
        target: number;
        progress: number;
    };
    winRate: {
        current: number;
        previous: number;
        growth: number;
        target: number;
        progress: number;
    };
    averageDealSize: {
        current: number;
        previous: number;
        growth: number;
        target: number;
        progress: number;
    };
}

// Analytics hook
export function useAnalytics(dateRange?: DateRange) {
    const { getStageName } = useStageLookup();

    // Fetch all data
    const { data: deals, isLoading: dealsLoading } = useDeals({ limit: 1000 });
    const { data: invoices, isLoading: invoicesLoading } = useInvoices({ limit: 1000 });
    const { data: quotes, isLoading: quotesLoading } = useQuotes({ limit: 1000 });
    const { data: orders, isLoading: ordersLoading } = useOrders({ limit: 1000 });

    const isLoading = dealsLoading || invoicesLoading || quotesLoading || ordersLoading;

    // Filter data by date range if provided
    const filterByDateRange = <T extends { created_at: string }>(data: T[]): T[] => {
        if (!dateRange) return data;
        return data.filter(item => {
            const itemDate = new Date(item.created_at);
            return itemDate >= dateRange.start && itemDate <= dateRange.end;
        });
    };

    // Calculate revenue trends
    const revenueTrends = (): RevenueTrendPoint[] => {
        const invoicesData = filterByDateRange(invoices?.data || []);
        const dealsData = filterByDateRange(deals?.data || []);
        const quotesData = filterByDateRange(quotes?.data || []);

        // Group by month
        const monthlyData = new Map<string, {
            revenue: number;
            deals: number;
            quotes: number;
            invoices: number;
        }>();

        // Process invoices for revenue
        invoicesData.forEach(invoice => {
            if (invoice.status === 'paid') {
                const month = new Date(invoice.created_at).toISOString().slice(0, 7);
                const current = monthlyData.get(month) || { revenue: 0, deals: 0, quotes: 0, invoices: 0 };
                current.revenue += invoice.total_minor;
                current.invoices += 1;
                monthlyData.set(month, current);
            }
        });

        // Process deals
        dealsData.forEach(deal => {
            const month = new Date(deal.created_at).toISOString().slice(0, 7);
            const current = monthlyData.get(month) || { revenue: 0, deals: 0, quotes: 0, invoices: 0 };
            current.deals += 1;
            monthlyData.set(month, current);
        });

        // Process quotes
        quotesData.forEach(quote => {
            const month = new Date(quote.created_at).toISOString().slice(0, 7);
            const current = monthlyData.get(month) || { revenue: 0, deals: 0, quotes: 0, invoices: 0 };
            current.quotes += 1;
            monthlyData.set(month, current);
        });

        // Convert to array and sort by date
        return Array.from(monthlyData.entries())
            .map(([date, data]) => ({
                date,
                revenue: data.revenue,
                deals: data.deals,
                quotes: data.quotes,
                invoices: data.invoices,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
    };

    // Calculate pipeline analysis
    const pipelineAnalysis = (): PipelineStageData[] => {
        const dealsData = deals?.data || [];
        const stages = new Map<string, {
            stageName: string;
            deals: any[];
        }>();

        // Group deals by stage
        dealsData.forEach(deal => {
            const stageName = getStageName(deal.stage_id);
            if (!stages.has(deal.stage_id)) {
                stages.set(deal.stage_id, {
                    stageName,
                    deals: []
                });
            }
            stages.get(deal.stage_id)!.deals.push(deal);
        });

        // Calculate metrics for each stage
        const stageData: PipelineStageData[] = [];
        let previousStageValue = 0;

        stages.forEach((stageInfo, stageId) => {
            const stageDeals = stageInfo.deals;
            const totalValue = stageDeals.reduce((sum, deal) => sum + deal.expected_value_minor, 0);
            const averageValue = stageDeals.length > 0 ? totalValue / stageDeals.length : 0;

            // Calculate conversion rate (deals that moved from previous stage)
            const conversionRate = previousStageValue > 0 ? (totalValue / previousStageValue) * 100 : 0;

            // Calculate win rate (deals that are closed won)
            const closedWonDeals = stageDeals.filter(deal =>
                getStageName(deal.stage_id).toLowerCase().includes('won') ||
                getStageName(deal.stage_id).toLowerCase().includes('closed won')
            );
            const winRate = stageDeals.length > 0 ? (closedWonDeals.length / stageDeals.length) * 100 : 0;

            stageData.push({
                stageId,
                stageName: stageInfo.stageName,
                dealCount: stageDeals.length,
                totalValue,
                averageValue,
                conversionRate,
                winRate,
            });

            previousStageValue = totalValue;
        });

        return stageData;
    };

    // Calculate performance metrics
    const performanceMetrics = (): PerformanceMetrics => {
        const dealsData = deals?.data || [];
        const invoicesData = invoices?.data || [];
        const quotesData = quotes?.data || [];
        const ordersData = orders?.data || [];

        // Current period metrics
        const currentPeriod = dateRange || {
            start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            end: new Date()
        };

        const currentDeals = filterByDateRange(dealsData);
        const currentInvoices = filterByDateRange(invoicesData);
        const currentQuotes = filterByDateRange(quotesData);
        const currentOrders = filterByDateRange(ordersData);

        // Previous period metrics (same length, previous period)
        const periodLength = currentPeriod.end.getTime() - currentPeriod.start.getTime();
        const previousPeriod = {
            start: new Date(currentPeriod.start.getTime() - periodLength),
            end: new Date(currentPeriod.end.getTime() - periodLength)
        };

        const previousDeals = dealsData.filter(deal => {
            const dealDate = new Date(deal.created_at);
            return dealDate >= previousPeriod.start && dealDate <= previousPeriod.end;
        });

        const previousInvoices = invoicesData.filter(invoice => {
            const invoiceDate = new Date(invoice.created_at);
            return invoiceDate >= previousPeriod.start && invoiceDate <= previousPeriod.end;
        });

        // Calculate metrics
        const totalRevenue = currentInvoices
            .filter(invoice => invoice.status === 'paid')
            .reduce((sum, invoice) => sum + invoice.total_minor, 0);

        const previousRevenue = previousInvoices
            .filter(invoice => invoice.status === 'paid')
            .reduce((sum, invoice) => sum + invoice.total_minor, 0);

        const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

        const totalDeals = currentDeals.length;
        const dealsGrowth = previousDeals.length > 0 ? ((totalDeals - previousDeals.length) / previousDeals.length) * 100 : 0;

        const averageDealSize = totalDeals > 0 ?
            currentDeals.reduce((sum, deal) => sum + deal.expected_value_minor, 0) / totalDeals : 0;

        const previousAverageDealSize = previousDeals.length > 0 ?
            previousDeals.reduce((sum, deal) => sum + deal.expected_value_minor, 0) / previousDeals.length : 0;

        const averageDealSizeGrowth = previousAverageDealSize > 0 ?
            ((averageDealSize - previousAverageDealSize) / previousAverageDealSize) * 100 : 0;

        // Win rate calculation
        const wonDeals = currentDeals.filter(deal =>
            getStageName(deal.stage_id).toLowerCase().includes('won') ||
            getStageName(deal.stage_id).toLowerCase().includes('closed won')
        );
        const winRate = totalDeals > 0 ? (wonDeals.length / totalDeals) * 100 : 0;

        const previousWonDeals = previousDeals.filter(deal =>
            getStageName(deal.stage_id).toLowerCase().includes('won') ||
            getStageName(deal.stage_id).toLowerCase().includes('closed won')
        );
        const previousWinRate = previousDeals.length > 0 ? (previousWonDeals.length / previousDeals.length) * 100 : 0;
        const winRateGrowth = previousWinRate > 0 ? ((winRate - previousWinRate) / previousWinRate) * 100 : 0;

        // Sales cycle calculation (simplified)
        const averageSalesCycle = 30; // Placeholder - would need close_date tracking
        const averageSalesCycleGrowth = 0; // Placeholder

        // Conversion rates
        const quoteToOrderConversion = currentQuotes.length > 0 ?
            (currentOrders.length / currentQuotes.length) * 100 : 0;

        const orderToInvoiceConversion = currentOrders.length > 0 ?
            (currentInvoices.length / currentOrders.length) * 100 : 0;

        const invoiceToPaymentConversion = currentInvoices.length > 0 ?
            (currentInvoices.filter(invoice => invoice.status === 'paid').length / currentInvoices.length) * 100 : 0;

        return {
            totalRevenue,
            revenueGrowth,
            totalDeals,
            dealsGrowth,
            averageDealSize,
            averageDealSizeGrowth,
            winRate,
            winRateGrowth,
            averageSalesCycle,
            averageSalesCycleGrowth,
            quoteToOrderConversion,
            orderToInvoiceConversion,
            invoiceToPaymentConversion,
        };
    };

    // Calculate KPIs
    const kpiData = (): KPIData => {
        const metrics = performanceMetrics();

        // Set targets (these could be configurable)
        const revenueTarget = 1000000; // 10,000 DKK in minor units
        const dealsTarget = 50;
        const winRateTarget = 25; // 25%
        const averageDealSizeTarget = 20000; // 200 DKK in minor units

        return {
            revenue: {
                current: metrics.totalRevenue,
                previous: metrics.totalRevenue / (1 + metrics.revenueGrowth / 100),
                growth: metrics.revenueGrowth,
                target: revenueTarget,
                progress: (metrics.totalRevenue / revenueTarget) * 100,
            },
            deals: {
                current: metrics.totalDeals,
                previous: metrics.totalDeals / (1 + metrics.dealsGrowth / 100),
                growth: metrics.dealsGrowth,
                target: dealsTarget,
                progress: (metrics.totalDeals / dealsTarget) * 100,
            },
            winRate: {
                current: metrics.winRate,
                previous: metrics.winRate / (1 + metrics.winRateGrowth / 100),
                growth: metrics.winRateGrowth,
                target: winRateTarget,
                progress: (metrics.winRate / winRateTarget) * 100,
            },
            averageDealSize: {
                current: metrics.averageDealSize,
                previous: metrics.averageDealSize / (1 + metrics.averageDealSizeGrowth / 100),
                growth: metrics.averageDealSizeGrowth,
                target: averageDealSizeTarget,
                progress: (metrics.averageDealSize / averageDealSizeTarget) * 100,
            },
        };
    };

    return {
        revenueTrends: revenueTrends(),
        pipelineAnalysis: pipelineAnalysis(),
        performanceMetrics: performanceMetrics(),
        kpiData: kpiData(),
        isLoading,
    };
}

// Helper function to format currency for display
export function formatCurrency(amount: number, currency: string = 'DKK'): string {
    return formatMoneyMinor(amount, currency);
}

// Helper function to format percentage
export function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
}

// Helper function to format growth
export function formatGrowth(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
}
