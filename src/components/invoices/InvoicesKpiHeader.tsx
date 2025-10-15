import { formatMoneyMinor } from "@/lib/money";
import { Coins, CheckCircle2, AlertTriangle, CalendarClock } from "lucide-react";
import { Invoice } from "@/services/invoices";
import { useI18n } from "@/lib/i18n";
import { EnhancedKpiCard, EnhancedKpiGrid } from "@/components/common/kpi/EnhancedKpiCard";

interface InvoicesKpiHeaderProps {
    invoices: Invoice[];
    currency?: string;
}

export function InvoicesKpiHeader({ invoices, currency = "DKK" }: InvoicesKpiHeaderProps) {
    const { t } = useI18n();

    const totalBilled = invoices.reduce((sum, inv) => sum + (inv.total_minor || 0), 0);
    const totalPaid = invoices
        .filter(inv => inv.status === "paid")
        .reduce((sum, inv) => sum + (inv.total_minor || 0), 0);
    const totalOverdue = invoices
        .filter(inv => inv.status === "overdue")
        .reduce((sum, inv) => sum + (inv.total_minor || 0), 0);

    // Calculate due soon (≤7 days)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueSoon = invoices.filter(inv => {
        if (inv.status !== "sent" || !inv.due_date) return false;
        const dueDate = new Date(inv.due_date);
        return dueDate <= sevenDaysFromNow && dueDate > now;
    });
    const totalDueSoon = dueSoon.reduce((sum, inv) => sum + (inv.total_minor || 0), 0);

    const paidCount = invoices.filter(inv => inv.status === "paid").length;
    const overdueCount = invoices.filter(inv => inv.status === "overdue").length;
    const collectionRate = invoices.length > 0 ? ((paidCount / invoices.length) * 100) : 0;

    return (
        <EnhancedKpiGrid columns={4}>
            <EnhancedKpiCard
                title="Total Billed"
                value={formatMoneyMinor(totalBilled, currency)}
                subtitle={`${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`}
                icon={Coins}
            />

            <EnhancedKpiCard
                title="Paid"
                value={formatMoneyMinor(totalPaid, currency)}
                subtitle={`${paidCount} invoice${paidCount !== 1 ? 's' : ''}`}
                icon={CheckCircle2}
                progress={collectionRate}
                showProgress={true}
                progressLabel="Collection Rate"
                valueColor="text-[#6b7c5e]"
            />

            <EnhancedKpiCard
                title="Overdue"
                value={formatMoneyMinor(totalOverdue, currency)}
                subtitle={`${overdueCount} invoice${overdueCount !== 1 ? 's' : ''}`}
                icon={AlertTriangle}
                valueColor={totalOverdue > 0 ? "text-[#b8695f]" : undefined}
            />

            <EnhancedKpiCard
                title="Due Soon"
                value={formatMoneyMinor(totalDueSoon, currency)}
                subtitle={`${dueSoon.length} invoice${dueSoon.length !== 1 ? 's' : ''}`}
                icon={CalendarClock}
                valueColor={totalDueSoon > 0 ? "text-[#d4a574]" : undefined}
            />
        </EnhancedKpiGrid>
    );
}
