import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { AccessibleDialogContent } from "@/components/ui/accessible-dialog";
import { useI18n } from "@/lib/i18n";
import { useUpdatePerson } from "@/services/people";
import { Person } from "@/lib/schemas/person";
import { CompanySelect } from "@/components/selects/CompanySelect";
import { toastBus } from "@/lib/toastBus";

interface EditPersonModalProps {
    person: Person;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function EditPersonModal({ person, open, onOpenChange, onSuccess }: EditPersonModalProps) {
    const { t } = useI18n();
    const updatePerson = useUpdatePerson(person.id);

    const [formData, setFormData] = useState({
        firstName: person.firstName || "",
        lastName: person.lastName || "",
        email: person.email || "",
        phone: person.phone || "",
        title: person.title || "",
        companyId: person.companyId || "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await updatePerson.mutateAsync({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email || null,
                phone: formData.phone || null,
                title: formData.title || null,
                companyId: formData.companyId || null,
            });

            toastBus.emit({
                title: t("people.personUpdated"),
                description: t("people.personUpdatedDescription"),
            });

            onSuccess();
        } catch (error) {
            toastBus.emit({
                title: t("common.error"),
                description: t("people.updateError"),
                variant: "destructive",
            });
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <AccessibleDialogContent
                className="sm:max-w-[425px]"
            >
                {/* 🔒 These must render on the very first paint, unconditionally */}
                <DialogHeader>
                    <DialogTitle>{t("people.editPerson") || "Edit Person"}</DialogTitle>
                    <DialogDescription>{t("people.editPersonDescription") || "Update the person information below."}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name *</Label>
                            <Input
                                id="firstName"
                                value={formData.firstName}
                                onChange={(e) => handleInputChange("firstName", e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name *</Label>
                            <Input
                                id="lastName"
                                value={formData.lastName}
                                onChange={(e) => handleInputChange("lastName", e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange("email", e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleInputChange("phone", e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => handleInputChange("title", e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="company">Company</Label>
                        <CompanySelect
                            value={formData.companyId}
                            onValueChange={(value) => handleInputChange("companyId", value)}
                            placeholder="Select company..."
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={updatePerson.isPending}
                        >
                            {updatePerson.isPending ? t("common.saving") : t("common.saveChanges")}
                        </Button>
                    </DialogFooter>
                </form>
            </AccessibleDialogContent>
        </Dialog>
    );
}
