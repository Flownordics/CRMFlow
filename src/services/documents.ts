import { api, apiClient, apiPatchWithReturn, normalizeApiData } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { z } from "zod";
import { USE_MOCKS } from "@/lib/debug";
import { toastBus } from "@/lib/toastBus";
import { logger } from '@/lib/logger';
import { supabase } from "@/integrations/supabase/client";

// Document schema matching the database
export const Document = z.object({
    id: z.string().uuid(),
    file_name: z.string(),
    storage_path: z.string(),
    mime_type: z.string(),
    size_bytes: z.number(),
    created_by: z.string().uuid(),
    created_at: z.string(),
    company_id: z.string().uuid().nullable(),
    deal_id: z.string().uuid().nullable(),
    person_id: z.string().uuid().nullable(),
    // Related entity names for display
    company: z.object({ name: z.string() }).nullable(),
    deal: z.object({ title: z.string() }).nullable(),
    person: z.object({ full_name: z.string() }).nullable(),
});

export type Document = z.infer<typeof Document>;

// Document create schema
export const DocumentCreate = z.object({
    file_name: z.string(),
    storage_path: z.string(),
    mime_type: z.string(),
    size_bytes: z.number(),
    company_id: z.string().uuid().nullable(),
    deal_id: z.string().uuid().nullable(),
    person_id: z.string().uuid().nullable(),
});

export type DocumentCreate = z.infer<typeof DocumentCreate>;

// List documents with filters
export async function listDocuments(params: {
    limit?: number;
    offset?: number;
    companyId?: string;
    dealId?: string;
    personId?: string;
    mimeLike?: string;
    q?: string;
}) {
    if (USE_MOCKS) {
        // Mock data for development
        const mockDocuments = [
            {
                id: "550e8400-e29b-41d4-a716-446655440001",
                file_name: "contract.pdf",
                storage_path: "user1/1234567890-contract.pdf",
                mime_type: "application/pdf",
                size_bytes: 1024000,
                created_by: "550e8400-e29b-41d4-a716-446655440002",
                created_at: new Date().toISOString(),
                company_id: "550e8400-e29b-41d4-a716-446655440003",
                deal_id: "550e8400-e29b-41d4-a716-446655440004",
                person_id: null,
                company: { name: "Acme Corp" },
                deal: { title: "Website Redesign" },
                person: null,
            },
            {
                id: "550e8400-e29b-41d4-a716-446655440005",
                file_name: "proposal.docx",
                storage_path: "user1/1234567891-proposal.docx",
                mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                size_bytes: 512000,
                created_by: "550e8400-e29b-41d4-a716-446655440002",
                created_at: new Date().toISOString(),
                company_id: null,
                deal_id: null,
                person_id: "550e8400-e29b-41d4-a716-446655440006",
                company: null,
                deal: null,
                person: { full_name: "John Doe" },
            },
        ];
        return z.array(Document).parse(mockDocuments);
    }

    try {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.offset) queryParams.append('offset', params.offset.toString());
        if (params.companyId) queryParams.append('companyId', params.companyId);
        if (params.dealId) queryParams.append('dealId', params.dealId);
        if (params.personId) queryParams.append('personId', params.personId);
        if (params.mimeLike) queryParams.append('mimeLike', params.mimeLike);
        if (params.q) queryParams.append('q', params.q);

        const response = await apiClient.get(`/documents?${queryParams.toString()}`);
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[documents] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
        }

        return z.array(Document).parse(raw);
    } catch (error) {
        logger.error("Failed to fetch documents:", error);
        throw new Error("Failed to fetch documents");
    }
}

// Get presigned upload URL
export async function getPresignedUpload({ fileName, mimeType }: { fileName: string; mimeType: string }) {
    if (USE_MOCKS) {
        return {
            url: `https://mock-s3.example.com/upload/${fileName}`,
            path: `user1/${Date.now()}-${fileName}`,
        };
    }

    try {
        // Call Supabase Edge Function for presigned upload URL
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error("User not authenticated");
        }

        const response = await fetch(
            `${supabase.supabaseUrl}/functions/v1/document-upload`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ fileName, mimeType }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get upload URL');
        }

        const data = await response.json();
        return {
            url: data.url,
            path: data.path,
            token: data.token,
        };
    } catch (error) {
        logger.error("Failed to get presigned upload URL:", error);
        throw new Error("Failed to get upload URL");
    }
}

// Upload document
export async function uploadDocument(file: File, meta: {
    companyId?: string;
    dealId?: string;
    personId?: string;
}) {
    if (USE_MOCKS) {
        const mockDoc = {
            id: "550e8400-e29b-41d4-a716-446655440007",
            file_name: file.name,
            storage_path: `user1/${Date.now()}-${file.name}`,
            mime_type: file.type,
            size_bytes: file.size,
            created_by: "550e8400-e29b-41d4-a716-446655440002",
            created_at: new Date().toISOString(),
            company_id: meta.companyId || null,
            deal_id: meta.dealId || null,
            person_id: meta.personId || null,
            company: null,
            deal: null,
            person: null,
        };
        return Document.parse(mockDoc);
    }

    try {
        // Step 1: Get presigned upload URL
        const { url, path, token } = await getPresignedUpload({
            fileName: file.name,
            mimeType: file.type,
        });

        // Step 2: Upload file to Supabase Storage using signed URL
        const uploadResponse = await fetch(url, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type,
                'x-upsert': 'true', // Supabase Storage header
            },
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            logger.error("Storage upload failed:", errorText);
            throw new Error("Failed to upload file to storage");
        }

        // Step 3: Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        // Step 4: Insert document record in database
        const { data, error } = await supabase
            .from('documents')
            .insert({
                file_name: file.name,
                storage_path: path,
                mime_type: file.type,
                size_bytes: file.size,
                company_id: meta.companyId || null,
                deal_id: meta.dealId || null,
                person_id: meta.personId || null,
                created_by: user.id,
            })
            .select('*, company:company_id(name), deal:deal_id(title), person:person_id(full_name)')
            .single();

        if (error) {
            logger.error("Failed to create document record:", error);
            throw new Error("Failed to create document record");
        }

        return Document.parse(data);
    } catch (error) {
        logger.error("Failed to upload document:", error);
        throw new Error(error instanceof Error ? error.message : "Failed to upload document");
    }
}

// Get download URL
export async function getDownloadUrl(id: string) {
    if (USE_MOCKS) {
        return {
            url: `https://mock-s3.example.com/download/${id}`,
            filename: `document-${id}.pdf`,
        };
    }

    try {
        // Get document record
        const { data: document, error: docError } = await supabase
            .from('documents')
            .select('file_name, storage_path')
            .eq('id', id)
            .single();

        if (docError || !document) {
            logger.error("Failed to find document:", docError);
            throw new Error("Document not found");
        }

        // Generate signed download URL (valid for 60 seconds)
        const { data: signedUrl, error: urlError } = await supabase.storage
            .from('documents')
            .createSignedUrl(document.storage_path, 60);

        if (urlError || !signedUrl) {
            logger.error("Failed to generate download URL:", urlError);
            throw new Error("Failed to generate download URL");
        }

        return {
            url: signedUrl.signedUrl,
            filename: document.file_name,
        };
    } catch (error) {
        logger.error("Failed to get download URL:", error);
        throw new Error(error instanceof Error ? error.message : "Failed to get download URL");
    }
}

// Delete document
export async function deleteDocument(id: string) {
    if (USE_MOCKS) {
        return true;
    }

    try {
        await apiClient.delete(`/documents?id=eq.${id}`);
        return true;
    } catch (error) {
        logger.error("Failed to delete document:", error);
        throw new Error("Failed to delete document");
    }
}

// Update document relations
export async function updateDocumentRelations(id: string, relations: {
    companyId?: string | null;
    dealId?: string | null;
    personId?: string | null;
}) {
    if (USE_MOCKS) {
        const mockDoc = {
            id,
            file_name: "document.pdf",
            storage_path: "user1/1234567890-document.pdf",
            mime_type: "application/pdf",
            size_bytes: 1024000,
            created_by: "550e8400-e29b-41d4-a716-446655440002",
            created_at: new Date().toISOString(),
            company_id: relations.companyId,
            deal_id: relations.dealId,
            person_id: relations.personId,
            company: null,
            deal: null,
            person: null,
        };
        return Document.parse(mockDoc);
    }

    try {
        const response = await apiPatchWithReturn(`/documents?id=eq.${id}`, {
            company_id: relations.companyId,
            deal_id: relations.dealId,
            person_id: relations.personId,
        });
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[documents] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
        }

        // PostgREST returns arrays, so we need to handle that
        const documentData = Array.isArray(raw) ? raw[0] : raw;

        if (!documentData) {
            throw new Error("[documents] No document data returned from API");
        }

        return Document.parse(documentData);
    } catch (error) {
        logger.error("Failed to update document relations:", error);
        throw new Error("Failed to update document relations");
    }
}

// React Query hooks
export function useDocuments(params: {
    limit?: number;
    offset?: number;
    companyId?: string;
    dealId?: string;
    personId?: string;
    mimeLike?: string;
    q?: string;
}) {
    return useQuery({
        queryKey: qk.documents(params),
        queryFn: () => listDocuments(params),
    });
}

export function useUploadDocument() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ file, meta }: { file: File; meta: any }) => uploadDocument(file, meta),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.documents({}) });
            toastBus.emit({
                title: "Upload Complete",
                description: "Document has been uploaded successfully.",
                variant: "success"
            });
        },
        onError: (error) => {
            toastBus.emit({
                title: "Upload Failed",
                description: error instanceof Error ? error.message : "Failed to upload document",
                variant: "destructive"
            });
        }
    });
}

export function useDeleteDocument() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: deleteDocument,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.documents({}) });
            toastBus.emit({
                title: "Document Deleted",
                description: "Document has been deleted successfully.",
                variant: "success"
            });
        },
        onError: (error) => {
            toastBus.emit({
                title: "Delete Failed",
                description: error instanceof Error ? error.message : "Failed to delete document",
                variant: "destructive"
            });
        }
    });
}

export function useDownloadDocument() {
    return useMutation({
        mutationFn: getDownloadUrl,
        onSuccess: (data) => {
            // Open download in new window
            const link = document.createElement('a');
            link.href = data.url;
            link.download = data.filename;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toastBus.emit({
                title: "Download Started",
                description: `${data.filename} is being downloaded`,
                variant: "success"
            });
        },
        onError: (error) => {
            toastBus.emit({
                title: "Download Failed",
                description: error instanceof Error ? error.message : "Failed to get download URL",
                variant: "destructive"
            });
        }
    });
}

export function useUpdateDocumentRelations() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, relations }: { id: string; relations: any }) =>
            updateDocumentRelations(id, relations),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.documents({}) });
            toastBus.emit({
                title: "Relations Updated",
                description: "Document relations have been updated successfully.",
                variant: "success"
            });
        },
        onError: (error) => {
            toastBus.emit({
                title: "Update Failed",
                description: error instanceof Error ? error.message : "Failed to update document relations",
                variant: "destructive"
            });
        }
    });
}
