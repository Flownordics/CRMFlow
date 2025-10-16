import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { usePerson } from "@/services/people";
import { useI18n } from "@/lib/i18n";
import { Edit, Trash2, Plus } from "lucide-react";
import { PersonOverview } from "@/components/people/PersonOverview";
import { PersonDeals } from "@/components/people/PersonDeals";
import { PersonDocuments } from "@/components/people/PersonDocuments";
import { PersonActivity } from "@/components/people/PersonActivity";
import { EditPersonModal } from "@/components/people/EditPersonModal";
import { DeletePersonDialog } from "@/components/people/DeletePersonDialog";
import { CreateDealModal } from "@/components/deals/CreateDealModal";

export default function PersonPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useI18n();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isCreateDealModalOpen, setIsCreateDealModalOpen] = useState(false);

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

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <PageHeader
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
                    <PersonOverview person={person} />
                </TabsContent>

                <TabsContent value="deals" className="space-y-6">
                    <PersonDeals personId={person.id} />
                </TabsContent>

                <TabsContent value="documents" className="space-y-6">
                    <PersonDocuments personId={person.id} />
                </TabsContent>

                <TabsContent value="activity" className="space-y-6">
                    <PersonActivity personId={person.id} />
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
