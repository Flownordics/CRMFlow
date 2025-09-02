import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompanyDocuments } from "@/services/companies";
import { useI18n } from "@/lib/i18n";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { FileList } from "@/components/documents/FileList";
import { FileUploader } from "@/components/documents/FileUploader";

interface CompanyDocumentsProps {
  companyId: string;
}

export function CompanyDocuments({ companyId }: CompanyDocumentsProps) {
  const { t } = useI18n();
  const { data: documents, isLoading } = useCompanyDocuments(companyId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("companies.documents")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-3 rounded-lg border">
                <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t("companies.documents")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FileUploader
          entityType="company"
          entityId={companyId}
          onUploadSuccess={() => {
            // The FileUploader will handle its own invalidation
          }}
        />
        
        {(!documents || documents.length === 0) ? (
          <EmptyState
            icon={FileText}
            title={t("companies.noDocumentsYet")}
            description={t("companies.noDocumentsDescription")}
          />
        ) : (
          <FileList
            files={documents}
            entityType="company"
            entityId={companyId}
          />
        )}
      </CardContent>
    </Card>
  );
}
