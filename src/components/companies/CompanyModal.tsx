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
import { useCreateCompany, useUpdateCompany, checkCompanyVatExists, checkCompanyNameExists } from "@/services/companies";
import { lookupCvr, mapCvrToCompanyData } from "@/services/cvrLookup";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { Mail, Building2, Search, Loader2 } from "lucide-react";
import { logger } from '@/lib/logger';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    const [isCvrLoading, setIsCvrLoading] = useState(false);
    const [cvrSearch, setCvrSearch] = useState("");
    const [cvrEmployees, setCvrEmployees] = useState<number | null>(null);
    const [showNameWarning, setShowNameWarning] = useState(false);
    const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);
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
            zip: "",
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
                zip: company.zip || "",
                country: company.country || "",
                industry: company.industry || "",
                website: company.website || "",
            });
            // Show employees if available
            if (company.monthlyEmployment && typeof company.monthlyEmployment === 'object' && 'employees' in company.monthlyEmployment) {
                setCvrEmployees(company.monthlyEmployment.employees as number);
            } else {
                setCvrEmployees(null);
            }
        } else if (open) {
            form.reset({
                name: defaultValues?.name || "",
                email: defaultValues?.email || "",
                invoiceEmail: defaultValues?.invoiceEmail || "",
                vat: defaultValues?.vat || "",
                phone: defaultValues?.phone || "",
                address: defaultValues?.address || "",
                city: defaultValues?.city || "",
                zip: defaultValues?.zip || "",
                country: defaultValues?.country || "",
                industry: defaultValues?.industry || "",
                website: defaultValues?.website || "",
            });
            // Reset CVR lookup state when opening for new company
            setCvrSearch("");
            setCvrEmployees(null);
        }
    }, [company, open, form, defaultValues]);

    const onSubmit = async (data: any) => {
        // Only validate when creating, not editing
        if (!isEditing) {
            // Check CVR number first - block if exists
            if (data.vat && data.vat.trim() !== "") {
                const vatExists = await checkCompanyVatExists(data.vat.trim());
                if (vatExists) {
                    toast.error("En virksomhed med dette CVR-nummer eksisterer allerede. Du kan ikke oprette en virksomhed med et eksisterende CVR-nummer.");
                    setIsSubmitting(false);
                    return;
                }
            }

            // Check company name - show warning if exists
            if (data.name && data.name.trim() !== "") {
                const nameExists = await checkCompanyNameExists(data.name.trim());
                if (nameExists) {
                    // Store the data and show warning dialog
                    setPendingSubmitData(data);
                    setShowNameWarning(true);
                    setIsSubmitting(false);
                    return;
                }
            }
        }

        // Proceed with submission
        await performSubmit(data);
    };

    const performSubmit = async (data: any) => {
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
            setShowNameWarning(false);
            setPendingSubmitData(null);
        } catch (error) {
            toast.error(t("companies.saveError"));
            logger.error("Error saving company:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNameWarningConfirm = async () => {
        if (pendingSubmitData) {
            await performSubmit(pendingSubmitData);
        }
    };

    const handleNameWarningCancel = () => {
        setShowNameWarning(false);
        setPendingSubmitData(null);
    };

    const handleNameWarningOpenChange = (open: boolean) => {
        setShowNameWarning(open);
        if (!open) {
            // Reset pending data when dialog closes
            setPendingSubmitData(null);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!isSubmitting) {
            onOpenChange(open);
        }
    };

    const handleCvrLookup = async () => {
        if (!cvrSearch.trim()) {
            toast.error("Indtast CVR nummer eller firmanavn");
            return;
        }

        setIsCvrLoading(true);
        try {
            const cvrData = await lookupCvr(cvrSearch);
            const mappedData = mapCvrToCompanyData(cvrData);
            
            // Update form with CVR data
            form.reset({
                ...form.getValues(),
                ...mappedData,
            });

            // Set employees count for display
            if (cvrData.monthlyEmployment?.employees) {
                setCvrEmployees(cvrData.monthlyEmployment.employees);
            }

            toast.success(`CVR data hentet: ${cvrData.name}`);
            setCvrSearch(""); // Clear search input
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Ukendt fejl";
            toast.error(errorMessage);
            logger.error("CVR lookup error in CompanyModal:", error);
        } finally {
            setIsCvrLoading(false);
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
                    {/* CVR Lookup Section - Only show when creating, not editing */}
                    {!isEditing && (
                        <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                            <Label className="text-sm font-semibold">CVR Lookup</Label>
                            <p className="text-xs text-muted-foreground mb-3">
                                Søg efter virksomhed ved CVR nummer eller firmanavn for at auto-udfylde felter
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="CVR nummer eller firmanavn"
                                    value={cvrSearch}
                                    onChange={(e) => setCvrSearch(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleCvrLookup();
                                        }
                                    }}
                                    disabled={isCvrLoading}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCvrLookup}
                                    disabled={isCvrLoading || !cvrSearch.trim()}
                                >
                                    {isCvrLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Search className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            {cvrEmployees !== null && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    Ansatte: {cvrEmployees}
                                </p>
                            )}
                        </div>
                    )}

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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="city">{t("companies.city")}</Label>
                            <Input
                                id="city"
                                {...form.register("city")}
                                placeholder="Copenhagen"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="zip">Postnummer</Label>
                            <Input
                                id="zip"
                                {...form.register("zip")}
                                placeholder="2100"
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

                {/* Name warning dialog */}
                <AlertDialog open={showNameWarning} onOpenChange={handleNameWarningOpenChange}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Firmanavn eksisterer allerede</AlertDialogTitle>
                            <AlertDialogDescription>
                                En virksomhed med navnet "{pendingSubmitData?.name}" eksisterer allerede i systemet. 
                                Er du sikker på, at du ønsker at oprette en ny virksomhed med dette navn alligevel?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={handleNameWarningCancel}>
                                {t("common.cancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={handleNameWarningConfirm}>
                                Opret alligevel
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </AccessibleDialogContent>
        </Dialog>
    );
}
