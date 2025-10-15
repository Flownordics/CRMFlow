import { formatMoneyMinor } from "@/lib/money";
import { ClipboardCheck, Package, Truck, Timer } from "lucide-react";
import { Order, OrderUI } from "@/services/orders";
import { EnhancedKpiCard, EnhancedKpiGrid } from "@/components/common/kpi/EnhancedKpiCard";

interface OrdersKpiHeaderProps {
    orders: OrderUI[];
    currency?: string;
}

export function OrdersKpiHeader({ orders, currency = "DKK" }: OrdersKpiHeaderProps) {
    const totalCount = orders.length;
    const totalValueMinor = orders.reduce((sum, o) => sum + (o.totalMinor || 0), 0);

    const byStatus = orders.reduce((acc, o) => {
        const status = o.status || "draft";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const confirmedCount = byStatus.confirmed || 0;
    const processingCount = byStatus.processing || 0;
    const shippedCount = (byStatus.shipped || 0) + (byStatus.fulfilled || 0);
    const fulfilmentRate = totalCount > 0 ? Math.round((shippedCount / totalCount) * 100) : 0;

    // Calculate due soon (orders with delivery date within 7 days)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueSoonCount = orders.filter(o => {
        if (!o.order_date) return false;
        const deliveryDate = new Date(o.order_date);
        return deliveryDate <= sevenDaysFromNow && deliveryDate >= now;
    }).length;

    const processingPercentage = totalCount > 0 ? ((processingCount / totalCount) * 100) : 0;

    return (
        <EnhancedKpiGrid columns={4}>
            <EnhancedKpiCard
                title="Total Orders"
                value={totalCount}
                subtitle={formatMoneyMinor(totalValueMinor, currency)}
                icon={ClipboardCheck}
            />

            <EnhancedKpiCard
                title="Processing"
                value={processingCount}
                icon={Package}
                progress={processingPercentage}
                showProgress={true}
                progressLabel="In Process"
            />

            <EnhancedKpiCard
                title="Fulfilment Rate"
                value={`${fulfilmentRate}%`}
                subtitle={`${shippedCount} shipped/fulfilled`}
                icon={Truck}
                progress={fulfilmentRate}
                showProgress={true}
                progressLabel="Fulfilled"
                valueColor={
                    fulfilmentRate >= 80 ? "text-[#6b7c5e]" :
                    fulfilmentRate >= 50 ? "text-[#d4a574]" :
                    "text-[#b8695f]"
                }
            />

            <EnhancedKpiCard
                title="Due Soon"
                value={dueSoonCount}
                subtitle={dueSoonCount > 0 ? "need attention" : "All on track"}
                icon={Timer}
                valueColor={dueSoonCount > 0 ? "text-[#b8695f]" : undefined}
            />
        </EnhancedKpiGrid>
    );
}
