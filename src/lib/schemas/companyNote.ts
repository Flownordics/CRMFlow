import { z } from "zod";

export const companyNoteReadSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  userId: z.string().uuid().nullable().optional(),
  content: z.string(),
  isPinned: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const companyNoteCreateSchema = z.object({
  companyId: z.string().uuid(),
  content: z.string().min(1, "Note content is required"),
  isPinned: z.boolean().optional().default(false),
});

export const companyNoteUpdateSchema = z.object({
  content: z.string().min(1).optional(),
  isPinned: z.boolean().optional(),
});

export type CompanyNote = z.infer<typeof companyNoteReadSchema>;
export type CompanyNoteCreate = z.infer<typeof companyNoteCreateSchema>;
export type CompanyNoteUpdate = z.infer<typeof companyNoteUpdateSchema>;

