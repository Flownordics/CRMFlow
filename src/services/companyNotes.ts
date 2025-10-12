import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { apiClient, normalizeApiData } from "@/lib/api";
import { handleError } from "@/lib/errorHandler";
import { logger } from "@/lib/logger";
import { CompanyNote, CompanyNoteCreate, CompanyNoteUpdate, companyNoteReadSchema } from "@/lib/schemas/companyNote";
import { z } from "zod";

// Fetch notes for a company
export async function fetchCompanyNotes(companyId: string) {
  try {
    const response = await apiClient.get(
      `/company_notes?company_id=eq.${companyId}&select=*&order=is_pinned.desc,created_at.desc`
    );
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[company_notes] Non-JSON response");
    }

    const notes = Array.isArray(raw) ? raw.map(note => ({
      id: note.id,
      companyId: note.company_id,
      userId: note.user_id,
      content: note.content,
      isPinned: note.is_pinned,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    })) : [];

    return z.array(companyNoteReadSchema).parse(notes);
  } catch (error) {
    logger.error("Failed to fetch company notes", { error, companyId }, 'CompanyNotes');
    return [];
  }
}

// Create a new note
export async function createCompanyNote(data: CompanyNoteCreate) {
  try {
    const response = await apiClient.post("/company_notes", {
      company_id: data.companyId,
      content: data.content,
      is_pinned: data.isPinned || false,
    }, {
      headers: {
        'Prefer': 'return=representation'
      }
    });
    
    const raw = normalizeApiData(response);
    if (typeof raw === "string") {
      throw new Error("[company_notes] Non-JSON response");
    }

    const note = Array.isArray(raw) ? raw[0] : raw;
    return companyNoteReadSchema.parse({
      id: note.id,
      companyId: note.company_id,
      userId: note.user_id,
      content: note.content,
      isPinned: note.is_pinned,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    });
  } catch (error) {
    throw handleError(error, 'createCompanyNote');
  }
}

// Update a note
export async function updateCompanyNote(id: string, data: CompanyNoteUpdate) {
  try {
    const dbData: any = {};
    if (data.content !== undefined) dbData.content = data.content;
    if (data.isPinned !== undefined) dbData.is_pinned = data.isPinned;

    const response = await apiClient.patch(`/company_notes?id=eq.${id}`, dbData, {
      headers: {
        'Prefer': 'return=representation'
      }
    });
    
    const raw = normalizeApiData(response);
    if (typeof raw === "string") {
      throw new Error("[company_notes] Non-JSON response");
    }

    const note = Array.isArray(raw) ? raw[0] : raw;
    return companyNoteReadSchema.parse({
      id: note.id,
      companyId: note.company_id,
      userId: note.user_id,
      content: note.content,
      isPinned: note.is_pinned,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    });
  } catch (error) {
    throw handleError(error, 'updateCompanyNote');
  }
}

// Delete a note
export async function deleteCompanyNote(id: string) {
  try {
    await apiClient.delete(`/company_notes?id=eq.${id}`);
  } catch (error) {
    throw handleError(error, 'deleteCompanyNote');
  }
}

// Toggle pin status
export async function toggleNotePin(id: string, isPinned: boolean) {
  return updateCompanyNote(id, { isPinned: !isPinned });
}

// React Query hooks
export function useCompanyNotes(companyId: string) {
  return useQuery({
    queryKey: qk.companyNotes(companyId),
    queryFn: () => fetchCompanyNotes(companyId),
    enabled: !!companyId,
  });
}

export function useCreateCompanyNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCompanyNote,
    onSuccess: (newNote) => {
      qc.invalidateQueries({ queryKey: qk.companyNotes(newNote.companyId) });
    },
  });
}

export function useUpdateCompanyNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, companyId }: { id: string; data: CompanyNoteUpdate; companyId: string }) => 
      updateCompanyNote(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: qk.companyNotes(variables.companyId) });
    },
  });
}

export function useDeleteCompanyNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, companyId }: { id: string; companyId: string }) => deleteCompanyNote(id),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: qk.companyNotes(variables.companyId) });
    },
  });
}

export function useToggleNotePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isPinned, companyId }: { id: string; isPinned: boolean; companyId: string }) => 
      toggleNotePin(id, isPinned),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: qk.companyNotes(variables.companyId) });
    },
  });
}

