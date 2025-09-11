import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, Mail, Phone, Globe, Building2, BadgeDollarSign, MapPin, Hash, Briefcase } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Company } from "@/lib/schemas/company";
import { toastBus } from "@/lib/toastBus";

interface CompanyOverviewProps {
  company: Company;
  onEdit: () => void;
}

export function CompanyOverview({ company, onEdit }: CompanyOverviewProps) {
  const { t } = useI18n();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toastBus.emit({
      title: t("common.copied"),
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Billing / Invoice */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BadgeDollarSign className="h-4 w-4" aria-hidden="true" />
            {t("companies.billing")}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            {t("common.edit")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {company.invoiceEmail ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="font-medium">{t("companies.invoiceEmail")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{company.invoiceEmail}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(company.invoiceEmail!, t("companies.invoiceEmail"))}
                    >
                      <Copy className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy email</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {t("companies.noInvoiceEmail")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" aria-hidden="true" />
            {t("companies.contact")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {company.email && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="font-medium">{t("companies.email")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{company.email}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(company.email!, t("companies.email"))}
                    >
                      <Copy className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy email</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}

          {company.phone && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="font-medium">{t("companies.phone")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{company.phone}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(company.phone!, t("companies.phone"))}
                    >
                      <Copy className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy phone</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}

          {company.website && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="font-medium">{t("companies.website")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{company.website}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(company.website!, t("companies.website"))}
                    >
                      <Copy className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy website</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}

          {!company.email && !company.phone && !company.website && (
            <div className="text-sm text-muted-foreground">
              {t("companies.noContactInfo")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {t("companies.address")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {company.address && (
            <div className="text-sm">
              <span className="font-medium">{t("companies.street")}: </span>
              <span className="text-muted-foreground">{company.address}</span>
            </div>
          )}

          {company.city && (
            <div className="text-sm">
              <span className="font-medium">{t("companies.city")}: </span>
              <span className="text-muted-foreground">{company.city}</span>
            </div>
          )}

          {company.country && (
            <div className="text-sm">
              <span className="font-medium">{t("companies.country")}: </span>
              <span className="text-muted-foreground">{company.country}</span>
            </div>
          )}

          {!company.address && !company.city && !company.country && (
            <div className="text-sm text-muted-foreground">
              {t("companies.noAddress")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            {t("companies.meta")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {company.vat && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="font-medium">{t("companies.vat")}</span>
              </div>
              <span className="text-sm text-muted-foreground">{company.vat}</span>
            </div>
          )}

          {company.domain && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="font-medium">{t("companies.domain")}</span>
              </div>
              <span className="text-sm text-muted-foreground">{company.domain}</span>
            </div>
          )}

          {company.industry && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="font-medium">{t("companies.industry")}</span>
              </div>
              <Badge variant="secondary">{company.industry}</Badge>
            </div>
          )}

          {!company.vat && !company.domain && !company.industry && (
            <div className="text-sm text-muted-foreground">
              {t("companies.noMetaInfo")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
