import { useState, useEffect } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AccessibleDialogContent } from "@/components/ui/accessible-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUpdateCompany, useDeleteCompany, checkCompanyDependencies, type CompanyDependencies } from "@/services/companies";
import { toastBus } from "@/lib/toastBus";
import { useI18n } from "@/lib/i18n";
import { Mail, Trash2 } from "lucide-react";
import { Company, companyUpdateSchema } from "@/lib/schemas/company";
import { logger } from '@/lib/logger';
import { formatPhoneNumber } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface EditCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company;
}

export function EditCompanyModal({ open, onOpenChange, company }: EditCompanyModalProps) {
  const { t } = useI18n();
  const updateCompany = useUpdateCompany(company.id);
  const deleteCompanyMutation = useDeleteCompany();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [companyDependencies, setCompanyDependencies] = useState<CompanyDependencies | null>(null);
  const [isLoadingDependencies, setIsLoadingDependencies] = useState(false);

  const [formData, setFormData] = useState({
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

  // Reset form when company changes
  useEffect(() => {
    setFormData({
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
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate the form data
      const validatedData = companyUpdateSchema.parse(formData);

      await updateCompany.mutateAsync(validatedData);

      toastBus.emit({
        title: t("companies.companyUpdated"),
        description: t("companies.companyUpdatedDescription"),
      });

      onOpenChange(false);
    } catch (error) {
      logger.error("Failed to update company:", error);
      toastBus.emit({
        title: t("common.error"),
        description: t("companies.updateError"),
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDeleteClick = async () => {
    setIsLoadingDependencies(true);
    try {
      const dependencies = await checkCompanyDependencies(company.id);
      setCompanyDependencies(dependencies);
      setShowDeleteConfirm(true);
    } catch (error) {
      logger.error('Failed to check company dependencies:', error);
      toastBus.emit({
        title: t("common.error"),
        description: "Failed to check company dependencies. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDependencies(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCompanyMutation.mutateAsync(company.id);

      toastBus.emit({
        title: t("companies.companyDeleted") || "Company Deleted",
        description: `${company.name} has been moved to trash.`,
        action: {
          label: "Restore",
          onClick: () => {
            window.location.href = "/settings?tab=trash";
          }
        }
      });

      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      logger.error("Failed to delete company:", error);
      toastBus.emit({
        title: t("common.error"),
        description: t("companies.deleteError") || "Failed to delete company. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getDeleteDescription = () => {
    if (!companyDependencies) return "";
    
    if (companyDependencies.hasActiveDeals) {
      return `Cannot delete company "${company.name}". This company has ${companyDependencies.activeDealsCount} active deal${companyDependencies.activeDealsCount > 1 ? 's' : ''}. Please close or delete the deals first, then try again.`;
    }
    
    return `This company will be moved to trash. You can restore it from Settings > Trash Bin.`;
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AccessibleDialogContent
        className="max-w-2xl"
      >
        {/* 🔒 These must render on the very first paint, unconditionally */}
        <DialogHeader>
          <DialogTitle>{t("companies.editCompany") || "Edit Company"}</DialogTitle>
          <DialogDescription>{t("companies.editCompanyDescription") || "Update the company information below."}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("companies.name")} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
              />
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
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="contact@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceEmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {t("companies.invoiceEmail")}
                </Label>
                <Input
                  id="invoiceEmail"
                  type="email"
                  value={formData.invoiceEmail}
                  onChange={(e) => handleInputChange("invoiceEmail", e.target.value)}
                  placeholder="invoices@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t("companies.phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    handleInputChange("phone", formatted);
                  }}
                  placeholder="+45 12 34 56 78"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">{t("companies.website")}</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder="https://company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vat">{t("companies.vat")}</Label>
              <Input
                id="vat"
                value={formData.vat}
                onChange={(e) => handleInputChange("vat", e.target.value)}
                placeholder="DK12345678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t("companies.address")}</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Street Address 123"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">{t("companies.city")}</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="Copenhagen"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">{t("companies.country")}</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleInputChange("country", e.target.value)}
                  placeholder="Denmark"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">{t("companies.industry")}</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => handleInputChange("industry", e.target.value)}
                placeholder="Technology"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={updateCompany.isPending || deleteCompanyMutation.isPending || isLoadingDependencies}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Company
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateCompany.isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={updateCompany.isPending}>
                {updateCompany.isPending ? t("common.saving") : t("common.saveChanges")}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </AccessibleDialogContent>
    </Dialog>
    {showDeleteConfirm && companyDependencies && (
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          setShowDeleteConfirm(open);
          if (!open) {
            setCompanyDependencies(null);
          }
        }}
        title={companyDependencies.hasActiveDeals ? "Cannot Delete Company" : "Delete Company"}
        description={getDeleteDescription()}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        variant="destructive"
        blocked={companyDependencies.hasActiveDeals}
        showCloseOnly={companyDependencies.hasActiveDeals}
      />
    )}
    </>
  );
}
