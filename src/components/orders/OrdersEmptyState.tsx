import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";

interface OrdersEmptyStateProps {
    onCreateOrder?: () => void;
    onConvertFromQuote?: () => void;
}

export function OrdersEmptyState({ onCreateOrder, onConvertFromQuote }: OrdersEmptyStateProps) {
    return (
        <EmptyState
            icon={Package}
            title="No orders yet"
            description="Get started by creating your first order or converting an accepted quote to an order."
            useCard={true}
            action={
                    <Button onClick={onCreateOrder}>
                        <Package className="mr-2 h-4 w-4" aria-hidden="true" />
                        New Order
                    </Button>
            }
            actions={
                    <Button variant="outline" onClick={onConvertFromQuote}>
                        Convert from Quote
                    </Button>
            }
        />
    );
}
