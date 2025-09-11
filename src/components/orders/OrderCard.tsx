import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getOrderStatusTheme, statusTokenBg, statusTokenText, statusTokenRing } from "./statusTheme";
import { formatMoneyMinor } from "@/lib/money";
import { cn } from "@/lib/utils";
import { FileDown, ExternalLink, FileSymlink } from "lucide-react";
import { Order, OrderUI } from "@/services/orders";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useCompanyLookup } from "@/hooks/useCompanyLookup";
import { generateFriendlyNumber } from "@/lib/friendlyNumbers";

interface OrderCardProps {
    order: OrderUI;
    onOpenPdf?: (order: OrderUI) => void;
    onOpenEditor?: (order: OrderUI) => void;
    onConvertToInvoice?: (order: OrderUI) => void;
    onStatusChange?: (order: OrderUI, newStatus: OrderUI["status"]) => void;
}

export function OrderCard({
    order,
    onOpenPdf,
    onOpenEditor,
    onConvertToInvoice,
    onStatusChange
}: OrderCardProps) {
    const { getCompanyName } = useCompanyLookup();
    const theme = getOrderStatusTheme(order.status);
    const Icon = theme.icon;

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "—";
        return new Date(dateString).toLocaleDateString();
    };

    const isDueSoon = (dateString?: string | null) => {
        if (!dateString) return false;
        const deliveryDate = new Date(dateString);
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return deliveryDate <= sevenDaysFromNow && deliveryDate >= now;
    };

    return (
        <Card className={cn(
            "relative p-4 rounded-2xl border bg-card shadow-card hover:shadow-hover transition cursor-pointer",
            statusTokenRing(theme.color)
        )}>
            <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-1.5 h-8 rounded-sm", statusTokenBg(theme.color))} aria-hidden="true" />
                <Icon className={cn("h-4 w-4", statusTokenText(theme.color))} aria-hidden="true" />
                <h3 className="font-medium truncate">
                    {order.number ?? generateFriendlyNumber(order.id, 'order')}
                </h3>
            </div>

            <div className="text-sm text-muted-foreground truncate">
                {getCompanyName(order.company_id)}
            </div>

            <div className="mt-2 text-sm font-medium">
                {formatMoneyMinor(order.totalMinor || 0, order.currency || "DKK")}
            </div>

            <div className="text-xs text-muted-foreground">
                {formatDate(order.order_date)}
                {order.order_date && " • "}
                {formatDate(order.created_at)}
            </div>

            {isDueSoon(order.order_date) && (
                <span className="mt-2 inline-block rounded-full bg-warning/10 text-warning px-2 py-0.5 text-xs">
                    Due soon
                </span>
            )}

            <div className="mt-3 pt-3 border-t space-y-2">
                {onStatusChange ? (
                    <Select
                        value={order.status || "draft"}
                        onValueChange={(newStatus) => onStatusChange(order, newStatus as OrderUI["status"])}
                    >
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="backorder">Backorder</SelectItem>
                            <SelectItem value="invoiced">Invoiced</SelectItem>
                        </SelectContent>
                    </Select>
                ) : (
                    <div className="text-xs text-muted-foreground">
                        Status: {order.status || "draft"}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1.5 mt-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenPdf?.(order);
                            }}
                            aria-label="Open PDF"
                        >
                            <FileDown className="h-4 w-4" aria-hidden="true" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Open PDF</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                                e.stopPropagation();
                                onConvertToInvoice?.(order);
                            }}
                            aria-label="Convert to invoice"
                        >
                            <FileSymlink className="h-4 w-4" aria-hidden="true" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Convert to invoice</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenEditor?.(order);
                            }}
                            aria-label="Open editor"
                        >
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Open editor</TooltipContent>
                </Tooltip>
            </div>
        </Card>
    );
}
