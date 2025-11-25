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
import { Building2, Users, Handshake, FileText, Activity } from "lucide-react";
import { CompanyLogo } from "@/components/companies/CompanyLogo";

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { data: company, isLoading, error } = useCompany(id!);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createPersonModalOpen, setCreatePersonModalOpen] = useState(false);
  const [createDealModalOpen, setCreateDealModalOpen] = useState(false);

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

  return (
    <div className="space-y-6">
      <PageHeader
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
          <CompanyOverview company={company} onEdit={() => setEditModalOpen(true)} />
        </TabsContent>

        <TabsContent value="people" className="space-y-6">
          <CompanyPeople companyId={company.id} onAddPerson={() => setCreatePersonModalOpen(true)} />
        </TabsContent>

        <TabsContent value="deals" className="space-y-6">
          <CompanyDeals companyId={company.id} onAddDeal={() => setCreateDealModalOpen(true)} />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <CompanyDocuments companyId={company.id} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <CompanyActivityTimeline companyId={company.id} />
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
      />
    </div>
  );
}
