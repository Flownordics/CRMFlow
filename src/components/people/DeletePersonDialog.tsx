import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { useI18n } from "@/lib/i18n";
import { useDeletePerson } from "@/services/people";
import { Person } from "@/lib/schemas/person";
import { toastBus } from "@/lib/toastBus";

interface DeletePersonDialogProps {
    person: Person;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function DeletePersonDialog({ person, open, onOpenChange, onSuccess }: DeletePersonDialogProps) {
    const { t } = useI18n();
    const deletePerson = useDeletePerson();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);

        try {
            await deletePerson.mutateAsync(person.id);

            toastBus.emit({
                title: t("people.personDeleted"),
                description: `${person.firstName} ${person.lastName} has been deleted successfully.`,
            });

            onSuccess();
        } catch (error) {
            toastBus.emit({
                title: t("common.error"),
                description: t("people.deleteError"),
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("people.delete")}</AlertDialogTitle>
                    <AlertDialogDescription id="person-delete-desc">
                        {t("people.confirmDelete")} This action cannot be undone.
                        {person.companyId && (
                            <span className="block mt-2 text-sm text-muted-foreground">
                                This person is associated with a company. Deleting them will remove this association.
                            </span>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                        {t("common.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
