import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/services/companies";
import { CompanyOverview } from "@/components/companies/CompanyOverview";
import { CompanyPeople } from "@/components/companies/CompanyPeople";
import { CompanyDeals } from "@/components/companies/CompanyDeals";
import { CompanyDocuments } from "@/components/companies/CompanyDocuments";
import { CompanyActivityTimeline } from "@/components/companies/CompanyActivityTimeline";
import { EditCompanyModal } from "@/components/companies/EditCompanyModal";
import { PersonModal } from "@/components/people/PersonModal";
import { CreateDealModal } from "@/components/deals/CreateDealModal";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Handshake, FileText, Activity, ShoppingCart } from "lucide-react";
import { CompanyLogo } from "@/components/companies/CompanyLogo";
import { createDealWithStage } from "@/services/dealCreationHelpers";
import { toastBus } from "@/lib/toastBus";
import { logger } from "@/lib/logger";
import { quickCreateQuoteAndNavigate, quickCreateOrderAndNavigate } from "@/services/quickCreateHelpers";
import { useNavigate } from "react-router-dom";
import { SectionErrorBoundary } from "@/components/fallbacks/SectionErrorBoundary";

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: company, isLoading, error } = useCompany(id!);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createPersonModalOpen, setCreatePersonModalOpen] = useState(false);
  const [createDealModalOpen, setCreateDealModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Company not found</h2>
          <p className="text-muted-foreground">The company you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const subtitle = [
    company.domain && `@${company.domain}`,
    company.country,
    company.industry
  ].filter(Boolean).join(" • ");

  const handleCreateQuote = async () => {
    try {
      setIsCreating(true);
      await quickCreateQuoteAndNavigate(company.id, navigate);
      toastBus.emit({
        title: "Quote created",
        description: "Opening quote editor...",
        variant: "success",
      });
    } catch (error) {
      logger.error("Failed to create quote:", error);
      toastBus.emit({
        title: "Failed to create quote",
        description: error instanceof Error ? error.message : "Could not create quote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateOrder = async () => {
    try {
      setIsCreating(true);
      await quickCreateOrderAndNavigate(company.id, navigate);
      toastBus.emit({
        title: "Order created",
        description: "Opening order editor...",
        variant: "success",
      });
    } catch (error) {
      logger.error("Failed to create order:", error);
      toastBus.emit({
        title: "Failed to create order",
        description: error instanceof Error ? error.message : "Could not create order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };


  return (
    <div className="space-y-6">
      <PageHeader
        showBreadcrumbs={true}
        title={
          <div className="flex items-center gap-3">
            <CompanyLogo company={company} size="lg" />
            <span>{company.name}</span>
          </div>
        }
        subtitle={subtitle}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCreatePersonModalOpen(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              {t("companies.addPerson")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setCreateDealModalOpen(true)}
            >
              <Handshake className="h-4 w-4 mr-2" />
              {t("companies.addDeal")}
            </Button>
            <Button
              variant="outline"
              onClick={handleCreateQuote}
              disabled={isCreating}
            >
              <FileText className="h-4 w-4 mr-2" />
              Create Quote
            </Button>
            <Button
              variant="outline"
              onClick={handleCreateOrder}
              disabled={isCreating}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Create Order
            </Button>
            <Button onClick={() => setEditModalOpen(true)}>
              {t("companies.editCompany")}
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full md:grid md:grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Building2 className="h-4 w-4 md:h-4 md:w-4" />
            <span className="hidden sm:inline">{t("companies.overview")}</span>
            <span className="sm:hidden">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="people" className="flex items-center gap-2">
            <Users className="h-4 w-4 md:h-4 md:w-4" />
            <span className="hidden sm:inline">{t("companies.people")}</span>
            <span className="sm:hidden">People</span>
          </TabsTrigger>
          <TabsTrigger value="deals" className="flex items-center gap-2">
            <Handshake className="h-4 w-4 md:h-4 md:w-4" />
            <span className="hidden sm:inline">{t("companies.deals")}</span>
            <span className="sm:hidden">Deals</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4 md:h-4 md:w-4" />
            <span className="hidden sm:inline">{t("companies.documents")}</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4 md:h-4 md:w-4" />
            <span className="hidden sm:inline">{t("companies.activity")}</span>
            <span className="sm:hidden">Activity</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SectionErrorBoundary sectionName="Company Overview">
            <CompanyOverview company={company} onEdit={() => setEditModalOpen(true)} />
          </SectionErrorBoundary>
        </TabsContent>

        <TabsContent value="people" className="space-y-6">
          <SectionErrorBoundary sectionName="Company People">
            <CompanyPeople companyId={company.id} onAddPerson={() => setCreatePersonModalOpen(true)} />
          </SectionErrorBoundary>
        </TabsContent>

        <TabsContent value="deals" className="space-y-6">
          <SectionErrorBoundary sectionName="Company Deals">
            <CompanyDeals companyId={company.id} onAddDeal={() => setCreateDealModalOpen(true)} />
          </SectionErrorBoundary>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <SectionErrorBoundary sectionName="Company Documents">
            <CompanyDocuments companyId={company.id} />
          </SectionErrorBoundary>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <SectionErrorBoundary sectionName="Company Activity">
            <CompanyActivityTimeline companyId={company.id} />
          </SectionErrorBoundary>
        </TabsContent>
      </Tabs>

      <EditCompanyModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        company={company}
      />

      <PersonModal
        open={createPersonModalOpen}
        onOpenChange={setCreatePersonModalOpen}
        companyId={company.id}
        onSuccess={() => setCreatePersonModalOpen(false)}
      />

      <CreateDealModal
        open={createDealModalOpen}
        onOpenChange={setCreateDealModalOpen}
        defaultCompanyId={company.id}
      />

    </div>
  );
}
