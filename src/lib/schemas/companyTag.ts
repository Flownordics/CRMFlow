import { z } from "zod";

export const companyTagReadSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string(),
  createdBy: z.string().uuid().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const companyTagCreateSchema = z.object({
  name: z.string().min(1, "Tag name is required"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color").default("#3b82f6"),
});

export const companyTagUpdateSchema = companyTagCreateSchema.partial();

export type CompanyTag = z.infer<typeof companyTagReadSchema>;
export type CompanyTagCreate = z.infer<typeof companyTagCreateSchema>;
export type CompanyTagUpdate = z.infer<typeof companyTagUpdateSchema>;

// Tag assignment schema
export const companyTagAssignmentSchema = z.object({
  companyId: z.string().uuid(),
  tagId: z.string().uuid(),
  assignedBy: z.string().uuid().nullable().optional(),
  assignedAt: z.string().optional(),
});

export type CompanyTagAssignment = z.infer<typeof companyTagAssignmentSchema>;

