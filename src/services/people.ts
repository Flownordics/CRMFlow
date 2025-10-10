import { api, apiClient, apiPostWithReturn, normalizeApiData } from "../lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { z } from "zod";
import { Person, PersonCreate, personReadSchema, type Person as PersonCamelCase } from "@/lib/schemas/person";
import { USE_MOCKS } from "@/lib/debug";
import { logger } from '@/lib/logger';

// Response type for paginated results
export type PaginatedResponse<T> = {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

// Robust response schema that handles multiple formats
const PeopleResponse = z.union([
    z.array(Person),
    z.object({ data: z.array(Person), total: z.number().optional(), page: z.number().optional(), limit: z.number().optional(), totalPages: z.number().optional() }),
    z.object({ items: z.array(Person) }),
    z.object({ results: z.array(Person) }),
]);

export async function fetchPeople(params: {
    page?: number;
    limit?: number;
    q?: string;
    company_id?: string;
    title?: string;
} = {}) {
    const { page = 1, limit = 20, q = "", company_id, title } = params;

    if (USE_MOCKS) {
        const { data } = await api.get("/people", {
            params: { page, limit, q, company_id, title }
        });
        const people = z.array(Person).parse(data);
        return {
            data: people,
            total: people.length,
            page: 1,
            limit: people.length,
            totalPages: 1
        } as PaginatedResponse<z.infer<typeof Person>>;
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
            queryParams.append('or', `(first_name.ilike.%${encodedQuery}%,last_name.ilike.%${encodedQuery}%,email.ilike.%${encodedQuery}%)`);
        }

        // Company filter
        if (company_id) {
            queryParams.append('company_id', `eq.${company_id}`);
        }

        // Title filter
        if (title) {
            queryParams.append('title', `eq.${title}`);
        }

        const url = `/people?${queryParams.toString()}`;
        const response = await apiClient.get(url);
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            // Content var HTML eller plain text → typisk CORS/401/404/HTML-fejl
            throw new Error("[people] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
        }

        // Parse the people array
        const people = z.array(Person).parse(raw);

        // Read total from x-total-count header (fallback to array length)
        const total = parseInt(response.headers['x-total-count'] || response.headers['content-range']?.split('/')?.[1] || people.length.toString());

        return {
            data: people,
            total: total,
            page: page,
            limit: limit,
            totalPages: Math.ceil(total / limit)
        } as PaginatedResponse<z.infer<typeof Person>>;
    } catch (error) {
        logger.error("Failed to fetch people:", error);
        throw new Error("Failed to fetch people");
    }
}

export async function fetchPersonById(id: string) {
    if (USE_MOCKS) {
        const { data } = await api.get(`/people/${id}`);
        return personReadSchema.parse(data);
    }

    try {
        const response = await apiClient.get(`/people?id=eq.${id}&select=*`);
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[person] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
        }

        // Handle array response from Supabase
        if (Array.isArray(raw)) {
            if (raw.length === 0) {
                throw new Error("Person not found");
            }
            // Convert snake_case to camelCase
            const person = raw[0];
            const camelCasePerson = {
                id: person.id,
                companyId: person.company_id,
                firstName: person.first_name,
                lastName: person.last_name,
                email: person.email,
                phone: person.phone,
                title: person.title,
                createdAt: person.created_at,
                updatedAt: person.updated_at,
            };
            return personReadSchema.parse(camelCasePerson);
        }

        return personReadSchema.parse(raw);
    } catch (error) {
        logger.error(`Failed to fetch person ${id}:`, error);
        throw new Error("Failed to fetch person");
    }
}

export async function fetchPersonDeals(id: string) {
    if (USE_MOCKS) {
        const { data } = await api.get(`/deals`, {
            params: { contact_id: id }
        });
        return z.array(z.any()).parse(data);
    }

    try {
        const response = await apiClient.get(`/deals?contact_id=eq.${id}&select=*&order=updated_at.desc`);
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[person deals] Non-JSON response.");
        }

        return Array.isArray(raw) ? raw : [];
    } catch (error) {
        logger.error(`Failed to fetch person deals ${id}:`, error);
        throw new Error("Failed to fetch person deals");
    }
}

export async function fetchPersonDocuments(id: string) {
    if (USE_MOCKS) {
        const { data } = await api.get(`/documents`, {
            params: { person_id: id }
        });
        return z.array(z.any()).parse(data);
    }

    try {
        const response = await apiClient.get(`/documents?person_id=eq.${id}&select=*&order=created_at.desc`);
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[person documents] Non-JSON response.");
        }

        return Array.isArray(raw) ? raw : [];
    } catch (error) {
        logger.error(`Failed to fetch person documents ${id}:`, error);
        throw new Error("Failed to fetch person documents");
    }
}

export async function fetchPersonActivities(id: string) {
    if (USE_MOCKS) {
        const { data } = await api.get(`/activities`, {
            params: { person_id: id }
        });
        return z.array(z.any()).parse(data);
    }

    try {
        // First get deals for this person, then get activities for those deals
        const dealsResponse = await apiClient.get(`/deals?contact_id=eq.${id}&select=id`);
        const deals = normalizeApiData(dealsResponse);

        if (!Array.isArray(deals) || deals.length === 0) {
            return [];
        }

        const dealIds = deals.map((deal: any) => deal.id);
        const activitiesPromises = dealIds.map(dealId =>
            apiClient.get(`/activities?deal_id=eq.${dealId}&select=*&order=created_at.desc`)
        );

        const activitiesResponses = await Promise.all(activitiesPromises);
        const allActivities = activitiesResponses.flatMap(response => {
            const raw = normalizeApiData(response);
            return Array.isArray(raw) ? raw : [];
        });

        return allActivities;
    } catch (error) {
        logger.error(`Failed to fetch person activities ${id}:`, error);
        throw new Error("Failed to fetch person activities");
    }
}

export async function fetchPerson(id: string) {
    if (USE_MOCKS) {
        const { data } = await api.get(`/people/${id}`);
        return Person.parse(data);
    }

    try {
        const response = await apiClient.get(`/people?id=eq.${id}&deleted_at=is.null&select=*`);
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[person] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
        }

        // Handle array response from Supabase
        if (Array.isArray(raw)) {
            if (raw.length === 0) {
                throw new Error("Person not found");
            }
            return Person.parse(raw[0]);
        }

        return Person.parse(raw);
    } catch (error) {
        logger.error(`Failed to fetch person ${id}:`, error);
        throw new Error("Failed to fetch person");
    }
}

export async function createPerson(payload: z.infer<typeof PersonCreate>) {
    if (USE_MOCKS) {
        const { data } = await api.post("/people", payload);
        return Person.parse(data);
    }

    try {
        // Normalize email to lowercase
        const normalizedPayload = {
            ...payload,
            email: payload.email?.toLowerCase() || null
        };

        // Filter out null values
        const cleanPayload = Object.fromEntries(
            Object.entries(normalizedPayload).filter(([_, value]) => value !== null)
        );

        // Create the person with return representation
        const response = await apiPostWithReturn("/people", cleanPayload);
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[person] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
        }

        // PostgREST returns arrays, so we need to handle that
        const createdPerson = Array.isArray(raw) ? raw[0] : raw;

        if (!createdPerson) {
            throw new Error("[person] No person data returned from API");
        }

        return Person.parse(createdPerson);
    } catch (error) {
        logger.error("Failed to create person:", error);
        throw new Error("Failed to create person");
    }
}

export async function updatePerson(id: string, patch: Partial<Person>) {
    if (USE_MOCKS) {
        const { data } = await api.patch(`/people/${id}`, patch);
        return Person.parse(data);
    }

    try {
        // Normalize email to lowercase
        const normalizedPatch = {
            ...patch,
            email: patch.email?.toLowerCase() || null
        };

        // Filter out null values
        const cleanPatch = Object.fromEntries(
            Object.entries(normalizedPatch).filter(([_, value]) => value !== null)
        );

        const response = await apiClient.patch(`/people?id=eq.${id}`, cleanPatch);
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[person] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
        }

        return Person.parse(raw);
    } catch (error) {
        logger.error(`Failed to update person ${id}:`, error);
        throw new Error("Failed to update person");
    }
}

// Soft delete a person
export async function deletePerson(id: string) {
    if (USE_MOCKS) {
        const { data } = await api.delete(`/people/${id}`);
        return data;
    }

    try {
        // Soft delete by setting deleted_at timestamp
        const response = await apiClient.patch(`/people?id=eq.${id}`, {
            deleted_at: new Date().toISOString()
        });
        return response.data;
    } catch (error) {
        logger.error(`Failed to delete person ${id}:`, error);
        throw new Error("Failed to delete person");
    }
}

// Restore a soft-deleted person
export async function restorePerson(id: string) {
    try {
        const response = await apiClient.patch(`/people?id=eq.${id}`, {
            deleted_at: null
        });
        return response.data;
    } catch (error) {
        logger.error(`Failed to restore person ${id}:`, error);
        throw new Error("Failed to restore person");
    }
}

// Fetch deleted people
export async function fetchDeletedPeople(limit: number = 50) {
    try {
        const response = await apiClient.get(
            `/people?deleted_at=not.is.null&select=*&order=deleted_at.desc&limit=${limit}`
        );
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[people] Non-JSON response.");
        }

        return z.array(Person).parse(raw);
    } catch (error) {
        logger.error("Failed to fetch deleted people", { error }, 'DeletedPeople');
        throw new Error("Failed to fetch deleted people");
    }
}

export async function searchPeople(q: string, companyId?: string) {
    if (USE_MOCKS) {
        const { data } = await api.get("/people", { params: { q, companyId, limit: 20 } });
        return data as Array<{ id: string; firstName: string; lastName: string }>;
    }

    try {
        // Use a simpler approach - fetch people and filter client-side
        // This avoids complex URL encoding issues with Supabase REST API
        const queryParams = new URLSearchParams();
        queryParams.append('select', 'id,first_name,last_name,title');
        queryParams.append('limit', '100');
        queryParams.append('deleted_at', 'is.null');

        // Add company filter if provided
        if (companyId) {
            queryParams.append('company_id', `eq.${companyId}`);
        }

        const url = `/people?${queryParams.toString()}`;
        const response = await apiClient.get(url);
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[people] Non-JSON response. Tjek Network: status/content-type/om der er redirect.");
        }

        const people = Array.isArray(raw) ? raw : [];

        // If query is empty, return all people for the company
        if (!q.trim()) {
            return people.slice(0, 20).map(person => ({
                id: person.id,
                firstName: person.first_name,
                lastName: person.last_name,
                title: person.title
            })) as Array<{ id: string; firstName: string; lastName: string; title?: string }>;
        }

        // Filter client-side for better compatibility
        const filteredPeople = people.filter(person =>
            person.first_name?.toLowerCase().includes(q.toLowerCase()) ||
            person.last_name?.toLowerCase().includes(q.toLowerCase())
        );

        // Transform the response to match the expected format
        return filteredPeople.slice(0, 20).map(person => ({
            id: person.id,
            firstName: person.first_name,
            lastName: person.last_name,
            title: person.title
        })) as Array<{ id: string; firstName: string; lastName: string; title?: string }>;
    } catch (error) {
        logger.error("Failed to search people:", error);
        throw new Error("Failed to search people");
    }
}

export function usePeople(params: {
    page?: number;
    limit?: number;
    q?: string;
    companyId?: string;
    title?: string;
} = {}) {
    return useQuery({
        queryKey: qk.people(params),
        queryFn: () => fetchPeople(params)
    });
}

export function usePerson(id: string) {
    return useQuery({
        queryKey: qk.person(id),
        queryFn: () => fetchPersonById(id),
        enabled: !!id
    });
}

export function usePersonDeals(id: string) {
    return useQuery({
        queryKey: qk.personDeals(id),
        queryFn: () => fetchPersonDeals(id),
        enabled: !!id
    });
}

export function usePersonDocuments(id: string) {
    return useQuery({
        queryKey: qk.personDocuments(id),
        queryFn: () => fetchPersonDocuments(id),
        enabled: !!id
    });
}

export function usePersonActivities(id: string) {
    return useQuery({
        queryKey: qk.personActivities(id),
        queryFn: () => fetchPersonActivities(id),
        enabled: !!id
    });
}

export function useCreatePerson() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: createPerson,
        onSuccess: (newPerson) => {
            qc.invalidateQueries({ queryKey: qk.people() });
            qc.invalidateQueries({ queryKey: qk.companies() });
            qc.invalidateQueries({ queryKey: qk.person(newPerson.id) });
            // Invalidate people list for the specific company
            if (newPerson.company_id) {
                qc.invalidateQueries({ queryKey: qk.people({ company_id: newPerson.company_id }) });
            }
        }
    });
}

export function useUpdatePerson(id: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (p: Partial<Person>) => updatePerson(id, p),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.person(id) });
            qc.invalidateQueries({ queryKey: qk.people() });
            qc.invalidateQueries({ queryKey: qk.companies() });
            qc.invalidateQueries({ queryKey: qk.personDeals(id) });
            qc.invalidateQueries({ queryKey: qk.personDocuments(id) });
            qc.invalidateQueries({ queryKey: qk.personActivities(id) });
        }
    });
}

export function useDeletePerson() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: deletePerson,
        onSuccess: (_, id) => {
            qc.invalidateQueries({ queryKey: qk.people() });
            qc.invalidateQueries({ queryKey: qk.companies() });
            qc.invalidateQueries({ queryKey: qk.person(id) });
            qc.invalidateQueries({ queryKey: qk.personDeals(id) });
            qc.invalidateQueries({ queryKey: qk.personDocuments(id) });
            qc.invalidateQueries({ queryKey: qk.personActivities(id) });
        }
    });
}

export function useRestorePerson() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: restorePerson,
        onSuccess: (_, id) => {
            qc.invalidateQueries({ queryKey: qk.people() });
            qc.invalidateQueries({ queryKey: qk.companies() });
            qc.invalidateQueries({ queryKey: qk.person(id) });
        }
    });
}

export function useDeletedPeople() {
    return useQuery({
        queryKey: ['deleted-people'],
        queryFn: () => fetchDeletedPeople(50)
    });
}