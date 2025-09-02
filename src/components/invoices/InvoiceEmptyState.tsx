import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

interface InvoiceEmptyStateProps {
    onCreate?: () => void;
    onConvertFromOrder?: () => void;
}

export function InvoiceEmptyState({ onCreate, onConvertFromOrder }: InvoiceEmptyStateProps) {
    const { t } = useI18n();

    return (
        <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <div className="rounded-full bg-muted/10 p-3 mb-4">
                    <Receipt className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                </div>

                <h3 className="text-lg font-semibold mb-2">{t("invoices.emptyTitle")}</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                    {t("invoices.emptyDesc")}
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={onCreate}>
                        <Receipt className="mr-2 h-4 w-4" aria-hidden="true" />
                        {t("invoices.createFirst")}
                    </Button>
                    {onConvertFromOrder && (
                        <Button variant="outline" onClick={onConvertFromOrder}>
                            {t("invoices.convertFromOrder")}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
