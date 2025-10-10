import { useState } from "react";
import { Building2, Users, Handshake, FileText } from "lucide-react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { AccessibleDialogContent } from "@/components/ui/accessible-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useUpdateDocumentRelations } from "@/services/documents";
import { cn } from "@/lib/utils";
import { logger } from '@/lib/logger';

interface RelateDocumentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    documentId: string;
}

export function RelateDocumentModal({ open, onOpenChange, documentId }: RelateDocumentModalProps) {
    const [entityType, setEntityType] = useState<string>("none");
    const [selectedEntity, setSelectedEntity] = useState<string>("none");

    const updateMutation = useUpdateDocumentRelations();

    const handleSave = async () => {
        if (!documentId) return;

        const relations = {
            companyId: entityType === "company" && selectedEntity && selectedEntity !== "none" ? selectedEntity : null,
            dealId: entityType === "deal" && selectedEntity && selectedEntity !== "none" ? selectedEntity : null,
            personId: entityType === "person" && selectedEntity && selectedEntity !== "none" ? selectedEntity : null,
        };

        try {
            await updateMutation.mutateAsync({ id: documentId, relations });
            onOpenChange(false);
        } catch (error) {
            logger.error("Failed to update document relations:", error);
        }
    };

    const getEntityIcon = (type: string) => {
        switch (type) {
            case "company": return Building2;
            case "deal": return Handshake;
            case "person": return Users;
            default: return FileText;
        }
    };

    const EntityIcon = getEntityIcon(entityType);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <AccessibleDialogContent className="max-w-md">
                <DialogTitle>Relate Document</DialogTitle>

                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Select a related record to associate with this document.
                    </p>

                    {/* Entity Type Selection */}
                    <div className="space-y-4">
                        <label className="text-sm font-medium">Entity Type</label>
                        <Select value={entityType} onValueChange={setEntityType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select entity type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None (Remove relation)</SelectItem>
                                <SelectItem value="company">Company</SelectItem>
                                <SelectItem value="deal">Deal</SelectItem>
                                <SelectItem value="person">Person</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Entity Selection */}
                    {entityType !== "none" && (
                        <div className="space-y-4">
                            <label className="text-sm font-medium">Select {entityType}</label>
                            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                                <SelectTrigger>
                                    <SelectValue placeholder={`Select ${entityType}`} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {/* This would be populated with actual entities */}
                                    <SelectItem value="entity-1">Sample {entityType}</SelectItem>
                                    <SelectItem value="entity-2">Another {entityType}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Preview */}
                    {entityType !== "none" && selectedEntity && selectedEntity !== "none" && (
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                            <EntityIcon className="w-4 h-4" />
                            <span className="text-sm">
                                Will be related to: <strong>Sample {entityType}</strong>
                            </span>
                        </div>
                    )}

                    {entityType === "none" && (
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm">
                                Document will have no relations
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-6 border-t">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={updateMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                    >
                        {updateMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                </div>
            </AccessibleDialogContent>
        </Dialog>
    );
}
