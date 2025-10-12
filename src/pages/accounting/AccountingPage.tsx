import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { getAccountingSummary, listOverdueInvoices, listRecentlyUpdatedInvoices, getDetailedAgingReport } from "@/services/accounting";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountingKpis } from "@/components/accounting/AccountingKpis";
import { OverdueInvoicesCard } from "@/components/accounting/OverdueInvoicesCard";
import { RecentInvoicesCard } from "@/components/accounting/RecentInvoicesCard";
import { PaymentHistoryCard } from "@/components/accounting/PaymentHistoryCard";
import { AgingReportCard } from "@/components/accounting/AgingReportCard";
import { PaymentTrendsChart } from "@/components/accounting/PaymentTrendsChart";
import { TopOutstandingCustomers } from "@/components/accounting/TopOutstandingCustomers";
import { useWorkspaceSettings } from "@/hooks/useSettings";
import { usePayments } from "@/services/payments";
import { useInvoices } from "@/services/invoices";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  exportInvoicesToCSV,
  exportPaymentsToCSV,
  exportAgingReportToCSV,
  exportAccountingSummaryToCSV,
} from "@/services/export/accountingExport";
import { useCompanyLookup } from "@/hooks/useCompanyLookup";
import { useToast } from "@/hooks/use-toast";

export default function AccountingPage() {
  const { toast } = useToast();
  const { getCompanyName, companies } = useCompanyLookup();
  
  // Get currency from workspace settings
  const { data: settings } = useWorkspaceSettings();
  const currency = settings?.default_currency || "DKK";
  
  const summaryQ = useQuery({ 
    queryKey: qk.accounting(), 
    queryFn: () => getAccountingSummary({}) 
  });
  
  const overdueQ = useQuery({ 
    queryKey: qk.overdueInvoices({limit:10, offset:0}), 
    queryFn: () => listOverdueInvoices({limit:10}) 
  });
  
  const recentQ = useQuery({ 
    queryKey: qk.recentInvoices({limit:10, offset:0}), 
    queryFn: () => listRecentlyUpdatedInvoices({limit:10}) 
  });

  const paymentsQ = useQuery({
    queryKey: qk.payments({ limit: 100 }),
    queryFn: () => import("@/services/payments").then(m => m.fetchPayments({ limit: 100 })),
  });

  const agingQ = useQuery({
    queryKey: ["accounting", "aging-report"],
    queryFn: getDetailedAgingReport,
  });

  const invoicesQ = useInvoices({ limit: 1000 });

  // Calculate top outstanding customers
  const topCustomers = useMemo(() => {
    if (!invoicesQ.data?.data) return [];

    const balancesByCompany = new Map<string, { balance_minor: number; invoice_count: number }>();

    invoicesQ.data.data.forEach((invoice) => {
      if (invoice.company_id && invoice.balance_minor > 0) {
        const existing = balancesByCompany.get(invoice.company_id);
        if (existing) {
          existing.balance_minor += invoice.balance_minor;
          existing.invoice_count++;
        } else {
          balancesByCompany.set(invoice.company_id, {
            balance_minor: invoice.balance_minor,
            invoice_count: 1,
          });
        }
      }
    });

    return Array.from(balancesByCompany.entries()).map(([company_id, data]) => ({
      company_id,
      ...data,
    }));
  }, [invoicesQ.data]);

  // Build company name map for exports
  const companyNameMap = useMemo(() => {
    const map = new Map<string, string>();
    companies.forEach((company) => {
      map.set(company.id, company.name);
    });
    return map;
  }, [companies]);

  // Export handlers
  const handleExportSummary = () => {
    if (!summaryQ.data) return;
    exportAccountingSummaryToCSV({
      outstanding: summaryQ.data.outstandingMinor,
      overdue: summaryQ.data.overdueMinor,
      paid: summaryQ.data.paidMinor,
      aging: summaryQ.data.aging,
      currency,
    });
    toast({
      title: "Export Complete",
      description: "Accounting summary has been exported to CSV.",
    });
  };

  const handleExportPayments = () => {
    if (!paymentsQ.data?.data) return;
    exportPaymentsToCSV(paymentsQ.data.data, companyNameMap);
    toast({
      title: "Export Complete",
      description: "Payment history has been exported to CSV.",
    });
  };

  const handleExportAging = () => {
    if (!agingQ.data) return;
    exportAgingReportToCSV(agingQ.data, companyNameMap, currency);
    toast({
      title: "Export Complete",
      description: "Aging report has been exported to CSV.",
    });
  };

  const handleExportInvoices = () => {
    if (!invoicesQ.data?.data) return;
    exportInvoicesToCSV(invoicesQ.data.data, companyNameMap);
    toast({
      title: "Export Complete",
      description: "Invoices have been exported to CSV.",
    });
  };

  const isLoading = summaryQ.isLoading || overdueQ.isLoading || recentQ.isLoading;
  const hasError = summaryQ.error || overdueQ.error || recentQ.error;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted/30 rounded w-1/4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted/30 rounded-2xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-muted/30 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Error loading accounting data</h2>
          <p className="text-muted-foreground mt-2">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Accounting"
        subtitle="Overview of receivables and payments."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportSummary}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Export Summary
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportInvoices}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Export Invoices
            </Button>
          </div>
        }
      />
      
      <div className="h-0.5 w-full bg-gradient-to-r from-primary/30 via-accent/30 to-transparent rounded-full" aria-hidden="true" />

      {/* Row 1: KPI CARDS */}
      <AccountingKpis summary={summaryQ.data} currency={currency} />

      {/* Row 2: Payment Trends + Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PaymentTrendsChart
          payments={paymentsQ.data?.data ?? []}
          currency={currency}
        />
        <TopOutstandingCustomers data={topCustomers} currency={currency} limit={5} />
      </div>

      {/* Row 3: Payment History + Aging Report */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PaymentHistoryCard payments={paymentsQ.data?.data ?? []} limit={10} />
        {agingQ.data && (
          <AgingReportCard buckets={agingQ.data} currency={currency} />
        )}
      </div>

      {/* Row 4: Overdue + Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OverdueInvoicesCard 
          invoices={overdueQ.data ?? []} 
          currency={currency} 
        />
        <RecentInvoicesCard 
          invoices={recentQ.data ?? []} 
          currency={currency} 
        />
      </div>
    </div>
  );
}
