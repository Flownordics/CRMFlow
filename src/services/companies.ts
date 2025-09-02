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
import { supabase } from "@/integrations/supabase/client";

// Response type for paginated results
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// Robust response schema that handles multiple formats
const CompaniesResponse = z.union([
  z.array(companyReadSchema),
  z.object({ data: z.array(companyReadSchema), total: z.number().optional(), page: z.number().optional(), limit: z.number().optional(), totalPages: z.number().optional() }),
  z.object({ items: z.array(companyReadSchema) }),
  z.object({ results: z.array(companyReadSchema) }),
]);

export async function fetchCompanies(params: {
  page?: number;
  limit?: number;
  q?: string;
  industry?: string;
  country?: string;
} = {}) {
  const { page = 1, limit = 20, q = "", industry, country } = params;

  if (USE_MOCKS) {
    const { data } = await api.get("/companies", {
      params: { page, limit, q, industry, country }
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
    console.error("Failed to fetch companies:", error);
    throw new Error("Failed to fetch companies");
  }
}

export async function fetchCompany(id: string) {
  if (USE_MOCKS) {
    const { data } = await api.get(`/companies/${id}`);
    return companyReadSchema.parse(data);
  }

  try {
    const response = await apiClient.get(`/companies?id=eq.${id}&select=*`);
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
    };

    return companyReadSchema.parse(mappedCompany);
  } catch (error) {
    console.error(`Failed to fetch company ${id}:`, error);
    throw new Error("Failed to fetch company");
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
    };

    return companyReadSchema.parse(mappedCompany);
  } catch (error) {
    console.error("Failed to create company:", error);
    throw new Error("Failed to create company");
  }
}

export async function updateCompany(id: string, patch: z.infer<typeof companyUpdateSchema>) {
  if (USE_MOCKS) {
    const { data } = await api.patch(`/companies/${id}`, patch);
    return companyReadSchema.parse(data);
  }

  try {
    // Map camelCase to DB snake_case
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
    };

    return companyReadSchema.parse(mappedCompany);
  } catch (error) {
    console.error("Failed to update company:", error);
    throw new Error("Failed to update company");
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
        `/companies?select=id,name,email,website&limit=100&order=name.asc`
      );
      const raw = normalizeApiData(response);

      if (typeof raw === "string") {
        throw new Error("[companies] Non-JSON response during search.");
      }

      const companies = z.array(companyReadSchema).parse(raw);
      return companies.slice(0, 20); // Limit to 20 results
    }

    // Properly encode the OR query for PostgREST
    const encodedTerm = encodeURIComponent(term);
    const orParam = encodeURIComponent(
      `name.ilike.*%${term}%*,email.ilike.*%${term}%*,website.ilike.*%${term}%*`
    );

    const response = await apiClient.get(
      `/companies?or=(${orParam})&select=id,name,email,website&limit=20`
    );
    const raw = normalizeApiData(response);

    if (typeof raw === "string") {
      throw new Error("[companies] Non-JSON response during search.");
    }

    const filteredCompanies = z.array(companyReadSchema).parse(raw);
    return filteredCompanies.slice(0, 20); // Limit to 20 results
  } catch (error) {
    console.error("Failed to search companies:", error);
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
    console.error("Failed to fetch company people:", error);
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
    console.error("Failed to fetch company deals:", error);
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
    console.error("Failed to fetch company documents:", error);
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
    console.error("Failed to fetch company activities:", error);
    return [];
  }
}

export function useCompanies(params: {
  page?: number;
  limit?: number;
  q?: string;
  industry?: string;
  country?: string;
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
