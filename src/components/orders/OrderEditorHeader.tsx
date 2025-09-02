import { Button } from "@/components/ui/button";
import { getOrderStatusTheme, statusTokenBg, statusTokenText } from "./statusTheme";
import { formatMoneyMinor } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Order, OrderUI } from "@/services/orders";
import { useCompanyLookup } from "@/hooks/useCompanyLookup";
import { generateFriendlyNumber } from "@/lib/friendlyNumbers";

interface OrderEditorHeaderProps {
    order: OrderUI;
    onOpenPdf?: () => void;
    onConvertToInvoice?: () => void;
    onMarkFulfilled?: () => void;
}

export function OrderEditorHeader({
    order,
    onOpenPdf,
    onConvertToInvoice,
    onMarkFulfilled
}: OrderEditorHeaderProps) {
    const { getCompanyName } = useCompanyLookup();
    const theme = getOrderStatusTheme(order.status);
    const Icon = theme.icon;

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3 shadow-card">
            <div className="flex items-center gap-2 min-w-0">
                <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                    statusTokenBg(theme.color),
                    statusTokenText(theme.color)
                )}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {order.status || "draft"}
                </span>
                <div className="font-medium truncate">
                    {order.number ?? generateFriendlyNumber(order.id, 'order')}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                    {getCompanyName(order.company_id)}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="text-right mr-3">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="font-medium">
                        {formatMoneyMinor(order.totalMinor, order.currency || "DKK")}
                    </div>
                </div>

                <Button variant="outline" onClick={onOpenPdf} aria-label="Open PDF">
                    PDF
                </Button>
                <Button variant="secondary" onClick={onConvertToInvoice} aria-label="Convert to invoice">
                    Convert
                </Button>
                <Button onClick={onMarkFulfilled} aria-label="Mark as fulfilled">
                    Fulfilled
                </Button>
            </div>
        </div>
    );
}
