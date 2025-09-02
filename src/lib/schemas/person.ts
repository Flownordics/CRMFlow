import { z } from "zod";

export const personReadSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const personCreateSchema = z.object({
  companyId: z.string().uuid().nullable().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
});

export const personUpdateSchema = personCreateSchema.partial();
export type Person = z.infer<typeof personReadSchema>;

// Legacy schema for backward compatibility
export const Person = z.object({
  id: z.string(),
  company_id: z.string().optional().nullable(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  created_by: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const PersonCreate = Person.pick({
  company_id: true, first_name: true, last_name: true, email: true, phone: true, title: true
}).extend({ first_name: z.string().min(1), last_name: z.string().min(1) });
