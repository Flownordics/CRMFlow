import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { useDocuments } from "@/services/documents";
import { FileList } from "@/components/documents/FileList";
import { FileUploader } from "@/components/documents/FileUploader";
import { Upload, FileText } from "lucide-react";

interface PersonDocumentsProps {
    personId: string;
}

export function PersonDocuments({ personId }: PersonDocumentsProps) {
    const { t } = useI18n();
    const { data: documents, isLoading, error } = useDocuments({ type: 'person', id: personId });

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div role="alert" className="text-destructive">
                Failed to load documents
            </div>
        );
    }

    if (!documents || documents.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="text-center space-y-4">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                        <h3 className="text-lg font-medium">{t("people.noDocuments")}</h3>
                        <p className="text-sm text-muted-foreground">
                            {t("people.noDocumentsDescription")}
                        </p>
                        <FileUploader
                            entity={{ type: "person", id: personId }}
                            onUploaded={() => {
                                // The list will refresh via React Query invalidation
                            }}
                        />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{t("people.documents")}</h3>
                <FileUploader
                    entity={{ type: "person", id: personId }}
                    onUploaded={() => {
                        // The list will refresh via React Query invalidation
                    }}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Upload className="h-4 w-4" aria-hidden="true" />
                        Documents ({documents.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <FileList
                        files={documents.map(doc => ({
                            id: doc.id,
                            name: doc.name,
                            size: doc.size
                        }))}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
