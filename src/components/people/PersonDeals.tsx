import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { usePersonDeals } from "@/services/people";
import { ExternalLink, DollarSign, Calendar } from "lucide-react";
import { formatMoneyMinor } from "@/lib/money";

interface PersonDealsProps {
    personId: string;
}

export function PersonDeals({ personId }: PersonDealsProps) {
    const { t } = useI18n();
    const { data: deals, isLoading, isError } = usePersonDeals(personId);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div role="alert" className="text-destructive">
                Failed to load deals
            </div>
        );
    }

    if (!deals || deals.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="text-center space-y-4">
                        <h3 className="text-lg font-medium">{t("people.noDeals")}</h3>
                        <p className="text-sm text-muted-foreground">
                            {t("people.noDealsDescription")}
                        </p>
                        <Button asChild>
                            <a href={`/deals/new?contactId=${personId}`}>
                                {t("people.addDeal")}
                            </a>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{t("people.deals")}</h3>
                <Button asChild variant="outline" size="sm">
                    <a href="/deals">
                        {t("people.viewInDeals")}
                        <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deals.map((deal: any) => (
                    <Card key={deal.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium line-clamp-2">
                                {deal.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-xs">
                                    {deal.stage_name || "Unknown Stage"}
                                </Badge>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <DollarSign className="h-3 w-3" aria-hidden="true" />
                                    {formatMoneyMinor(deal.expected_value_minor || 0)}
                                </div>
                            </div>

                            {deal.close_date && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" aria-hidden="true" />
                                    Close: {formatDate(deal.close_date)}
                                </div>
                            )}

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Updated: {formatDate(deal.updated_at)}</span>
                                <Button asChild variant="ghost" size="sm">
                                    <a href={`/deals/${deal.id}`}>
                                        View
                                        <ExternalLink className="h-3 w-3 ml-1" />
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
