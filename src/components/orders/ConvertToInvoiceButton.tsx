import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ensureInvoiceForOrder } from "@/services/conversions";

interface ConvertToInvoiceButtonProps {
    orderIds: string[];
    variant?: "default" | "outline" | "ghost";
    size?: "default" | "sm" | "lg";
    onSuccess?: () => void;
    disabled?: boolean;
}

export function ConvertToInvoiceButton({
    orderIds,
    variant = "default",
    size = "default",
    onSuccess,
    disabled = false
}: ConvertToInvoiceButtonProps) {
    const [isConverting, setIsConverting] = useState(false);
    const { toast } = useToast();

    const handleConvert = async () => {
        if (orderIds.length === 0) return;

        setIsConverting(true);
        const results: { success: string[]; failed: string[] } = { success: [], failed: [] };

        try {
            for (const orderId of orderIds) {
                try {
                    await ensureInvoiceForOrder(orderId);
                    results.success.push(orderId);
                } catch (error) {
                    console.error(`Failed to create invoice for order ${orderId}:`, error);
                    results.failed.push(orderId);
                }
            }

            // Show results
            if (results.success.length > 0) {
                toast({
                    title: orderIds.length === 1 ? "Invoice Created" : "Bulk Invoice Creation Complete",
                    description: orderIds.length === 1
                        ? "Invoice has been created successfully."
                        : `Successfully created ${results.success.length} invoice(s). ${results.failed.length > 0 ? `${results.failed.length} failed.` : ''}`,
                    variant: results.failed.length > 0 ? "destructive" : "default",
                });
            }

            onSuccess?.();
        } catch (error) {
            toast({
                title: "Invoice Creation Failed",
                description: "An error occurred during invoice creation.",
                variant: "destructive",
            });
        } finally {
            setIsConverting(false);
        }
    };

    return (
        <Button
            onClick={handleConvert}
            disabled={disabled || isConverting || orderIds.length === 0}
            variant={variant}
            size={size}
        >
            {isConverting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
                <FileText className="h-4 w-4 mr-2" />
            )}
            {orderIds.length === 1 ? "Convert to Invoice" : `Convert ${orderIds.length} to Invoices`}
        </Button>
    );
}
