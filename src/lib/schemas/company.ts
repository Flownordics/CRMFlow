import { z } from "zod";

// Helper function to validate website/domain
const websiteValidator = z.string().refine((val) => {
  if (!val || val === "") return true; // Allow empty
  // Allow domains like "flownordics.com" or full URLs like "https://flownordics.com"
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  const urlRegex = /^https?:\/\/.+/;
  return domainRegex.test(val) || urlRegex.test(val);
}, {
  message: "Indtast et gyldigt domæne (f.eks. flownordics.com) eller URL (f.eks. https://flownordics.com)"
});

export const companyReadSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email().nullable().optional(),
  invoiceEmail: z.string().email().nullable().optional(),
  vat: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  website: websiteValidator.nullable().optional(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
  // Activity tracking fields
  lastActivityAt: z.string().nullable().optional(),
  activityStatus: z.enum(['green', 'yellow', 'red']).nullable().optional(),
  doNotCall: z.boolean().optional().default(false),
  // Enhanced fields
  employeeCount: z.number().nullable().optional(),
  annualRevenueRange: z.string().nullable().optional(),
  lifecycleStage: z.enum(['lead', 'prospect', 'customer', 'partner', 'inactive']).nullable().optional(),
  linkedinUrl: z.string().url().nullable().optional().or(z.literal("")),
  twitterUrl: z.string().url().nullable().optional().or(z.literal("")),
  facebookUrl: z.string().url().nullable().optional().or(z.literal("")),
  description: z.string().nullable().optional(),
  foundedDate: z.string().nullable().optional(),
  parentCompanyId: z.string().uuid().nullable().optional(),
});

export const companyCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable().or(z.literal("")),
  invoiceEmail: z.string().email().optional().nullable().or(z.literal("")),
  vat: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  website: websiteValidator.optional().nullable().or(z.literal("")),
  doNotCall: z.boolean().optional(),
  // Enhanced fields
  employeeCount: z.number().optional().nullable(),
  annualRevenueRange: z.string().optional().nullable(),
  lifecycleStage: z.enum(['lead', 'prospect', 'customer', 'partner', 'inactive']).optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable().or(z.literal("")),
  twitterUrl: z.string().url().optional().nullable().or(z.literal("")),
  facebookUrl: z.string().url().optional().nullable().or(z.literal("")),
  description: z.string().optional().nullable(),
  foundedDate: z.string().optional().nullable(),
  parentCompanyId: z.string().uuid().optional().nullable(),
});

export const companyUpdateSchema = companyCreateSchema.partial();
export type Company = z.infer<typeof companyReadSchema>;

// Legacy schemas for backward compatibility
export const Company = companyReadSchema;
export const CompanyCreate = companyCreateSchema;
