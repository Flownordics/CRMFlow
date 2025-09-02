import { formatMoneyMinor } from "@/lib/money";
import { Card } from "@/components/ui/card";
import { ClipboardCheck, Package, Truck, Timer } from "lucide-react";
import { Order, OrderUI } from "@/services/orders";

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

    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Total orders</div>
                        <div className="text-h2">{totalCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            Value: {formatMoneyMinor(totalValueMinor, currency)}
                        </div>
                    </div>
                    <div className="rounded-full p-2 bg-primary/10">
                        <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/5 to-transparent" aria-hidden="true" />
            </Card>

            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Processing</div>
                        <div className="text-h2">{processingCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {processingCount > 0 ? `${Math.round((processingCount / totalCount) * 100)}% of total` : "No orders processing"}
                        </div>
                    </div>
                    <div className="rounded-full p-2 bg-accent/10">
                        <Package className="h-4 w-4 text-accent" aria-hidden="true" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-accent/5 to-transparent" aria-hidden="true" />
            </Card>

            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Shipped/Fulfilled</div>
                        <div className="text-h2">{shippedCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {fulfilmentRate}% fulfilment rate
                        </div>
                    </div>
                    <div className="rounded-full p-2 bg-success/10">
                        <Truck className="h-4 w-4 text-success" aria-hidden="true" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-success/5 to-transparent" aria-hidden="true" />
            </Card>

            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Due soon (7d)</div>
                        <div className="text-h2">{dueSoonCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {dueSoonCount > 0 ? `${dueSoonCount} orders need attention` : "All orders on track"}
                        </div>
                    </div>
                    <div className="rounded-full p-2 bg-warning/10">
                        <Timer className="h-4 w-4 text-warning" aria-hidden="true" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-warning/5 to-transparent" aria-hidden="true" />
            </Card>
        </div>
    );
}
