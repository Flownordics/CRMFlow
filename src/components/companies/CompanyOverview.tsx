import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, Mail, Phone, Globe, Building2, BadgeDollarSign, MapPin, Hash, Briefcase, Activity, Tag } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Company } from "@/lib/schemas/company";
import { toastBus } from "@/lib/toastBus";
import { ActivityStatusBadge } from "./ActivityStatusBadge";
import { getDaysSinceActivity, useLogCompanyActivity, useCompanyActivityLogs } from "@/services/activityLog";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { CompanyRevenueCard } from "./CompanyRevenueCard";
import { CompanyTagsManager } from "./CompanyTagsManager";
import { CompanyNotes } from "./CompanyNotes";
import { QuickActionButtons } from "./QuickActionButtons";

interface CompanyOverviewProps {
  company: Company;
  onEdit: () => void;
}

export function CompanyOverview({ company, onEdit }: CompanyOverviewProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const logActivityMutation = useLogCompanyActivity(company.id);
  const { data: recentActivities } = useCompanyActivityLogs(company.id);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toastBus.emit({
      title: t("common.copied"),
      description: `${label} copied to clipboard`,
    });
  };

  const quickLogActivity = async (type: string, outcome?: string) => {
    try {
      await logActivityMutation.mutateAsync({
        companyId: company.id,
        type: type as any,
        outcome,
        notes: `Quick log fra company overview`,
      });

      toast({
        title: "Aktivitet logget",
        description: `${type === 'call' ? 'Opkald' : type === 'email' ? 'Email' : 'Aktivitet'} er blevet logget`,
      });
    } catch (error) {
      toast({
        title: "Fejl",
        description: "Kunne ikke logge aktivitet",
        variant: "destructive",
      });
    }
  };

  const daysSinceActivity = getDaysSinceActivity(company.lastActivityAt);
  const lastActivityText = company.lastActivityAt 
    ? formatDistanceToNow(new Date(company.lastActivityAt), { addSuffix: true })
    : 'Never contacted';

  // Get the most recent activity for display
  const latestActivity = recentActivities && recentActivities.length > 0 
    ? recentActivities[0] 
    : null;

  const activityTypeLabels: Record<string, string> = {
    call: 'Call',
    email: 'Email',
    meeting: 'Meeting',
    note: 'Note',
    task: 'Task',
    deal: 'Deal Created',
    quote: 'Quote Created',
    order: 'Order Created',
    invoice: 'Invoice Created',
    payment: 'Payment Received',
  };

  const outcomeLabels: Record<string, string> = {
    completed: 'Completed',
    voicemail: 'Voicemail',
    no_answer: 'No Answer',
    busy: 'Busy',
    scheduled_followup: 'Follow-up Scheduled',
    wrong_number: 'Wrong Number',
    not_interested: 'Not Interested',
    callback_requested: 'Callback Requested',
  };

  // Format any outcome not in the mapping (remove underscores, capitalize)
  const formatOutcome = (outcome: string) => {
    if (outcomeLabels[outcome]) return outcomeLabels[outcome];
    return outcome.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Tags Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Tag className="h-4 w-4" aria-hidden="true" />
            Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyTagsManager companyId={company.id} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <QuickActionButtons 
          companyId={company.id} 
          companyName={company.name}
          companyEmail={company.email}
        />

        {/* Revenue & Deals */}
        <CompanyRevenueCard companyId={company.id} />

        {/* Activity Status Card */}
        <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" aria-hidden="true" />
            Activity Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <ActivityStatusBadge 
              status={company.activityStatus as any} 
              lastActivityAt={company.lastActivityAt}
              showLabel={true}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Contact</span>
              <span className="text-sm text-muted-foreground">
                {lastActivityText}
                {daysSinceActivity !== null && (
                  <span className="ml-1">({daysSinceActivity} days)</span>
                )}
              </span>
            </div>
            
            {latestActivity && (
              <div className="p-3 rounded-md bg-muted/30 border">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {activityTypeLabels[latestActivity.type] || latestActivity.type.charAt(0).toUpperCase() + latestActivity.type.slice(1)}
                    </span>
                    {latestActivity.outcome && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        {formatOutcome(latestActivity.outcome)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {latestActivity.createdAt && new Date(latestActivity.createdAt).toLocaleDateString('en-US', { 
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {latestActivity.notes && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {latestActivity.notes}
                  </p>
                )}
              </div>
            )}
          </div>

          {company.doNotCall && (
            <div className="flex items-center justify-center p-2 rounded-md bg-destructive/10 border border-destructive/20">
              <Phone className="h-4 w-4 text-destructive mr-2" />
              <span className="text-sm font-medium text-destructive">Do Not Call</span>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Company Notes - Full Width */}
      <CompanyNotes companyId={company.id} />
    </div>
  );
}
