import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { PersonModal } from "@/components/people/PersonModal";
import { usePerson, useUpdatePerson } from "@/services/people";
import { useCompanies } from "@/services/companies";
import { Person, PersonCreate } from "@/lib/schemas/person";
import { User, Mail, Phone, Building2, Handshake, FileText, Edit, Plus } from "lucide-react";
import { toast } from "sonner";
import { FileUploader } from "@/components/documents/FileUploader";
import { FileList } from "@/components/documents/FileList";
import { useDocuments } from "@/services/documents";

export default function PersonDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("overview");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const { data: person, isLoading, error } = usePerson(id || "");
    const { data: companiesResponse, isLoading: companiesLoading } = useCompanies();
    const updatePerson = useUpdatePerson(id || "");

    const form = useForm<PersonCreate>({
        resolver: zodResolver(PersonCreate),
        defaultValues: {
            companyId: "",
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            title: "",
        },
    });

    useEffect(() => {
        if (person && !isLoading) {
            form.reset({
                companyId: person.companyId,
                firstName: person.firstName,
                lastName: person.lastName,
                email: person.email || "",
                phone: person.phone || "",
                title: person.title || "",
            });
        }
    }, [person, isLoading, form]);

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    if (error || !person) {
        return (
            <div className="p-6">
                <div role="alert" className="text-destructive">
                    Failed to load person
                </div>
            </div>
        );
    }

    const handleSaveOverview = async (data: PersonCreate) => {
        try {
            await updatePerson.mutateAsync(data);
            toast.success("Person updated successfully");
        } catch (error) {
            toast.error("Failed to update person");
        }
    };

    const handleCompanyChange = async (newCompanyId: string) => {
        try {
            await updatePerson.mutateAsync({ companyId: newCompanyId });
            toast.success("Person moved to new company successfully");
        } catch (error) {
            toast.error("Failed to move person to new company");
        }
    };

    const handleCreateDeal = () => {
        navigate(`/deals/new?personId=${person.id}&companyId=${person.companyId}`);
    };

    const handleCreateQuote = () => {
        navigate(`/quotes/new?personId=${person.id}&companyId=${person.companyId}`);
    };

    const getCompanyName = (companyId: string) => {
        return companiesResponse?.data?.find(c => c.id === companyId)?.name || "Unknown Company";
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <PageHeader
                title={`${person.firstName} ${person.lastName}`}
                description={person.title || "No title"}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Person
                        </Button>
                        <Button onClick={handleCreateDeal}>
                            <Handshake className="mr-2 h-4 w-4" />
                            Create Deal
                        </Button>
                    </div>
                }
            />

            {/* Person Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                                <User className="h-4 w-4" />
                            </AvatarFallback>
                        </Avatar>
                        Personal Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {person.email && (
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{person.email}</span>
                        </div>
                    )}
                    {person.phone && (
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{person.phone}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-left hover:bg-transparent"
                            onClick={() => navigate(`/companies/${person.companyId}`)}
                        >
                            <span className="text-sm text-primary hover:underline">
                                {getCompanyName(person.companyId)}
                            </span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="deals">Deals</TabsTrigger>
                    <TabsTrigger value="quotes">Quotes</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Person Details</CardTitle>
                            <CardDescription>
                                Update person information
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={form.handleSubmit(handleSaveOverview)} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name *</Label>
                                        <Input
                                            id="firstName"
                                            {...form.register("firstName")}
                                            defaultValue={person.firstName}
                                            className={form.formState.errors.firstName ? "border-destructive" : ""}
                                        />
                                        {form.formState.errors.firstName && (
                                            <p className="text-sm text-destructive">
                                                {form.formState.errors.firstName.message}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name *</Label>
                                        <Input
                                            id="lastName"
                                            {...form.register("lastName")}
                                            defaultValue={person.lastName}
                                            className={form.formState.errors.lastName ? "border-destructive" : ""}
                                        />
                                        {form.formState.errors.lastName && (
                                            <p className="text-sm text-destructive">
                                                {form.formState.errors.lastName.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            {...form.register("email")}
                                            defaultValue={person.email || ""}
                                            placeholder="person@company.com"
                                            className={form.formState.errors.email ? "border-destructive" : ""}
                                        />
                                        {form.formState.errors.email && (
                                            <p className="text-sm text-destructive">
                                                {form.formState.errors.email.message}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            {...form.register("phone")}
                                            defaultValue={person.phone || ""}
                                            placeholder="+1 (555) 123-4567"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="title">Job Title</Label>
                                    <Input
                                        id="title"
                                        {...form.register("title")}
                                        defaultValue={person.title || ""}
                                        placeholder="e.g., Sales Manager, Developer"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="companyId">Company *</Label>
                                    <Select
                                        value={form.watch("companyId")}
                                        onValueChange={(value) => {
                                            form.setValue("companyId", value);
                                            handleCompanyChange(value);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a company" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(companiesResponse?.data ?? []).map((company) => (
                                                <SelectItem key={company.id} value={company.id}>
                                                    {company.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.formState.errors.companyId && (
                                        <p className="text-sm text-destructive">
                                            {form.formState.errors.companyId.message}
                                        </p>
                                    )}
                                </div>

                                <Button type="submit" disabled={updatePerson.isPending}>
                                    {updatePerson.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Deals Tab */}
                <TabsContent value="deals" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Person Deals</h3>
                        <Button onClick={handleCreateDeal}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Deal
                        </Button>
                    </div>

                    <EmptyState
                        title="No deals yet"
                        description="This person doesn't have any deals yet."
                        action={
                            <Button onClick={handleCreateDeal}>
                                <Handshake className="mr-2 h-4 w-4" />
                                Create First Deal
                            </Button>
                        }
                    />
                </TabsContent>

                {/* Quotes Tab */}
                <TabsContent value="quotes" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Person Quotes</h3>
                        <Button onClick={handleCreateQuote}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Quote
                        </Button>
                    </div>

                    <EmptyState
                        title="No quotes yet"
                        description="This person doesn't have any quotes yet."
                        action={
                            <Button onClick={handleCreateQuote}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create First Quote
                            </Button>
                        }
                    />
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Person Documents</h3>
                    </div>

                    <FileUploader 
                        entity={{ type: 'person', id: person.id }}
                        onUploaded={(f) => {
                            // The documents query will automatically refresh
                            toast.success(`Document ${f.name} uploaded successfully`);
                        }}
                    />
                    
                    <PersonDocuments personId={person.id} />
                </TabsContent>
            </Tabs>

            {/* Person Modal */}
            <PersonModal
                person={person}
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                onSuccess={() => setIsEditModalOpen(false)}
            />
        </div>
    );
}

// Person Documents Component
function PersonDocuments({ personId }: { personId: string }) {
    const { data: documents, isLoading, error } = useDocuments({ type: 'person', id: personId });

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
                description="Failed to load person documents. Please try again."
            />
        );
    }

    if (!documents || documents.length === 0) {
        return (
            <EmptyState
                title="No documents yet"
                description="This person doesn't have any documents yet."
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
