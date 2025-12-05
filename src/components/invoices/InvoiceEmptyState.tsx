import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { EmptyState } from "@/components/EmptyState";

interface InvoiceEmptyStateProps {
    onCreate?: () => void;
    onConvertFromOrder?: () => void;
}

export function InvoiceEmptyState({ onCreate, onConvertFromOrder }: InvoiceEmptyStateProps) {
    const { t } = useI18n();

    return (
        <EmptyState
            icon={Receipt}
            title={t("invoices.emptyTitle")}
            description={t("invoices.emptyDesc")}
            useCard={true}
            action={
                    <Button onClick={onCreate}>
                        <Receipt className="mr-2 h-4 w-4" aria-hidden="true" />
                        {t("invoices.createFirst")}
                    </Button>
            }
            actions={
                onConvertFromOrder ? (
                        <Button variant="outline" onClick={onConvertFromOrder}>
                            {t("invoices.convertFromOrder")}
                        </Button>
                ) : undefined
            }
        />
    );
}
