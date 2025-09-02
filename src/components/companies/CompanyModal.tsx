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
import { Textarea } from "@/components/ui/textarea";
import { Company, companyCreateSchema, companyUpdateSchema } from "@/lib/schemas/company";
import { useCreateCompany, useUpdateCompany } from "@/services/companies";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { Mail, Building2 } from "lucide-react";

interface CompanyModalProps {
    company?: Company;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (company: Company) => void;
    defaultValues?: Partial<Company>;
}

export function CompanyModal({ company, open, onOpenChange, onSuccess, defaultValues }: CompanyModalProps) {
    const { t } = useI18n();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = !!company;

    const createCompany = useCreateCompany();
    const updateCompany = useUpdateCompany(company?.id || "");

    const form = useForm({
        resolver: zodResolver(isEditing ? companyUpdateSchema : companyCreateSchema),
        defaultValues: {
            name: "",
            email: "",
            invoiceEmail: "",
            vat: "",
            phone: "",
            address: "",
            city: "",
            country: "",
            industry: "",
            website: "",
        },
        mode: "onChange",
    });

    useEffect(() => {
        if (company && open) {
            form.reset({
                name: company.name,
                email: company.email || "",
                invoiceEmail: company.invoiceEmail || "",
                vat: company.vat || "",
                phone: company.phone || "",
                address: company.address || "",
                city: company.city || "",
                country: company.country || "",
                industry: company.industry || "",
                website: company.website || "",
            });
        } else if (open) {
            form.reset({
                name: defaultValues?.name || "",
                email: defaultValues?.email || "",
                invoiceEmail: defaultValues?.invoiceEmail || "",
                vat: defaultValues?.vat || "",
                phone: defaultValues?.phone || "",
                address: defaultValues?.address || "",
                city: defaultValues?.city || "",
                country: defaultValues?.country || "",
                industry: defaultValues?.industry || "",
                website: defaultValues?.website || "",
            });
        }
    }, [company, open, form, defaultValues]);

    const onSubmit = async (data: any) => {
        setIsSubmitting(true);
        try {
            if (isEditing) {
                const updatedCompany = await updateCompany.mutateAsync(data);
                toast.success(t("companies.companyUpdated"));
                onSuccess?.(updatedCompany);
            } else {
                const newCompany = await createCompany.mutateAsync(data);
                toast.success(t("companies.companyCreated"));
                onSuccess?.(newCompany);
            }
            onOpenChange(false);
        } catch (error) {
            toast.error(t("companies.saveError"));
            console.error("Error saving company:", error);
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
            <AccessibleDialogContent
                className="sm:max-w-[600px]"
            >
                {/* 🔒 These must render on the very first paint, unconditionally */}
                <DialogHeader>
                    <DialogTitle>{isEditing ? (t("companies.editCompany") || "Edit Company") : (t("companies.addCompany") || "Add Company")}</DialogTitle>
                    <DialogDescription>{isEditing
                        ? (t("companies.editCompanyDescription") || "Update the company information below.")
                        : (t("companies.addCompanyDescription") || "Fill in the company information below.")
                    }</DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t("companies.name")} *</Label>
                        <Input
                            id="name"
                            {...form.register("name")}
                            placeholder={t("companies.namePlaceholder")}
                            className={form.formState.errors.name ? "border-destructive" : ""}
                        />
                        {form.formState.errors.name && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.name.message}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                {t("companies.email")}
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                {...form.register("email")}
                                placeholder="contact@company.com"
                                className={form.formState.errors.email ? "border-destructive" : ""}
                            />
                            {form.formState.errors.email && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.email.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="invoiceEmail" className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                {t("companies.invoiceEmail")}
                            </Label>
                            <Input
                                id="invoiceEmail"
                                type="email"
                                {...form.register("invoiceEmail")}
                                placeholder="invoices@company.com"
                                className={form.formState.errors.invoiceEmail ? "border-destructive" : ""}
                            />
                            {form.formState.errors.invoiceEmail && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.invoiceEmail.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">{t("companies.phone")}</Label>
                            <Input
                                id="phone"
                                type="tel"
                                {...form.register("phone")}
                                placeholder="+45 12 34 56 78"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="website">{t("companies.website")}</Label>
                            <Input
                                id="website"
                                {...form.register("website")}
                                placeholder="flownordics.com eller https://flownordics.com"
                                className={form.formState.errors.website ? "border-destructive" : ""}
                            />
                            {form.formState.errors.website && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.website.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="vat">{t("companies.vat")}</Label>
                        <Input
                            id="vat"
                            {...form.register("vat")}
                            placeholder="DK12345678"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">{t("companies.address")}</Label>
                        <Textarea
                            id="address"
                            {...form.register("address")}
                            placeholder={t("companies.addressPlaceholder")}
                            rows={2}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="city">{t("companies.city")}</Label>
                            <Input
                                id="city"
                                {...form.register("city")}
                                placeholder="Copenhagen"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="country">{t("companies.country")}</Label>
                            <Input
                                id="country"
                                {...form.register("country")}
                                placeholder="Denmark"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="industry">{t("companies.industry")}</Label>
                        <Input
                            id="industry"
                            {...form.register("industry")}
                            placeholder="Technology"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !form.formState.isValid}
                        >
                            {isSubmitting ? t("common.saving") : isEditing ? t("common.saveChanges") : t("companies.createCompany")}
                        </Button>
                    </DialogFooter>
                </form>
            </AccessibleDialogContent>
        </Dialog>
    );
}
