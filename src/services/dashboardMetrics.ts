import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { useCompanies } from "./companies";
import { useDeals } from "./deals";
import { useInvoices } from "./invoices";
import { useQuotes } from "./quotes";
import { useOrders } from "./orders";
import { useStageLookup } from "@/hooks/useStageLookup";
import { differenceInDays, startOfWeek, endOfWeek, isAfter, isBefore, parseISO } from "date-fns";

export interface EnhancedDashboardMetrics {
  // Sales Metrics
  totalRevenue: number;
  totalQuotesValue: number;
  totalOrdersValue: number;
  activePipelineValue: number;
  averageDealSize: number;
  winRate: number;
  salesCycleAvg: number;
  
  // Financial Metrics
  outstandingInvoices: number;
  overdueInvoices: number;
  overdueInvoicesCount: number;
  paidInvoicesThisMonth: number;
  
  // Deal Metrics
  activeDeals: number;
  wonDeals: number;
  lostDeals: number;
  dealsClosingThisWeek: number;
  staleDeals: number; // No activity > 30 days
  
  // Quote/Order Metrics
  totalQuotes: number;
  totalOrders: number;
  quoteToOrderConversion: number;
  
  // Activity Metrics
  companiesNeedingAttention: number; // Red/yellow status
  quotesExpiringSoon: number;
}

export function useEnhancedDashboardMetrics(dateRange?: { from: Date; to: Date }) {
  const { data: companies } = useCompanies({ limit: 5000 });
  const { data: deals } = useDeals({ limit: 5000 });
  const { data: invoices } = useInvoices({ limit: 5000 });
  const { data: quotes } = useQuotes({ limit: 5000 });
  const { data: orders } = useOrders({ limit: 5000 });
  const { getStageName } = useStageLookup();

  return useQuery({
    queryKey: ['enhanced-dashboard-metrics', dateRange],
    queryFn: () => {
      const metrics: EnhancedDashboardMetrics = {
        totalRevenue: 0,
        totalQuotesValue: 0,
        totalOrdersValue: 0,
        activePipelineValue: 0,
        averageDealSize: 0,
        winRate: 0,
        salesCycleAvg: 0,
        outstandingInvoices: 0,
        overdueInvoices: 0,
        overdueInvoicesCount: 0,
        paidInvoicesThisMonth: 0,
        activeDeals: 0,
        wonDeals: 0,
        lostDeals: 0,
        dealsClosingThisWeek: 0,
        staleDeals: 0,
        companiesNeedingAttention: 0,
        quotesExpiringSoon: 0,
        totalQuotes: quotes?.data?.length || 0,
        totalOrders: orders?.data?.length || 0,
        quoteToOrderConversion: 0,
      };

      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      // Calculate revenue from paid invoices
      if (invoices?.data) {
        const paidInvoices = invoices.data.filter(inv => inv.status === 'paid');
        metrics.totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total_minor, 0);
        
        // Outstanding invoices
        const unpaidInvoices = invoices.data.filter(
          inv => inv.status !== 'paid' && inv.status !== 'cancelled'
        );
        metrics.outstandingInvoices = unpaidInvoices.reduce((sum, inv) => sum + inv.total_minor, 0);
        
        // Overdue invoices
        const overdueInvoices = invoices.data.filter(inv => {
          if (inv.status === 'paid' || !inv.due_date) return false;
          return isAfter(now, parseISO(inv.due_date));
        });
        metrics.overdueInvoices = overdueInvoices.reduce((sum, inv) => sum + inv.total_minor, 0);
        metrics.overdueInvoicesCount = overdueInvoices.length;
      }

      // Deal metrics
      if (deals?.data) {
        const wonDeals = deals.data.filter(deal => {
          const stageName = getStageName(deal.stage_id);
          return stageName?.toLowerCase().includes('won') || stageName?.toLowerCase().includes('closed won');
        });
        
        const lostDeals = deals.data.filter(deal => {
          const stageName = getStageName(deal.stage_id);
          return stageName?.toLowerCase().includes('lost') || stageName?.toLowerCase().includes('closed lost');
        });
        
        const activeDeals = deals.data.filter(deal => {
          const stageName = getStageName(deal.stage_id);
          return !stageName?.toLowerCase().includes('won') && !stageName?.toLowerCase().includes('lost');
        });

        metrics.wonDeals = wonDeals.length;
        metrics.lostDeals = lostDeals.length;
        metrics.activeDeals = activeDeals.length;
        metrics.activePipelineValue = activeDeals.reduce((sum, deal) => sum + deal.expected_value_minor, 0);
        
        // Win rate
        const closedDeals = wonDeals.length + lostDeals.length;
        metrics.winRate = closedDeals > 0 ? (wonDeals.length / closedDeals) * 100 : 0;
        
        // Average deal size (won deals)
        metrics.averageDealSize = wonDeals.length > 0 
          ? wonDeals.reduce((sum, deal) => sum + deal.expected_value_minor, 0) / wonDeals.length
          : 0;
        
        // Deals closing this week
        metrics.dealsClosingThisWeek = deals.data.filter(deal => {
          if (!deal.close_date) return false;
          const closeDate = parseISO(deal.close_date);
          return isAfter(closeDate, weekStart) && isBefore(closeDate, weekEnd);
        }).length;
        
        // Stale deals (no updated_at > 30 days)
        metrics.staleDeals = activeDeals.filter(deal => {
          if (!deal.updated_at) return false;
          const daysSinceUpdate = differenceInDays(now, parseISO(deal.updated_at));
          return daysSinceUpdate > 30;
        }).length;
        
        // Sales cycle average (won deals only)
        const wonDealsWithDates = wonDeals.filter(deal => deal.created_at && deal.updated_at);
        if (wonDealsWithDates.length > 0) {
          const totalDays = wonDealsWithDates.reduce((sum, deal) => {
            return sum + differenceInDays(parseISO(deal.updated_at), parseISO(deal.created_at));
          }, 0);
          metrics.salesCycleAvg = Math.round(totalDays / wonDealsWithDates.length);
        }
      }

      // Quote metrics
      if (quotes?.data) {
        const activeQuotes = quotes.data.filter(q => q.status !== 'declined' && q.status !== 'expired');
        metrics.totalQuotesValue = activeQuotes.reduce((sum, q) => sum + q.total_minor, 0);
        
        // Quotes expiring soon (within 7 days)
        metrics.quotesExpiringSoon = quotes.data.filter(q => {
          if (!q.valid_until || q.status !== 'sent') return false;
          const validUntil = parseISO(q.valid_until);
          const daysUntilExpiry = differenceInDays(validUntil, now);
          return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
        }).length;
      }

      // Order metrics
      if (orders?.data) {
        metrics.totalOrdersValue = orders.data.reduce((sum, o) => sum + o.total_minor, 0);
      }

      // Quote to order conversion
      if (metrics.totalQuotes > 0) {
        metrics.quoteToOrderConversion = (metrics.totalOrders / metrics.totalQuotes) * 100;
      }

      // Companies needing attention
      if (companies?.data) {
        metrics.companiesNeedingAttention = companies.data.filter(c => 
          c.activityStatus === 'red' || c.activityStatus === 'yellow'
        ).length;
      }

      return metrics;
    },
    enabled: !!deals && !!invoices && !!quotes && !!orders && !!companies,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

