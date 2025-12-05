import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { usePerson } from "@/services/people";
import { useI18n } from "@/lib/i18n";
import { Edit, Trash2, Plus, FileText, ShoppingCart } from "lucide-react";
import { PersonOverview } from "@/components/people/PersonOverview";
import { PersonDeals } from "@/components/people/PersonDeals";
import { PersonDocuments } from "@/components/people/PersonDocuments";
import { PersonActivity } from "@/components/people/PersonActivity";
import { EditPersonModal } from "@/components/people/EditPersonModal";
import { DeletePersonDialog } from "@/components/people/DeletePersonDialog";
import { CreateDealModal } from "@/components/deals/CreateDealModal";
import { createDealWithStage } from "@/services/dealCreationHelpers";
import { toastBus } from "@/lib/toastBus";
import { logger } from "@/lib/logger";
import { quickCreateQuoteAndNavigate, quickCreateOrderAndNavigate } from "@/services/quickCreateHelpers";
import { SectionErrorBoundary } from "@/components/fallbacks/SectionErrorBoundary";

export default function PersonPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useI18n();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isCreateDealModalOpen, setIsCreateDealModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const { data: person, isLoading, isError } = usePerson(id!);

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    if (isError || !person) {
        return (
            <div role="alert" className="p-6 text-destructive">
                Failed to load person
            </div>
        );
    }

    const handleEditSuccess = () => {
        setIsEditModalOpen(false);
    };

    const handleDeleteSuccess = () => {
        setIsDeleteDialogOpen(false);
        navigate("/people");
    };

    const handleCreateQuote = async () => {
        if (!person.companyId) {
            toastBus.emit({
                title: "Company required",
                description: "This person must be assigned to a company before creating a quote.",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsCreating(true);
            await quickCreateQuoteAndNavigate(person.companyId, navigate, person.id);
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
        if (!person.companyId) {
            toastBus.emit({
                title: "Company required",
                description: "This person must be assigned to a company before creating an order.",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsCreating(true);
            await quickCreateOrderAndNavigate(person.companyId, navigate, person.id);
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
        <div className="space-y-6 p-6">
            {/* Header */}
            <PageHeader
                showBreadcrumbs={true}
                title={`${person.firstName} ${person.lastName}`}
                subtitle={
                    <div className="flex items-center gap-2">
                        {person.title && (
                            <Badge variant="secondary">{person.title}</Badge>
                        )}
                        {person.companyId && (
                            <Badge variant="outline">
                                <a 
                                    href={`/companies/${person.companyId}`}
                                    className="hover:underline"
                                >
                                    Company
                                </a>
                            </Badge>
                        )}
                        {person.email && (
                            <Badge variant="outline" className="text-xs">
                                {person.email}
                            </Badge>
                        )}
                        {person.phone && (
                            <Badge variant="outline" className="text-xs">
                                {person.phone}
                            </Badge>
                        )}
                    </div>
                }
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditModalOpen(true)}
                            aria-label={t("people.edit")}
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            {t("common.edit")}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCreateDealModalOpen(true)}
                            aria-label={t("people.addDeal")}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            {t("people.addDeal")}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCreateQuote}
                            disabled={isCreating || !person.companyId}
                            aria-label="Create Quote"
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Create Quote
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCreateOrder}
                            disabled={isCreating || !person.companyId}
                            aria-label="Create Order"
                        >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Create Order
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setIsDeleteDialogOpen(true)}
                            aria-label={t("people.delete")}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("people.delete")}
                        </Button>
                    </div>
                }
            />

            {/* Gradient separator */}
            <div className="h-0.5 bg-gradient-to-r from-primary/30 via-accent/30 to-transparent rounded-full" aria-hidden="true" />

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">{t("people.overview")}</TabsTrigger>
                    <TabsTrigger value="deals">{t("people.deals")}</TabsTrigger>
                    <TabsTrigger value="documents">{t("people.documents")}</TabsTrigger>
                    <TabsTrigger value="activity">{t("people.activity")}</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <SectionErrorBoundary sectionName="Person Overview">
                        <PersonOverview person={person} />
                    </SectionErrorBoundary>
                </TabsContent>

                <TabsContent value="deals" className="space-y-6">
                    <SectionErrorBoundary sectionName="Person Deals">
                        <PersonDeals personId={person.id} />
                    </SectionErrorBoundary>
                </TabsContent>

                <TabsContent value="documents" className="space-y-6">
                    <SectionErrorBoundary sectionName="Person Documents">
                        <PersonDocuments personId={person.id} />
                    </SectionErrorBoundary>
                </TabsContent>

                <TabsContent value="activity" className="space-y-6">
                    <SectionErrorBoundary sectionName="Person Activity">
                        <PersonActivity personId={person.id} />
                    </SectionErrorBoundary>
                </TabsContent>
            </Tabs>

            {/* Modals */}
            <EditPersonModal
                person={person}
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                onSuccess={handleEditSuccess}
            />

            <DeletePersonDialog
                person={person}
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onSuccess={handleDeleteSuccess}
            />
            
            <CreateDealModal
                open={isCreateDealModalOpen}
                onOpenChange={setIsCreateDealModalOpen}
                defaultCompanyId={person.companyId}
            />

        </div>
    );
}
