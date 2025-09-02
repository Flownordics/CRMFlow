import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AccessibleDialogContent } from "@/components/ui/accessible-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Person, PersonCreate } from "@/lib/schemas/person";
import { Company } from "@/lib/schemas/company";
import { useCreatePerson, useUpdatePerson } from "@/services/people";
import { useCompanies } from "@/services/companies";
import { toast } from "sonner";

interface PersonModalProps {
    person?: Person;
    companyId?: string; // For preselecting company when opened from company detail
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (person: Person) => void;
    defaultValues?: Partial<PersonCreate>;
}

export function PersonModal({ person, companyId, open, onOpenChange, onSuccess, defaultValues }: PersonModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = !!person;

    const createPerson = useCreatePerson();
    const updatePerson = useUpdatePerson(person?.id || "");
    const { data: companiesResponse } = useCompanies();

    const form = useForm<PersonCreate>({
        resolver: zodResolver(PersonCreate),
        defaultValues: {
            company_id: companyId || "",
            first_name: "",
            last_name: "",
            email: "",
            phone: "",
            title: "",
        },
    });

    useEffect(() => {
        if (person && open) {
            form.reset({
                company_id: person.company_id || "",
                first_name: person.first_name,
                last_name: person.last_name,
                email: person.email || "",
                phone: person.phone || "",
                title: person.title || "",
            });
        } else if (open) {
            form.reset({
                company_id: companyId || "",
                first_name: defaultValues?.first_name || "",
                last_name: defaultValues?.last_name || "",
                email: defaultValues?.email || "",
                phone: defaultValues?.phone || "",
                title: defaultValues?.title || "",
            });
        }
    }, [person, companyId, open, form]);

    const onSubmit = async (data: PersonCreate) => {
        setIsSubmitting(true);
        try {
            if (isEditing) {
                const updatedPerson = await updatePerson.mutateAsync(data);
                toast.success("Person updated successfully");
                onSuccess?.(updatedPerson);
            } else {
                const newPerson = await createPerson.mutateAsync(data);
                toast.success("Person created successfully");
                onSuccess?.(newPerson);
            }
            onOpenChange(false);
        } catch (error) {
            toast.error("Failed to save person");
            console.error("Error saving person:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!isSubmitting) {
            onOpenChange(open);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <AccessibleDialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Person" : "Add Person"}</DialogTitle>
                    <DialogDescription>{isEditing
                        ? "Update the person information below."
                        : "Fill in the person information below."
                    }</DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="company_id">Company *</Label>
                        <Select
                            value={form.watch("company_id")}
                            onValueChange={(value) => form.setValue("company_id", value)}
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
                        {form.formState.errors.company_id && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.company_id.message}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="first_name">First Name *</Label>
                            <Input
                                id="first_name"
                                {...form.register("first_name")}
                                placeholder="Enter first name"
                                className={form.formState.errors.first_name ? "border-destructive" : ""}
                            />
                            {form.formState.errors.first_name && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.first_name.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="last_name">Last Name *</Label>
                            <Input
                                id="last_name"
                                {...form.register("last_name")}
                                placeholder="Enter last name"
                                className={form.formState.errors.last_name ? "border-destructive" : ""}
                            />
                            {form.formState.errors.last_name && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.last_name.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                {...form.register("email")}
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
                                placeholder="+1 (555) 123-4567"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Job Title</Label>
                        <Input
                            id="title"
                            {...form.register("title")}
                            placeholder="e.g., Sales Manager, Developer"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !form.formState.isValid}
                        >
                            {isSubmitting ? "Saving..." : isEditing ? "Update Person" : "Create Person"}
                        </Button>
                    </DialogFooter>
                </form>
            </AccessibleDialogContent>
        </Dialog>
    );
}
