import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { getAccountingSummary, listOverdueInvoices, listRecentlyUpdatedInvoices } from "@/services/accounting";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountingKpis } from "@/components/accounting/AccountingKpis";
import { OverdueInvoicesCard } from "@/components/accounting/OverdueInvoicesCard";
import { RecentInvoicesCard } from "@/components/accounting/RecentInvoicesCard";

export default function AccountingPage() {
  const currency = "DKK"; // TODO: hent fra workspace_settings hvis muligt
  
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

  if (summaryQ.isLoading || overdueQ.isLoading || recentQ.isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted/30 rounded w-1/4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted/30 rounded-2xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 bg-muted/30 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (summaryQ.error || overdueQ.error || recentQ.error) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Error loading accounting data</h2>
          <p className="text-muted-foreground mt-2">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader
        title="Accounting"
        subtitle="Overview of receivables and payments."
      />
      
      <div className="h-0.5 w-full bg-gradient-to-r from-primary/30 via-accent/30 to-transparent rounded-full" aria-hidden="true" />

      {/* KPI CARDS */}
      <AccountingKpis summary={summaryQ.data} currency={currency} />

      {/* LISTS */}
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
