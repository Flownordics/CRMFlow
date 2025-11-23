-- Add payment_days column to companies table
-- This allows each company to have custom payment terms (e.g., 14 days, 30 days)
-- Default is 14 days (standard payment terms)

ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS payment_days integer DEFAULT 14 CHECK (payment_days > 0);

COMMENT ON COLUMN public.companies.payment_days IS 'Number of days for payment terms. Default is 14 days. Used to calculate due_date when creating invoices.';

