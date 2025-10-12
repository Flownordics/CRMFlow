import { z } from "zod";

// Call List schemas
export const callListReadSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    ownerUserId: z.string().uuid(),
    isShared: z.boolean().default(false),
    description: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const callListCreateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    isShared: z.boolean().default(false),
    description: z.string().optional(),
});

export const callListUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    isShared: z.boolean().optional(),
    description: z.string().optional(),
});

export type CallList = z.infer<typeof callListReadSchema>;
export type CallListCreate = z.infer<typeof callListCreateSchema>;
export type CallListUpdate = z.infer<typeof callListUpdateSchema>;

// Call List Item schemas
export const callListItemReadSchema = z.object({
    id: z.string().uuid(),
    callListId: z.string().uuid(),
    companyId: z.string().uuid(),
    position: z.number(),
    locked: z.boolean().default(false),
    notes: z.string().nullable().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).default('pending'),
    completedAt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const callListItemCreateSchema = z.object({
    companyId: z.string().uuid(),
    position: z.number().optional(),
    notes: z.string().optional(),
});

export const callListItemUpdateSchema = z.object({
    position: z.number().optional(),
    locked: z.boolean().optional(),
    notes: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).optional(),
});

export type CallListItem = z.infer<typeof callListItemReadSchema>;
export type CallListItemCreate = z.infer<typeof callListItemCreateSchema>;
export type CallListItemUpdate = z.infer<typeof callListItemUpdateSchema>;

// Activity Log schemas
export const activityLogReadSchema = z.object({
    id: z.string().uuid(),
    companyId: z.string().uuid(),
    userId: z.string().uuid().nullable(),
    type: z.enum(['call', 'email', 'meeting', 'note', 'task', 'deal', 'quote', 'order', 'invoice', 'payment']),
    outcome: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    meta: z.record(z.any()).optional(),
    relatedType: z.enum(['deal', 'quote', 'order', 'invoice', 'payment']).nullable().optional(),
    relatedId: z.string().uuid().nullable().optional(),
    createdAt: z.string(),
});

export const activityLogCreateSchema = z.object({
    companyId: z.string().uuid(),
    type: z.enum(['call', 'email', 'meeting', 'note', 'task', 'deal', 'quote', 'order', 'invoice', 'payment']),
    outcome: z.string().optional(),
    notes: z.string().optional(),
    meta: z.record(z.any()).optional(),
    relatedType: z.enum(['deal', 'quote', 'order', 'invoice', 'payment']).optional(),
    relatedId: z.string().uuid().optional(),
});

export type ActivityLog = z.infer<typeof activityLogReadSchema>;
export type ActivityLogCreate = z.infer<typeof activityLogCreateSchema>;

// Activity status type
export type ActivityStatus = 'green' | 'yellow' | 'red';

// Auto-generate call list request
export const autoGenerateCallListSchema = z.object({
    name: z.string().optional().default("Auto-ringeliste"),
    limit: z.number().min(1).max(100).optional().default(20),
    overwriteListId: z.string().uuid().optional(),
});

export type AutoGenerateCallListRequest = z.infer<typeof autoGenerateCallListSchema>;
