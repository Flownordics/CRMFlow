import { z } from "zod";

// ===== BRANDING SCHEMA =====
export const BrandingFormSchema = z.object({
    org_name: z.string().min(1, "Organization name is required"),
    logo_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    pdf_footer: z.string().max(500, "Footer text too long").optional(),
    email_template_quote_html: z.string().max(5000, "HTML template too long").optional(),
    email_template_quote_text: z.string().max(2000, "Text template too long").optional(),
});

export type BrandingFormData = z.infer<typeof BrandingFormSchema>;

// ===== NUMBERING SCHEMA =====
export const NumberingFormSchema = z.object({
    quote_prefix: z.string().min(1, "Quote prefix is required").max(10, "Prefix too long"),
    order_prefix: z.string().min(1, "Order prefix is required").max(10, "Prefix too long"),
    invoice_prefix: z.string().min(1, "Invoice prefix is required").max(10, "Prefix too long"),
    pad: z.number().int().min(1, "Padding must be at least 1").max(10, "Padding must be at most 10"),
    year_infix: z.boolean(),
});

export type NumberingFormData = z.infer<typeof NumberingFormSchema>;

// ===== DEFAULTS SCHEMA =====
export const DefaultsFormSchema = z.object({
    default_currency: z.enum(["DKK", "EUR", "USD"], {
        required_error: "Please select a default currency",
    }),
    default_tax_pct: z.number().min(0, "Tax percentage cannot be negative").max(100, "Tax percentage cannot exceed 100%"),
});

export type DefaultsFormData = z.infer<typeof DefaultsFormSchema>;

// ===== STAGE PROBABILITY SCHEMA =====
export const StageProbabilityFormSchema = z.object({
    stage_id: z.string(),
    probability: z.number().min(0, "Probability must be at least 0").max(1, "Probability must be at most 1"),
});

export type StageProbabilityFormData = z.infer<typeof StageProbabilityFormSchema>;
