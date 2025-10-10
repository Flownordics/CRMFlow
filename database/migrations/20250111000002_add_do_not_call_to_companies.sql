-- Migration: Add do_not_call column to companies table
-- Date: 2025-01-11
-- Purpose: Add do not call tracking field for companies

-- Add do_not_call column to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS do_not_call boolean NOT NULL DEFAULT false;

-- Add index for filtering companies by do_not_call status
CREATE INDEX IF NOT EXISTS idx_companies_do_not_call 
ON public.companies (do_not_call);

-- Add comment to document the column
COMMENT ON COLUMN public.companies.do_not_call IS 'Indicates if company should not be called for sales/marketing purposes';

