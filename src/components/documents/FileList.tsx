import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useDownloadDocument } from "@/services/documents";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, AlertCircle } from "lucide-react";

export function FileList({
  files,
}: {
  files: Array<{ id?: string; name: string; size?: number }>;
}) {
  const { t } = useI18n();
  const downloadMutation = useDownloadDocument();
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!files?.length)
    return <div className="text-muted-foreground">{t("no_documents_yet")}</div>;

  const handleDownload = async (file: { id?: string; name: string; size?: number }) => {
    if (!file.id) {
      return;
    }

    setErrors(prev => ({ ...prev, [file.id!]: "" }));

    try {
      const { url, filename } = await downloadMutation.mutateAsync(file.id);

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Download failed";
      setErrors(prev => ({ ...prev, [file.id!]: errorMessage }));
    }
  };

  const handleRetry = (file: { id?: string; name: string; size?: number }) => {
    if (file.id) {
      setErrors(prev => ({ ...prev, [file.id!]: "" }));
      handleDownload(file);
    }
  };

  return (
    <ul className="space-y-2">
      {files.map((f, i) => (
        <li
          key={f.id ?? i}
          className="flex items-center justify-between rounded border p-3"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate">{f.name}</span>
              {errors[f.id!] && (
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              )}
            </div>
            {errors[f.id!] && (
              <p className="text-xs text-destructive mt-1">{errors[f.id!]}</p>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {f.size ? `${Math.round(f.size / 1024)} KB` : ""}
            </span>

            {f.id && (
              <div className="flex gap-1">
                {errors[f.id] ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRetry(f)}
                    disabled={downloadMutation.isPending}
                    className="h-8 px-2"
                  >
                    <RefreshCw className={`h-3 w-3 ${downloadMutation.isPending ? 'animate-spin' : ''}`} />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(f)}
                    disabled={downloadMutation.isPending}
                    className="h-8 px-2"
                  >
                    <Download className={`h-3 w-3 ${downloadMutation.isPending ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
