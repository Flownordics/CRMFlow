import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { uploadDocument } from "@/services/documents";
import { toastBus } from "@/lib/toastBus";
import { Upload, Loader2 } from "lucide-react";

export function FileUploader({
  onUploaded,
  entity,
}: {
  onUploaded: (f: { name: string; size: number; id: string }) => void;
  entity?: { type: string; id: string };
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      // Prepare metadata for the upload
      const meta = entity ? {
        companyId: entity.type === 'company' ? entity.id : undefined,
        dealId: entity.type === 'deal' ? entity.id : undefined,
        personId: entity.type === 'person' ? entity.id : undefined,
      } : {};

      // Upload document using the new API
      const document = await uploadDocument(file, meta);

      // Call onUploaded callback
      onUploaded({
        name: file.name,
        size: file.size,
        id: document.id
      });

      // Success toast
      toastBus.emit({
        title: "Upload Complete",
        description: `${file.name} has been uploaded successfully.`,
        variant: "success"
      });

    } catch (error) {
      console.error("File upload failed:", error);

      // Error toast
      toastBus.emit({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={ref}
        type="file"
        className="hidden"
        onChange={onPick}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif"
      />
      <Button
        disabled={busy}
        onClick={() => ref.current?.click()}
        variant="outline"
        size="sm"
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            {t("upload_file")}
          </>
        )}
      </Button>
    </div>
  );
}
