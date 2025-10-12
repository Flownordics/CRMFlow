import { api, apiClient, apiPostWithReturn, normalizeApiData } from "../lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { z } from "zod";
import { companyReadSchema, companyCreateSchema, companyUpdateSchema, type Company } from "@/lib/schemas/company";
import { personReadSchema, type Person } from "@/lib/schemas/person";
import { Deal } from "./deals";
import { Document } from "./documents";
import { Activity } from "./activity";
import { USE_MOCKS } from "@/lib/debug";
import { handleError } from "@/lib/errorHandler";
import { logger } from "@/lib/logger";

// Response type for paginated results
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// Robust response schema that handles multiple formats (unused currently)
// const CompaniesResponse = z.union([
//   z.array(companyReadSchema),
//   z.object({ data: z.array(companyReadSchema), total: z.number().optional(), page: z.number().optional(), limit: z.number().optional(), totalPages: z.number().optional() }),
//   z.object({ items: z.array(companyReadSchema) }),
//   z.object({ results: z.array(companyReadSchema) }),
// ]);

export async function fetchCompanies(params: {
  page?: number;
  limit?: number;
  q?: string;
  industry?: string;
  country?: string;
  activityStatus?: string;
} = {}) {
  const { page = 1, limit = 20, q = "", industry, country, activityStatus } = params;

  if (USE_MOCKS) {
    const { data } = await api.get("/companies", {
      params: { 
        page, 
        limit, 
        q, 
        ...(industry && { industry }),
        ...(country && { country }),
        ...(activityStatus && { activityStatus })
      }
    });
    const companies = z.array(companyReadSchema).parse(data);
    return {
      data: companies,
      total: companies.length,
      page: 1,
      limit: companies.length,
      totalPages: 1
    } as PaginatedResponse<Company>;
  }

  try {
    // Build query string for Supabase REST API
    const queryParams = new URLSearchParams();

    // Standard Supabase REST parameters
    queryParams.append('select', '*');
    queryParams.append('order', 'updated_at.desc');
    
    // Filter out soft-deleted records
    queryParams.append('deleted_at', 'is.null');

    // Pagination
    const offset = (page - 1) * limit;
    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());

    // Text search - Supabase uses 'or' with ilike for text search
    if (q) {
      const encodedQuery = q.replace(/%/g, '\\%'); // Escape % in the search term
      queryParams.append('or', `(name.ilike.%${encodedQuery}%,domain.ilike.%${encodedQuery}%,email.ilike.%${encodedQuery}%)`);
    }

    // Industry filter
    if (industry) {
      queryParams.append('industry', `eq.${industry}`);
    }

    // Country filter
    if (country) {
      queryParams.append('country', `eq.${country}`);
    }

    // Activity status filter
    if (activityStatus) {
      queryParams.append('activity_status', `eq.${activityStatus}`);
    }

    const url = `/companies?${queryParams.toString()}`;
    const response = await apiClient.get(url);
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      // Content var HTML eller plain text → typisk CORS/401/404/HTML-fejl
      throw new Error("[companies] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
    }

    // Map DB snake_case to camelCase for all companies
    const companies = Array.isArray(raw) ? raw.map(company => ({
      id: company.id,
      name: company.name,
      email: company.email,
      invoiceEmail: company.invoice_email,
      domain: company.domain,
      vat: company.vat,
      phone: company.phone,
      address: company.address,
      city: company.city,
      country: company.country,
      industry: company.industry,
      website: company.website,
      createdAt: company.created_at,
      updatedAt: company.updated_at,
      lastActivityAt: company.last_activity_at,
      activityStatus: company.activity_status,
      doNotCall: company.do_not_call,
      // Enhanced fields
      employeeCount: company.employee_count,
      annualRevenueRange: company.annual_revenue_range,
      lifecycleStage: company.lifecycle_stage,
      linkedinUrl: company.linkedin_url,
      twitterUrl: company.twitter_url,
      facebookUrl: company.facebook_url,
      description: company.description,
      foundedDate: company.founded_date,
      parentCompanyId: company.parent_company_id,
    })) : [];

    // Parse the mapped companies array
    const parsedCompanies = z.array(companyReadSchema).parse(companies);

    // Read total from x-total-count header (fallback to array length)
    const total = parseInt(response.headers['x-total-count'] || response.headers['content-range']?.split('/')?.[1] || companies.length.toString());

    return {
      data: parsedCompanies,
      total: total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit)
    } as PaginatedResponse<Company>;
  } catch (error) {
    throw handleError(error, 'fetchCompanies');
  }
}

export async function fetchCompany(id: string) {
  if (USE_MOCKS) {
    const { data } = await api.get(`/companies/${id}`);
    return companyReadSchema.parse(data);
  }

  try {
    const response = await apiClient.get(`/companies?id=eq.${id}&deleted_at=is.null&select=*`);
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[company] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
    }

    // Handle array response from Supabase
    const companies = Array.isArray(raw) ? raw : [raw];
    if (companies.length === 0) {
      throw new Error("Company not found");
    }

    // Map DB snake_case to camelCase
    const company = companies[0];
    const mappedCompany = {
      id: company.id,
      name: company.name,
      email: company.email,
      invoiceEmail: company.invoice_email,
      domain: company.domain,
      vat: company.vat,
      phone: company.phone,
      address: company.address,
      city: company.city,
      country: company.country,
      industry: company.industry,
      website: company.website,
      createdAt: company.created_at,
      updatedAt: company.updated_at,
      lastActivityAt: company.last_activity_at,
      activityStatus: company.activity_status,
      doNotCall: company.do_not_call,
      // Enhanced fields
      employeeCount: company.employee_count,
      annualRevenueRange: company.annual_revenue_range,
      lifecycleStage: company.lifecycle_stage,
      linkedinUrl: company.linkedin_url,
      twitterUrl: company.twitter_url,
      facebookUrl: company.facebook_url,
      description: company.description,
      foundedDate: company.founded_date,
      parentCompanyId: company.parent_company_id,
    };

    return companyReadSchema.parse(mappedCompany);
  } catch (error) {
    throw handleError(error, `fetchCompany(${id})`);
  }
}

export async function createCompany(companyData: z.infer<typeof companyCreateSchema>) {
  if (USE_MOCKS) {
    const { data } = await api.post("/companies", companyData);
    return companyReadSchema.parse(data);
  }

  try {
    // Map camelCase to DB snake_case
    const dbData = {
      name: companyData.name,
      email: companyData.email?.toLowerCase(),
      invoice_email: companyData.invoiceEmail?.toLowerCase(),
      vat: companyData.vat,
      phone: companyData.phone,
      address: companyData.address,
      city: companyData.city,
      country: companyData.country,
      industry: companyData.industry,
      website: companyData.website,
      do_not_call: companyData.doNotCall ?? false,
      // Enhanced fields
      employee_count: companyData.employeeCount,
      annual_revenue_range: companyData.annualRevenueRange,
      lifecycle_stage: companyData.lifecycleStage,
      linkedin_url: companyData.linkedinUrl,
      twitter_url: companyData.twitterUrl,
      facebook_url: companyData.facebookUrl,
      description: companyData.description,
      founded_date: companyData.foundedDate,
      parent_company_id: companyData.parentCompanyId,
    };

    const response = await apiPostWithReturn("/companies", dbData);
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[company] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
    }

    // PostgREST returns arrays, so we need to handle that
    const createdCompany = Array.isArray(raw) ? raw[0] : raw;

    if (!createdCompany) {
      throw new Error("[company] No company data returned from API");
    }

    // Map response back to camelCase
    const mappedCompany = {
      id: createdCompany.id,
      name: createdCompany.name,
      email: createdCompany.email,
      invoiceEmail: createdCompany.invoice_email,
      vat: createdCompany.vat,
      phone: createdCompany.phone,
      address: createdCompany.address,
      city: createdCompany.city,
      country: createdCompany.country,
      industry: createdCompany.industry,
      website: createdCompany.website,
      createdAt: createdCompany.created_at,
      updatedAt: createdCompany.updated_at,
      lastActivityAt: createdCompany.last_activity_at,
      activityStatus: createdCompany.activity_status,
      doNotCall: createdCompany.do_not_call,
      // Enhanced fields
      employeeCount: createdCompany.employee_count,
      annualRevenueRange: createdCompany.annual_revenue_range,
      lifecycleStage: createdCompany.lifecycle_stage,
      linkedinUrl: createdCompany.linkedin_url,
      twitterUrl: createdCompany.twitter_url,
      facebookUrl: createdCompany.facebook_url,
      description: createdCompany.description,
      foundedDate: createdCompany.founded_date,
      parentCompanyId: createdCompany.parent_company_id,
    };

    return companyReadSchema.parse(mappedCompany);
  } catch (error) {
    throw handleError(error, 'createCompany');
  }
}

export async function updateCompany(id: string, patch: z.infer<typeof companyUpdateSchema>) {
  if (USE_MOCKS) {
    const { data } = await api.patch(`/companies/${id}`, patch);
    return companyReadSchema.parse(data);
  }

  // Map camelCase to DB snake_case (declare outside try-catch for error logging)
  const dbPatch: any = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.email !== undefined) dbPatch.email = patch.email?.toLowerCase();
  if (patch.invoiceEmail !== undefined) dbPatch.invoice_email = patch.invoiceEmail?.toLowerCase();
  if (patch.vat !== undefined) dbPatch.vat = patch.vat;
  if (patch.phone !== undefined) dbPatch.phone = patch.phone;
  if (patch.address !== undefined) dbPatch.address = patch.address;
  if (patch.city !== undefined) dbPatch.city = patch.city;
  if (patch.country !== undefined) dbPatch.country = patch.country;
  if (patch.industry !== undefined) dbPatch.industry = patch.industry;
  if (patch.website !== undefined) dbPatch.website = patch.website;
  if (patch.doNotCall !== undefined) dbPatch.do_not_call = patch.doNotCall;
  // Enhanced fields
  if (patch.employeeCount !== undefined) dbPatch.employee_count = patch.employeeCount;
  if (patch.annualRevenueRange !== undefined) dbPatch.annual_revenue_range = patch.annualRevenueRange;
  if (patch.lifecycleStage !== undefined) dbPatch.lifecycle_stage = patch.lifecycleStage;
  if (patch.linkedinUrl !== undefined) dbPatch.linkedin_url = patch.linkedinUrl;
  if (patch.twitterUrl !== undefined) dbPatch.twitter_url = patch.twitterUrl;
  if (patch.facebookUrl !== undefined) dbPatch.facebook_url = patch.facebookUrl;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.foundedDate !== undefined) dbPatch.founded_date = patch.foundedDate;
  if (patch.parentCompanyId !== undefined) dbPatch.parent_company_id = patch.parentCompanyId;

  try {
    
    const response = await apiClient.patch(`/companies?id=eq.${id}`, dbPatch);
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[company] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
    }

    // Map response back to camelCase
    const companies = Array.isArray(raw) ? raw : [raw];
    if (companies.length === 0) {
      throw new Error("Company not found");
    }

    const company = companies[0];
    const mappedCompany = {
      id: company.id,
      name: company.name,
      email: company.email,
      invoiceEmail: company.invoice_email,
      vat: company.vat,
      phone: company.phone,
      address: company.address,
      city: company.city,
      country: company.country,
      industry: company.industry,
      website: company.website,
      createdAt: company.created_at,
      updatedAt: company.updated_at,
      lastActivityAt: company.last_activity_at,
      activityStatus: company.activity_status,
      doNotCall: company.do_not_call,
      // Enhanced fields
      employeeCount: company.employee_count,
      annualRevenueRange: company.annual_revenue_range,
      lifecycleStage: company.lifecycle_stage,
      linkedinUrl: company.linkedin_url,
      twitterUrl: company.twitter_url,
      facebookUrl: company.facebook_url,
      description: company.description,
      foundedDate: company.founded_date,
      parentCompanyId: company.parent_company_id,
    };

    return companyReadSchema.parse(mappedCompany);
  } catch (error: any) {
    logger.error("Failed to update company", { 
      error, 
      companyId: id,
      errorMessage: error?.message,
      errorResponse: error?.response?.data,
      errorStatus: error?.response?.status,
      dbPatch
    }, 'CompanyUpdate');
    throw handleError(error, 'updateCompany');
  }
}

export async function searchCompanies(query: string) {
  if (USE_MOCKS) {
    const { data } = await api.get("/companies", { params: { q: query } });
    return z.array(companyReadSchema).parse(data);
  }

  const term = query.trim();

  try {
    if (!term) {
      // Return all companies when no search term
      const response = await apiClient.get(
        `/companies?select=id,name,email,website,do_not_call&deleted_at=is.null&limit=100&order=name.asc`
      );
      const raw = normalizeApiData(response);

      if (typeof raw === "string") {
        throw new Error("[companies] Non-JSON response during search.");
      }

      const companies = z.array(companyReadSchema).parse(raw);
      return companies.slice(0, 20); // Limit to 20 results
    }

    // Properly encode the OR query for PostgREST
    const orParam = encodeURIComponent(
      `name.ilike.*%${term}%*,email.ilike.*%${term}%*,website.ilike.*%${term}%*`
    );

    const response = await apiClient.get(
      `/companies?or=(${orParam})&deleted_at=is.null&select=id,name,email,website,do_not_call&limit=20`
    );
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[companies] Non-JSON response during search.");
    }

    const filteredCompanies = z.array(companyReadSchema).parse(raw);
    return filteredCompanies.slice(0, 20); // Limit to 20 results
  } catch (error) {
    logger.error("Failed to search companies", { error, query }, 'CompanySearch');
    throw new Error("Failed to search companies");
  }
}

// Fetch people associated with a company
async function fetchCompanyPeopleData(companyId: string): Promise<Person[]> {
  if (USE_MOCKS) {
    const { data } = await api.get("/people", { params: { company_id: companyId } });
    // Map mock data from snake_case to camelCase
    const people = Array.isArray(data) ? data : [data];
    const mappedPeople = people.map((person: any) => ({
      id: person.id,
      firstName: person.first_name,
      lastName: person.last_name,
      email: person.email,
      phone: person.phone,
      title: person.title,
      companyId: person.company_id,
      createdAt: person.created_at,
      updatedAt: person.updated_at,
    }));
    return z.array(personReadSchema).parse(mappedPeople);
  }

  try {
    const response = await apiClient.get(`/people?company_id=eq.${companyId}&select=*&order=updated_at.desc`);
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[people] Non-JSON response.");
    }

    // Map snake_case to camelCase for Person data
    const people = Array.isArray(raw) ? raw : [raw];
    const mappedPeople = people.map((person: any) => ({
      id: person.id,
      firstName: person.first_name,
      lastName: person.last_name,
      email: person.email,
      phone: person.phone,
      title: person.title,
      companyId: person.company_id,
      createdAt: person.created_at,
      updatedAt: person.updated_at,
    }));

    return z.array(personReadSchema).parse(mappedPeople);
  } catch (error) {
    logger.error("Failed to fetch company people", { error, companyId }, 'CompanyPeople');
    return [];
  }
}

// Fetch deals associated with a company
async function fetchCompanyDealsData(companyId: string): Promise<Deal[]> {
  if (USE_MOCKS) {
    const { data } = await api.get("/deals", { params: { company_id: companyId } });
    return z.array(Deal).parse(data);
  }

  try {
    const response = await apiClient.get(`/deals?company_id=eq.${companyId}&select=*&order=updated_at.desc`);
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[deals] Non-JSON response.");
    }

    return z.array(Deal).parse(raw);
  } catch (error) {
    logger.error("Failed to fetch company deals", { error, companyId }, 'CompanyDeals');
    return [];
  }
}

// Fetch documents associated with a company
async function fetchCompanyDocumentsData(companyId: string): Promise<Document[]> {
  if (USE_MOCKS) {
    const { data } = await api.get("/documents", { params: { company_id: companyId } });
    return z.array(Document).parse(data);
  }

  try {
    const response = await apiClient.get(`/documents?company_id=eq.${companyId}&select=*&order=created_at.desc`);
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[documents] Non-JSON response.");
    }

    return z.array(Document).parse(raw);
  } catch (error) {
    logger.error("Failed to fetch company documents", { error, companyId }, 'CompanyDocuments');
    return [];
  }
}

// Fetch activities associated with a company (via deals)
async function fetchCompanyActivitiesData(companyId: string): Promise<Activity[]> {
  if (USE_MOCKS) {
    const { data } = await api.get("/activities", { params: { company_id: companyId } });
    return z.array(Activity).parse(data);
  }

  try {
    // First get all deals for this company
    const dealsResponse = await apiClient.get(`/deals?company_id=eq.${companyId}&select=id`);
    const deals = normalizeApiData(dealsResponse);

    if (typeof deals === "string" || !Array.isArray(deals)) {
      return [];
    }

    const dealIds = deals.map((deal: any) => deal.id);

    if (dealIds.length === 0) {
      return [];
    }

    // Then get activities for these deals
    const dealIdsParam = dealIds.map(id => `deal_id=eq.${id}`).join(',');
    const response = await apiClient.get(`/activities?or=(${dealIdsParam})&select=*&order=created_at.desc`);
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[activities] Non-JSON response.");
    }

    return z.array(Activity).parse(raw);
  } catch (error) {
    logger.error("Failed to fetch company activities", { error, companyId }, 'CompanyActivities');
    return [];
  }
}

export function useCompanies(params: {
  page?: number;
  limit?: number;
  q?: string;
  industry?: string;
  country?: string;
  activityStatus?: string;
} = {}) {
  return useQuery({
    queryKey: qk.companies(params),
    queryFn: () => fetchCompanies(params)
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: qk.company(id),
    queryFn: () => fetchCompany(id),
    enabled: !!id
  });
}

export function useCompanyPeople(id: string) {
  return useQuery({
    queryKey: qk.companyPeople(id),
    queryFn: () => fetchCompanyPeopleData(id),
    enabled: !!id
  });
}

export function useCompanyDeals(id: string) {
  return useQuery({
    queryKey: qk.companyDeals(id),
    queryFn: () => fetchCompanyDealsData(id),
    enabled: !!id
  });
}

export function useCompanyDocuments(id: string) {
  return useQuery({
    queryKey: qk.companyDocuments(id),
    queryFn: () => fetchCompanyDocumentsData(id),
    enabled: !!id
  });
}

export function useCompanyActivities(id: string) {
  return useQuery({
    queryKey: qk.companyActivities(id),
    queryFn: () => fetchCompanyActivitiesData(id),
    enabled: !!id
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCompany,
    onSuccess: (newCompany) => {
      qc.invalidateQueries({ queryKey: qk.companies() });
      qc.invalidateQueries({ queryKey: qk.company(newCompany.id) });
    }
  });
}

export function useUpdateCompany(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: z.infer<typeof companyUpdateSchema>) => updateCompany(id, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.company(id) });
      qc.invalidateQueries({ queryKey: qk.companies() });
    }
  });
}

// Soft delete a company
export async function deleteCompany(id: string) {
  if (USE_MOCKS) {
    const { data } = await api.delete(`/companies/${id}`);
    return data;
  }

  try {
    // Soft delete by setting deleted_at timestamp
    const response = await apiClient.patch(`/companies?id=eq.${id}`, {
      deleted_at: new Date().toISOString()
    });
    return response.data;
  } catch (error) {
    logger.error("Failed to delete company", { error, companyId: id }, 'CompanyDelete');
    throw new Error("Failed to delete company");
  }
}

// Restore a soft-deleted company
export async function restoreCompany(id: string) {
  try {
    const response = await apiClient.patch(`/companies?id=eq.${id}`, {
      deleted_at: null
    });
    return response.data;
  } catch (error) {
    logger.error("Failed to restore company", { error, companyId: id }, 'CompanyRestore');
    throw new Error("Failed to restore company");
  }
}

// Fetch deleted companies
export async function fetchDeletedCompanies(limit: number = 50) {
  try {
    const response = await apiClient.get(
      `/companies?deleted_at=not.is.null&select=*&order=deleted_at.desc&limit=${limit}`
    );
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[companies] Non-JSON response.");
    }

    const companies = Array.isArray(raw) ? raw.map(company => ({
      id: company.id,
      name: company.name,
      email: company.email,
      invoiceEmail: company.invoice_email,
      domain: company.domain,
      deletedAt: company.deleted_at,
      createdAt: company.created_at,
      updatedAt: company.updated_at,
    })) : [];

    return z.array(companyReadSchema.extend({ deletedAt: z.string().optional() })).parse(companies);
  } catch (error) {
    logger.error("Failed to fetch deleted companies", { error }, 'DeletedCompanies');
    throw new Error("Failed to fetch deleted companies");
  }
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCompany,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: qk.companies() });
      qc.invalidateQueries({ queryKey: qk.company(id) });
    }
  });
}

export function useRestoreCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: restoreCompany,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: qk.companies() });
      qc.invalidateQueries({ queryKey: qk.company(id) });
    }
  });
}

export function useDeletedCompanies() {
  return useQuery({
    queryKey: ['deleted-companies'],
    queryFn: () => fetchDeletedCompanies(50)
  });
}
