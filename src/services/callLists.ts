import { apiClient, apiPostWithReturn, apiPatchWithReturn, normalizeApiData } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { z } from "zod";
import {
    callListReadSchema,
    callListCreateSchema,
    callListUpdateSchema,
    callListItemReadSchema,
    callListItemCreateSchema,
    callListItemUpdateSchema,
    autoGenerateCallListSchema,
    type CallList,
    type CallListCreate,
    type CallListUpdate,
    type CallListItem,
    type CallListItemCreate,
    type CallListItemUpdate,
    type AutoGenerateCallListRequest,
} from "@/lib/schemas/callList";
import { handleError } from "@/lib/errorHandler";
import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";

// ========== Call Lists CRUD ==========

export async function fetchCallLists(params: { mine?: boolean } = {}) {
    const { mine = true } = params;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        let query = `/call_lists?select=*&order=created_at.desc`;

        // Filter by owner if mine=true
        if (mine) {
            query += `&owner_user_id=eq.${user.id}`;
        } else {
            // Include owned and shared lists
            query += `&or=(owner_user_id.eq.${user.id},is_shared.eq.true)`;
        }

        const response = await apiClient.get(query);
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[call_lists] Non-JSON response");
        }

        const lists = Array.isArray(raw) ? raw : [raw];
        const mappedLists = lists.map((list: any) => ({
            id: list.id,
            name: list.name,
            ownerUserId: list.owner_user_id,
            isShared: list.is_shared,
            description: list.description,
            createdAt: list.created_at,
            updatedAt: list.updated_at,
        }));

        return z.array(callListReadSchema).parse(mappedLists);
    } catch (error) {
        throw handleError(error, 'fetchCallLists');
    }
}

export async function fetchCallList(id: string) {
    try {
        const response = await apiClient.get(`/call_lists?id=eq.${id}&select=*`);
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[call_list] Non-JSON response");
        }

        const lists = Array.isArray(raw) ? raw : [raw];
        if (lists.length === 0) {
            throw new Error("Call list not found");
        }

        const list = lists[0];
        const mappedList = {
            id: list.id,
            name: list.name,
            ownerUserId: list.owner_user_id,
            isShared: list.is_shared,
            description: list.description,
            createdAt: list.created_at,
            updatedAt: list.updated_at,
        };

        return callListReadSchema.parse(mappedList);
    } catch (error) {
        throw handleError(error, `fetchCallList(${id})`);
    }
}

export async function createCallList(data: CallListCreate) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const dbData = {
            name: data.name,
            owner_user_id: user.id,
            is_shared: data.isShared ?? false,
            description: data.description,
        };

        const response = await apiPostWithReturn("/call_lists", dbData);
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[call_list] Non-JSON response");
        }

        const created = Array.isArray(raw) ? raw[0] : raw;
        const mappedList = {
            id: created.id,
            name: created.name,
            ownerUserId: created.owner_user_id,
            isShared: created.is_shared,
            description: created.description,
            createdAt: created.created_at,
            updatedAt: created.updated_at,
        };

        return callListReadSchema.parse(mappedList);
    } catch (error) {
        throw handleError(error, 'createCallList');
    }
}

export async function updateCallList(id: string, patch: CallListUpdate) {
    try {
        const dbPatch: any = {};
        if (patch.name !== undefined) dbPatch.name = patch.name;
        if (patch.isShared !== undefined) dbPatch.is_shared = patch.isShared;
        if (patch.description !== undefined) dbPatch.description = patch.description;

        const response = await apiPatchWithReturn(`/call_lists?id=eq.${id}`, dbPatch);
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[call_list] Non-JSON response");
        }

        const lists = Array.isArray(raw) ? raw : [raw];
        if (lists.length === 0) {
            throw new Error("Call list not found");
        }

        const list = lists[0];
        const mappedList = {
            id: list.id,
            name: list.name,
            ownerUserId: list.owner_user_id,
            isShared: list.is_shared,
            description: list.description,
            createdAt: list.created_at,
            updatedAt: list.updated_at,
        };

        return callListReadSchema.parse(mappedList);
    } catch (error) {
        throw handleError(error, `updateCallList(${id})`);
    }
}

export async function deleteCallList(id: string) {
    try {
        await apiClient.delete(`/call_lists?id=eq.${id}`);
    } catch (error) {
        throw handleError(error, `deleteCallList(${id})`);
    }
}

// ========== Call List Items CRUD ==========

export async function fetchCallListItems(callListId: string) {
    try {
        const response = await apiClient.get(
            `/call_list_items?call_list_id=eq.${callListId}&select=*,companies(id,name,phone,email,activity_status,last_activity_at)&order=position.asc`
        );
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[call_list_items] Non-JSON response");
        }

        const items = Array.isArray(raw) ? raw : [raw];
        const mappedItems = items.map((item: any) => ({
            id: item.id,
            callListId: item.call_list_id,
            companyId: item.company_id,
            position: item.position,
            locked: item.locked,
            notes: item.notes,
            status: item.status,
            completedAt: item.completed_at,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            company: item.companies ? {
                id: item.companies.id,
                name: item.companies.name,
                phone: item.companies.phone,
                email: item.companies.email,
                activityStatus: item.companies.activity_status,
                lastActivityAt: item.companies.last_activity_at,
            } : undefined,
        }));

        return mappedItems;
    } catch (error) {
        throw handleError(error, `fetchCallListItems(${callListId})`);
    }
}

export async function addCompaniesToCallList(callListId: string, companyIds: string[]) {
    try {
        // Get current max position
        const currentItems = await fetchCallListItems(callListId);
        let nextPosition = currentItems.length;

        const itemsToCreate = companyIds.map((companyId, index) => ({
            call_list_id: callListId,
            company_id: companyId,
            position: nextPosition + index,
        }));

        const response = await apiPostWithReturn("/call_list_items", itemsToCreate);
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[call_list_items] Non-JSON response");
        }

        const created = Array.isArray(raw) ? raw : [raw];
        return created.length;
    } catch (error) {
        throw handleError(error, `addCompaniesToCallList(${callListId})`);
    }
}

export async function updateCallListItem(id: string, patch: CallListItemUpdate) {
    try {
        const dbPatch: any = {};
        if (patch.position !== undefined) dbPatch.position = patch.position;
        if (patch.locked !== undefined) dbPatch.locked = patch.locked;
        if (patch.notes !== undefined) dbPatch.notes = patch.notes;
        if (patch.status !== undefined) {
            dbPatch.status = patch.status;
            if (patch.status === 'completed') {
                dbPatch.completed_at = new Date().toISOString();
            }
        }

        const response = await apiPatchWithReturn(`/call_list_items?id=eq.${id}`, dbPatch);
        const raw = normalizeApiData(response);

        if (typeof raw === "string") {
            throw new Error("[call_list_item] Non-JSON response");
        }

        return true;
    } catch (error) {
        throw handleError(error, `updateCallListItem(${id})`);
    }
}

export async function reorderCallListItems(callListId: string, reorderedItems: Array<{ itemId: string, position: number }>) {
    try {
        // Update each item's position
        const updates = reorderedItems.map(({ itemId, position }) =>
            apiClient.patch(`/call_list_items?id=eq.${itemId}`, { position })
        );

        await Promise.all(updates);
        return true;
    } catch (error) {
        throw handleError(error, `reorderCallListItems(${callListId})`);
    }
}

export async function removeCallListItem(id: string) {
    try {
        await apiClient.delete(`/call_list_items?id=eq.${id}`);
    } catch (error) {
        throw handleError(error, `removeCallListItem(${id})`);
    }
}

// ========== Auto-generate Call List ==========

export async function autoGenerateCallList(request: AutoGenerateCallListRequest) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { name = "Auto-ringeliste", limit = 20, overwriteListId } = request;

        // Step 1: Fetch qualified companies with prioritization
        // Priority: Red (oldest first) → Yellow (oldest first) → Green (oldest first) → NULL status (oldest first)

        const redCompanies = await apiClient.get(
            `/companies?select=id,name,phone,activity_status,last_activity_at` +
            `&activity_status=eq.red` +
            `&do_not_call=eq.false` +
            `&phone=not.is.null` +
            `&deleted_at=is.null` +
            `&order=last_activity_at.asc.nullslast` +
            `&limit=${limit}`
        );

        let selectedCompanies = normalizeApiData(redCompanies);
        if (typeof selectedCompanies === "string") selectedCompanies = [];
        if (!Array.isArray(selectedCompanies)) selectedCompanies = [selectedCompanies];

        // If we need more, add yellow
        if (selectedCompanies.length < limit) {
            const remaining = limit - selectedCompanies.length;
            const yellowCompanies = await apiClient.get(
                `/companies?select=id,name,phone,activity_status,last_activity_at` +
                `&activity_status=eq.yellow` +
                `&do_not_call=eq.false` +
                `&phone=not.is.null` +
                `&deleted_at=is.null` +
                `&order=last_activity_at.asc.nullslast` +
                `&limit=${remaining}`
            );

            let yellowData = normalizeApiData(yellowCompanies);
            if (typeof yellowData === "string") yellowData = [];
            if (!Array.isArray(yellowData)) yellowData = [yellowData];
            selectedCompanies = [...selectedCompanies, ...yellowData];
        }

        // If still need more, add green
        if (selectedCompanies.length < limit) {
            const remaining = limit - selectedCompanies.length;
            const greenCompanies = await apiClient.get(
                `/companies?select=id,name,phone,activity_status,last_activity_at` +
                `&activity_status=eq.green` +
                `&do_not_call=eq.false` +
                `&phone=not.is.null` +
                `&deleted_at=is.null` +
                `&order=last_activity_at.asc.nullslast` +
                `&limit=${remaining}`
            );

            let greenData = normalizeApiData(greenCompanies);
            if (typeof greenData === "string") greenData = [];
            if (!Array.isArray(greenData)) greenData = [greenData];
            selectedCompanies = [...selectedCompanies, ...greenData];
        }

        // If still need more, add companies with NULL activity_status (no activity status set)
        if (selectedCompanies.length < limit) {
            const remaining = limit - selectedCompanies.length;
            const nullStatusCompanies = await apiClient.get(
                `/companies?select=id,name,phone,activity_status,last_activity_at` +
                `&activity_status=is.null` +
                `&do_not_call=eq.false` +
                `&phone=not.is.null` +
                `&deleted_at=is.null` +
                `&order=created_at.asc` +
                `&limit=${remaining}`
            );

            let nullStatusData = normalizeApiData(nullStatusCompanies);
            if (typeof nullStatusData === "string") nullStatusData = [];
            if (!Array.isArray(nullStatusData)) nullStatusData = [nullStatusData];
            selectedCompanies = [...selectedCompanies, ...nullStatusData];
        }

        // Step 2: Create or update call list
        let callListId = overwriteListId;
        let isNewList = false;

        if (overwriteListId) {
            // Clear existing items
            await apiClient.delete(`/call_list_items?call_list_id=eq.${overwriteListId}`);
        } else {
            // Create new list
            const newList = await createCallList({ name, isShared: false });
            callListId = newList.id;
            isNewList = true;
        }

        // Step 3: Add companies to the list
        const companyIds = selectedCompanies.map((c: any) => c.id);
        if (companyIds.length > 0) {
            await addCompaniesToCallList(callListId!, companyIds);
        }

        return {
            callListId: callListId!,
            created: isNewList,
            itemCount: companyIds.length,
            companies: selectedCompanies,
        };
    } catch (error) {
        throw handleError(error, 'autoGenerateCallList');
    }
}

// ========== Export Call List ==========

export async function exportCallListToCsv(callListId: string) {
    try {
        const items = await fetchCallListItems(callListId);

        // Create CSV content
        const headers = ['Position', 'Company Name', 'Phone', 'Email', 'Activity Status', 'Last Activity', 'Status', 'Notes'];
        const rows = items.map((item: any) => [
            item.position + 1,
            item.company?.name || '',
            item.company?.phone || '',
            item.company?.email || '',
            item.company?.activityStatus || '',
            item.company?.lastActivityAt || '',
            item.status,
            item.notes || '',
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `call-list-${callListId}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        throw handleError(error, `exportCallListToCsv(${callListId})`);
    }
}

// ========== React Query Hooks ==========

export function useCallLists(params: { mine?: boolean } = {}) {
    return useQuery({
        queryKey: qk.callLists(params),
        queryFn: () => fetchCallLists(params),
    });
}

export function useCallList(id: string) {
    return useQuery({
        queryKey: qk.callList(id),
        queryFn: () => fetchCallList(id),
        enabled: !!id,
    });
}

export function useCallListItems(callListId: string) {
    return useQuery({
        queryKey: qk.callListItems(callListId),
        queryFn: () => fetchCallListItems(callListId),
        enabled: !!callListId,
    });
}

export function useCreateCallList() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: createCallList,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.callLists() });
        },
    });
}

export function useUpdateCallList(id: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (patch: CallListUpdate) => updateCallList(id, patch),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.callList(id) });
            qc.invalidateQueries({ queryKey: qk.callLists() });
        },
    });
}

export function useDeleteCallList() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: deleteCallList,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.callLists() });
        },
    });
}

export function useAddCompaniesToCallList(callListId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (companyIds: string[]) => addCompaniesToCallList(callListId, companyIds),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.callListItems(callListId) });
            qc.invalidateQueries({ queryKey: qk.callList(callListId) });
        },
    });
}

export function useUpdateCallListItem(itemId: string, callListId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (patch: CallListItemUpdate) => updateCallListItem(itemId, patch),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.callListItems(callListId) });
        },
    });
}

export function useRemoveCallListItem(callListId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: removeCallListItem,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.callListItems(callListId) });
        },
    });
}

export function useAutoGenerateCallList() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: autoGenerateCallList,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.callLists() });
        },
    });
}
