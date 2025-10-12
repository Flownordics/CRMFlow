import { formatMoneyMinor } from "@/lib/money";
import { Card } from "@/components/ui/card";
import { Coins, CheckCircle2, AlertTriangle, CalendarClock } from "lucide-react";
import { Invoice } from "@/services/invoices";
import { useI18n } from "@/lib/i18n";

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

    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Total Billed</div>
                        <div className="text-2xl font-bold">{formatMoneyMinor(totalBilled, currency)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <div className="rounded-full p-2 bg-primary/10">
                        <Coins className="h-4 w-4 text-primary" aria-hidden="true" focusable="false" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/5 to-transparent" aria-hidden="true" />
            </Card>

            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Paid</div>
                        <div className="text-2xl font-bold">{formatMoneyMinor(totalPaid, currency)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {invoices.filter(inv => inv.status === "paid").length} invoice{invoices.filter(inv => inv.status === "paid").length !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <div className="rounded-full p-2 bg-success/10">
                        <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" focusable="false" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-success/5 to-transparent" aria-hidden="true" />
            </Card>

            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Overdue</div>
                        <div className="text-2xl font-bold">{formatMoneyMinor(totalOverdue, currency)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {invoices.filter(inv => inv.status === "overdue").length} invoice{invoices.filter(inv => inv.status === "overdue").length !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <div className="rounded-full p-2 bg-danger/10">
                        <AlertTriangle className="h-4 w-4 text-danger" aria-hidden="true" focusable="false" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-danger/5 to-transparent" aria-hidden="true" />
            </Card>

            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Due Soon</div>
                        <div className="text-2xl font-bold">{formatMoneyMinor(totalDueSoon, currency)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {dueSoon.length} invoice{dueSoon.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <div className="rounded-full p-2 bg-warning/10">
                        <CalendarClock className="h-4 w-4 text-warning" aria-hidden="true" focusable="false" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-warning/5 to-transparent" aria-hidden="true" />
            </Card>
        </div>
    );
}
