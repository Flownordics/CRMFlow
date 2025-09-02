import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface OrdersEmptyStateProps {
    onCreateOrder?: () => void;
    onConvertFromQuote?: () => void;
}

export function OrdersEmptyState({ onCreateOrder, onConvertFromQuote }: OrdersEmptyStateProps) {
    return (
        <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <div className="rounded-full bg-muted/10 p-3 mb-4">
                    <Package className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                </div>

                <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                    Get started by creating your first order or converting an accepted quote to an order.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={onCreateOrder}>
                        <Package className="mr-2 h-4 w-4" aria-hidden="true" />
                        New Order
                    </Button>
                    <Button variant="outline" onClick={onConvertFromQuote}>
                        Convert from Quote
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
