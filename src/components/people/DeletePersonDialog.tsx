import { useI18n } from "@/lib/i18n";
import { useDeletePerson } from "@/services/people";
import { Person } from "@/lib/schemas/person";
import { toastBus } from "@/lib/toastBus";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface DeletePersonDialogProps {
    person: Person;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function DeletePersonDialog({ person, open, onOpenChange, onSuccess }: DeletePersonDialogProps) {
    const { t } = useI18n();
    const deletePerson = useDeletePerson();

    const handleDelete = async () => {
        try {
            await deletePerson.mutateAsync(person.id);

            toastBus.emit({
                title: t("people.personDeleted"),
                description: `${person.firstName} ${person.lastName} has been moved to trash.`,
                action: {
                    label: "Restore",
                    onClick: () => {
                        window.location.href = "/settings?tab=trash";
                    }
                }
            });

            onSuccess();
        } catch (error) {
            toastBus.emit({
                title: t("common.error"),
                description: t("people.deleteError"),
                variant: "destructive",
            });
        }
    };

    const description = person.companyId
        ? `This person will be moved to trash. You can restore it from Settings > Trash Bin.\n\nNote: This person is associated with a company. Deleting them will remove this association.`
        : `This person will be moved to trash. You can restore it from Settings > Trash Bin.`;

    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={onOpenChange}
            title={t("people.delete") || "Delete Person"}
            description={description}
            confirmText="Delete"
            cancelText={t("common.cancel") || "Cancel"}
            onConfirm={handleDelete}
            variant="destructive"
        />
    );
}
