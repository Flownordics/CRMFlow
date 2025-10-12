import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { apiClient, normalizeApiData } from "@/lib/api";
import { handleError } from "@/lib/errorHandler";
import { logger } from "@/lib/logger";
import { CompanyTag, CompanyTagCreate, CompanyTagUpdate, companyTagReadSchema } from "@/lib/schemas/companyTag";
import { z } from "zod";

// Fetch all company tags
export async function fetchCompanyTags() {
  try {
    const response = await apiClient.get("/company_tags?select=*&order=name.asc");
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[company_tags] Non-JSON response");
    }

    const tags = Array.isArray(raw) ? raw.map(tag => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      createdBy: tag.created_by,
      createdAt: tag.created_at,
      updatedAt: tag.updated_at,
    })) : [];

    return z.array(companyTagReadSchema).parse(tags);
  } catch (error) {
    throw handleError(error, 'fetchCompanyTags');
  }
}

// Fetch tags for a specific company
export async function fetchCompanyTagsForCompany(companyId: string) {
  try {
    const response = await apiClient.get(
      `/company_tag_assignments?company_id=eq.${companyId}&select=tag_id,company_tags(id,name,color)`
    );
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[company_tag_assignments] Non-JSON response");
    }

    const assignments = Array.isArray(raw) ? raw : [];
    const tags = assignments
      .filter(a => a.company_tags)
      .map(a => ({
        id: a.company_tags.id,
        name: a.company_tags.name,
        color: a.company_tags.color,
      }));

    return z.array(companyTagReadSchema.pick({ id: true, name: true, color: true })).parse(tags);
  } catch (error) {
    logger.error("Failed to fetch company tags", { error, companyId }, 'CompanyTags');
    return [];
  }
}

// Create a new tag
export async function createCompanyTag(data: CompanyTagCreate) {
  try {
    const response = await apiClient.post("/company_tags", {
      name: data.name,
      color: data.color,
    }, {
      headers: {
        'Prefer': 'return=representation'
      }
    });
    
    const raw = normalizeApiData(response);
    if (typeof raw === "string") {
      throw new Error("[company_tags] Non-JSON response");
    }

    const tag = Array.isArray(raw) ? raw[0] : raw;
    return companyTagReadSchema.parse({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      createdBy: tag.created_by,
      createdAt: tag.created_at,
      updatedAt: tag.updated_at,
    });
  } catch (error) {
    throw handleError(error, 'createCompanyTag');
  }
}

// Update a tag
export async function updateCompanyTag(id: string, data: CompanyTagUpdate) {
  try {
    const dbData: any = {};
    if (data.name !== undefined) dbData.name = data.name;
    if (data.color !== undefined) dbData.color = data.color;

    const response = await apiClient.patch(`/company_tags?id=eq.${id}`, dbData, {
      headers: {
        'Prefer': 'return=representation'
      }
    });
    
    const raw = normalizeApiData(response);
    if (typeof raw === "string") {
      throw new Error("[company_tags] Non-JSON response");
    }

    const tag = Array.isArray(raw) ? raw[0] : raw;
    return companyTagReadSchema.parse({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      createdBy: tag.created_by,
      createdAt: tag.created_at,
      updatedAt: tag.updated_at,
    });
  } catch (error) {
    throw handleError(error, 'updateCompanyTag');
  }
}

// Delete a tag
export async function deleteCompanyTag(id: string) {
  try {
    await apiClient.delete(`/company_tags?id=eq.${id}`);
  } catch (error) {
    throw handleError(error, 'deleteCompanyTag');
  }
}

// Assign tag to company
export async function assignTagToCompany(companyId: string, tagId: string) {
  try {
    await apiClient.post("/company_tag_assignments", {
      company_id: companyId,
      tag_id: tagId,
    });
  } catch (error) {
    throw handleError(error, 'assignTagToCompany');
  }
}

// Remove tag from company
export async function removeTagFromCompany(companyId: string, tagId: string) {
  try {
    await apiClient.delete(`/company_tag_assignments?company_id=eq.${companyId}&tag_id=eq.${tagId}`);
  } catch (error) {
    throw handleError(error, 'removeTagFromCompany');
  }
}

// Bulk assign tags to multiple companies
export async function bulkAssignTags(companyIds: string[], tagIds: string[]) {
  try {
    const assignments = companyIds.flatMap(companyId =>
      tagIds.map(tagId => ({
        company_id: companyId,
        tag_id: tagId,
      }))
    );

    await apiClient.post("/company_tag_assignments", assignments);
  } catch (error) {
    throw handleError(error, 'bulkAssignTags');
  }
}

// React Query hooks
export function useCompanyTags() {
  return useQuery({
    queryKey: qk.companyTags(),
    queryFn: fetchCompanyTags,
  });
}

export function useCompanyTagsForCompany(companyId: string) {
  return useQuery({
    queryKey: qk.companyTagsForCompany(companyId),
    queryFn: () => fetchCompanyTagsForCompany(companyId),
    enabled: !!companyId,
  });
}

export function useCreateCompanyTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCompanyTag,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.companyTags() });
    },
  });
}

export function useUpdateCompanyTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompanyTagUpdate }) => updateCompanyTag(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.companyTags() });
    },
  });
}

export function useDeleteCompanyTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCompanyTag,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.companyTags() });
    },
  });
}

export function useAssignTagToCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, tagId }: { companyId: string; tagId: string }) => 
      assignTagToCompany(companyId, tagId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: qk.companyTagsForCompany(variables.companyId) });
      qc.invalidateQueries({ queryKey: qk.companies() });
    },
  });
}

export function useRemoveTagFromCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, tagId }: { companyId: string; tagId: string }) => 
      removeTagFromCompany(companyId, tagId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: qk.companyTagsForCompany(variables.companyId) });
      qc.invalidateQueries({ queryKey: qk.companies() });
    },
  });
}

export function useBulkAssignTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ companyIds, tagIds }: { companyIds: string[]; tagIds: string[] }) => 
      bulkAssignTags(companyIds, tagIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.companyTags() });
      qc.invalidateQueries({ queryKey: qk.companies() });
    },
  });
}

