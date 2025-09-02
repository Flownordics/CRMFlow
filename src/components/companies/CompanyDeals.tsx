import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCompanyDeals } from "@/services/companies";
import { useI18n } from "@/lib/i18n";
import { Handshake, Plus, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { fromMinor } from "@/lib/money";
import { format } from "date-fns";

interface CompanyDealsProps {
  companyId: string;
  onAddDeal: () => void;
}

export function CompanyDeals({ companyId, onAddDeal }: CompanyDealsProps) {
  const { t } = useI18n();
  const { data: deals, isLoading } = useCompanyDeals(companyId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            {t("companies.deals")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!deals || deals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            {t("companies.deals")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Handshake}
            title={t("companies.noDealsYet")}
            description={t("companies.noDealsDescription")}
            action={
              <Button onClick={onAddDeal}>
                <Plus className="h-4 w-4 mr-2" />
                {t("companies.addDeal")}
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Handshake className="h-5 w-5" />
          {t("companies.deals")}
        </CardTitle>
        <Button onClick={onAddDeal}>
          <Plus className="h-4 w-4 mr-2" />
          {t("companies.addDeal")}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {deals.map((deal) => (
            <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate">{deal.title}</p>
                  <Badge variant="outline" className="text-xs">
                    {deal.stage?.name || t("deals.unknownStage")}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {deal.expectedValue && (
                    <span>{fromMinor(deal.expectedValue, deal.currency || "DKK")}</span>
                  )}
                  {deal.updatedAt && (
                    <span>{format(new Date(deal.updatedAt), "MMM d, yyyy")}</span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <a href={`/deals/${deal.id}`}>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" className="w-full" asChild>
            <a href="/deals">
              <ExternalLink className="h-4 w-4 mr-2" />
              {t("companies.viewInDeals")}
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
