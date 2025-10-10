import { useState, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, Building2, Users, Handshake } from "lucide-react";
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
import { useUploadDocument } from "@/services/documents";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";
import { logger } from '@/lib/logger';

interface UploadDocumentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UploadDocumentModal({ open, onOpenChange }: UploadDocumentModalProps) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [entityType, setEntityType] = useState<string>("none");
    const [selectedEntity, setSelectedEntity] = useState<string>("");
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

    const uploadMutation = useUploadDocument();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setSelectedFiles(prev => [...prev, ...acceptedFiles]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-powerpoint': ['.ppt'],
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
            'text/plain': ['.txt'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/gif': ['.gif'],
            'image/webp': ['.webp'],
            'text/csv': ['.csv'],
            'application/json': ['.json'],
            'application/zip': ['.zip'],
            'application/x-rar-compressed': ['.rar'],
            'application/x-7z-compressed': ['.7z']
        },
        multiple: true
    });

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;

        const meta = {
            companyId: entityType === "company" && selectedEntity && selectedEntity !== "none" ? selectedEntity : undefined,
            dealId: entityType === "deal" && selectedEntity && selectedEntity !== "none" ? selectedEntity : undefined,
            personId: entityType === "person" && selectedEntity && selectedEntity !== "none" ? selectedEntity : undefined,
        };

        // Upload each file
        for (const file of selectedFiles) {
            try {
                setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

                await uploadMutation.mutateAsync({ file, meta });

                setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
            } catch (error) {
                logger.error(`Failed to upload ${file.name}:`, error);
                setUploadProgress(prev => ({ ...prev, [file.name]: -1 })); // Error state
            }
        }

        // Reset form and close modal
        setTimeout(() => {
            setSelectedFiles([]);
            setEntityType("none");
            setSelectedEntity("none");
            setUploadProgress({});
            onOpenChange(false);
        }, 1000);
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
            <AccessibleDialogContent className="max-w-2xl">
                <DialogTitle>Upload Document</DialogTitle>

                <div className="space-y-6">
                    {/* File Dropzone */}
                    <div
                        {...getRootProps()}
                        className={cn(
                            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                            "hover:border-primary hover:bg-primary/5"
                        )}
                    >
                        <input {...getInputProps()} />
                        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium mb-2">
                            {isDragActive ? "Drop files here" : "Drag & drop files here"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            or click to select files
                        </p>
                    </div>

                    {/* Selected Files */}
                    {selectedFiles.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="font-medium">Selected Files ({selectedFiles.length})</h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {selectedFiles.map((file, index) => (
                                    <div
                                        key={`${file.name}-${index}`}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{file.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatBytes(file.size)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {uploadProgress[file.name] !== undefined && (
                                                <div className="text-sm">
                                                    {uploadProgress[file.name] === -1 ? (
                                                        <span className="text-destructive">Failed</span>
                                                    ) : uploadProgress[file.name] === 100 ? (
                                                        <span className="text-green-600">Complete</span>
                                                    ) : (
                                                        <span>{uploadProgress[file.name]}%</span>
                                                    )}
                                                </div>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeFile(index)}
                                                aria-label="Remove file"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Relation Picker */}
                    <div className="space-y-4">
                        <h3 className="font-medium">Relate to (Optional)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <Select value={entityType} onValueChange={setEntityType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Entity type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="company">Company</SelectItem>
                                    <SelectItem value="deal">Deal</SelectItem>
                                    <SelectItem value="person">Person</SelectItem>
                                </SelectContent>
                            </Select>

                            {entityType !== "none" && (
                                <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={`Select ${entityType}`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {/* This would be populated with actual entities */}
                                        <SelectItem value="entity-1">Sample {entityType}</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {entityType !== "none" && selectedEntity && (
                            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                                <EntityIcon className="w-4 h-4" />
                                <span className="text-sm">
                                    Will be related to: <strong>Sample {entityType}</strong>
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-6 border-t">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={uploadMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={selectedFiles.length === 0 || uploadMutation.isPending}
                    >
                        {uploadMutation.isPending ? "Uploading..." : "Upload"}
                    </Button>
                </div>
            </AccessibleDialogContent>
        </Dialog>
    );
}
