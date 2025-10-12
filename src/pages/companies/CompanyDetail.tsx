import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/tables/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { CompanyModal } from "@/components/companies/CompanyModal";
import { PersonModal } from "@/components/people/PersonModal";
import { CreateDealModal } from "@/components/deals/CreateDealModal";
import { CreateQuoteModal } from "@/components/quotes/CreateQuoteModal";
import { useCompany, useUpdateCompany } from "@/services/companies";
import { usePeople } from "@/services/people";
import { Company, CompanyCreate } from "@/lib/schemas/company";
import { Person } from "@/lib/schemas/person";
import { Building2, Phone, Mail, MapPin, Users, Handshake, FileText, Plus, Edit } from "lucide-react";
import { toast } from "sonner";
import { FileUploader } from "@/components/documents/FileUploader";
import { FileList } from "@/components/documents/FileList";
import { useDocuments } from "@/services/documents";
import { CompanyAccountingSummary } from "@/components/companies/CompanyAccountingSummary";
import { LogActivityPanel } from "@/components/activities/LogActivityPanel";
import { ActivityLogList } from "@/components/activities/ActivityLogList";

export default function CompanyDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("overview");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddPersonModalOpen, setIsAddPersonModalOpen] = useState(false);
    const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);
    const [isAddQuoteModalOpen, setIsAddQuoteModalOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Person | undefined>();

    const { data: company, isLoading, error } = useCompany(id || "");
    const { data: peopleResponse, isLoading: peopleLoading } = usePeople({ companyId: id });
    const updateCompany = useUpdateCompany(id || "");

    const form = useForm<CompanyCreate>({
        resolver: zodResolver(CompanyCreate),
        defaultValues: {
            name: "",
            domain: "",
            vat: "",
            phone: "",
            address: "",
            city: "",
            country: "",
        },
    });

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    if (error || !company) {
        return (
            <div className="p-6">
                <div role="alert" className="text-destructive">
                    Failed to load company
                </div>
            </div>
        );
    }

    const handleSaveOverview = async (data: CompanyCreate) => {
        try {
            await updateCompany.mutateAsync(data);
            toast.success("Company updated successfully");
        } catch (error) {
            toast.error("Failed to update company");
        }
    };

    const handleEditPerson = (person: Person) => {
        setEditingPerson(person);
        setIsAddPersonModalOpen(true);
    };

    const handleViewPerson = (personId: string) => {
        navigate(`/people/${personId}`);
    };

    const handleCreateDeal = () => {
        setIsAddDealModalOpen(true);
    };

    const handleCreateQuote = () => {
        setIsAddQuoteModalOpen(true);
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <PageHeader
                title={company.name}
                description={company.domain || "No domain"}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Company
                        </Button>
                        <Button onClick={handleCreateDeal}>
                            <Handshake className="mr-2 h-4 w-4" />
                            Create Deal
                        </Button>
                    </div>
                }
            />

            {/* Company Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                                <Building2 className="h-4 w-4" />
                            </AvatarFallback>
                        </Avatar>
                        Company Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {company.phone && (
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{company.phone}</span>
                        </div>
                    )}
                    {company.domain && (
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{company.domain}</span>
                        </div>
                    )}
                    {(company.city || company.country) && (
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                                {[company.city, company.country].filter(Boolean).join(", ")}
                            </span>
                        </div>
                    )}
                    {company.vat && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">VAT:</span>
                            <span className="text-sm">{company.vat}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activities">Activities</TabsTrigger>
                    <TabsTrigger value="people">People</TabsTrigger>
                    <TabsTrigger value="deals">Deals</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Company Details - Takes 2/3 width on large screens */}
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Company Details</CardTitle>
                                    <CardDescription>
                                        Update company information
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={form.handleSubmit(handleSaveOverview)} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Company Name *</Label>
                                        <Input
                                            id="name"
                                            {...form.register("name")}
                                            defaultValue={company.name}
                                            className={form.formState.errors.name ? "border-destructive" : ""}
                                        />
                                        {form.formState.errors.name && (
                                            <p className="text-sm text-destructive">
                                                {form.formState.errors.name.message}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="domain">Domain</Label>
                                        <Input
                                            id="domain"
                                            {...form.register("domain")}
                                            defaultValue={company.domain || ""}
                                            placeholder="company.com"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            {...form.register("phone")}
                                            defaultValue={company.phone || ""}
                                            placeholder="+1 (555) 123-4567"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="vat">VAT Number</Label>
                                        <Input
                                            id="vat"
                                            {...form.register("vat")}
                                            defaultValue={company.vat || ""}
                                            placeholder="VAT123456789"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Textarea
                                        id="address"
                                        {...form.register("address")}
                                        defaultValue={company.address || ""}
                                        placeholder="Enter full address"
                                        rows={2}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            {...form.register("city")}
                                            defaultValue={company.city || ""}
                                            placeholder="Enter city"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="country">Country</Label>
                                        <Input
                                            id="country"
                                            {...form.register("country")}
                                            defaultValue={company.country || ""}
                                            placeholder="Enter country"
                                        />
                                    </div>
                                </div>

                                <Button type="submit" disabled={updateCompany.isPending}>
                                    {updateCompany.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                        </div>

                        {/* Accounting Summary - Takes 1/3 width on large screens */}
                        <div className="lg:col-span-1">
                            <CompanyAccountingSummary companyId={company.id} currency="DKK" />
                        </div>
                    </div>
                </TabsContent>

                {/* Activities Tab */}
                <TabsContent value="activities" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <LogActivityPanel 
                            companyId={company.id} 
                            companyName={company.name}
                        />
                        <ActivityLogList companyId={company.id} />
                    </div>
                </TabsContent>

                {/* People Tab */}
                <TabsContent value="people" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Company People</h3>
                        <Button onClick={() => setIsAddPersonModalOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Person
                        </Button>
                    </div>

                    {peopleLoading ? (
                        <Skeleton className="h-32 w-full" />
                    ) : peopleResponse?.data && peopleResponse.data.length > 0 ? (
                        <DataTable>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2">Name</th>
                                        <th className="text-left p-2">Title</th>
                                        <th className="text-left p-2">Email</th>
                                        <th className="text-left p-2">Phone</th>
                                        <th className="text-left p-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {peopleResponse.data.map((person) => (
                                        <tr key={person.id} className="border-b hover:bg-muted/30">
                                            <td className="p-2">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                                            {person.firstName[0]}{person.lastName[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm font-medium">
                                                        {person.firstName} {person.lastName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-2 text-sm">
                                                {person.title || "No title"}
                                            </td>
                                            <td className="p-2 text-sm">
                                                {person.email || "No email"}
                                            </td>
                                            <td className="p-2 text-sm">
                                                {person.phone || "No phone"}
                                            </td>
                                            <td className="p-2">
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleViewPerson(person.id)}
                                                    >
                                                        View
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEditPerson(person)}
                                                    >
                                                        Edit
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </DataTable>
                    ) : (
                        <EmptyState
                            title="No people found"
                            description="This company doesn't have any people yet."
                            action={
                                <Button onClick={() => setIsAddPersonModalOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add First Person
                                </Button>
                            }
                        />
                    )}
                </TabsContent>

                {/* Deals Tab */}
                <TabsContent value="deals" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Company Deals</h3>
                        <Button onClick={handleCreateDeal}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Deal
                        </Button>
                    </div>

                    <EmptyState
                        title="No deals yet"
                        description="This company doesn't have any deals yet."
                        action={
                            <Button onClick={handleCreateDeal}>
                                <Handshake className="mr-2 h-4 w-4" />
                                Create First Deal
                            </Button>
                        }
                    />
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Company Documents</h3>
                    </div>

                    <FileUploader 
                        entity={{ type: 'company', id: company.id }}
                        onUploaded={(f) => {
                            // The documents query will automatically refresh
                            toast.success(`Document ${f.name} uploaded successfully`);
                        }}
                    />
                    
                    <CompanyDocuments companyId={company.id} />
                </TabsContent>
            </Tabs>

            {/* Modals */}
            <CompanyModal
                company={company}
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                onSuccess={() => setIsEditModalOpen(false)}
            />

            <PersonModal
                companyId={company.id}
                person={editingPerson}
                open={isAddPersonModalOpen}
                onOpenChange={setIsAddPersonModalOpen}
                onSuccess={() => {
                    setIsAddPersonModalOpen(false);
                    setEditingPerson(undefined);
                }}
            />
            
            <CreateDealModal
                open={isAddDealModalOpen}
                onOpenChange={setIsAddDealModalOpen}
                defaultCompanyId={company.id}
            />
            
            <CreateQuoteModal
                open={isAddQuoteModalOpen}
                onOpenChange={setIsAddQuoteModalOpen}
                defaultCompanyId={company.id}
                defaultTitle={`Quote for ${company.name}`}
            />
        </div>
    );
}

// Company Documents Component
function CompanyDocuments({ companyId }: { companyId: string }) {
    const { data: documents, isLoading, error } = useDocuments({ type: 'company', id: companyId });

    if (isLoading) {
        return (
            <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted/30 animate-pulse rounded" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <EmptyState
                title="Error loading documents"
                description="Failed to load company documents. Please try again."
            />
        );
    }

    if (!documents || documents.length === 0) {
        return (
            <EmptyState
                title="No documents yet"
                description="This company doesn't have any documents yet."
            />
        );
    }

    return (
        <FileList 
            files={documents.map(doc => ({
                id: doc.id,
                name: doc.name,
                size: doc.size
            }))}
        />
    );
}
