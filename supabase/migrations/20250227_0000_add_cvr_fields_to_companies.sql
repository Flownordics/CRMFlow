-- Add CVR lookup fields to companies table
-- This migration adds fields to store CVR API response data

ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS zip text,
  ADD COLUMN IF NOT EXISTS cvr_status text,
  ADD COLUMN IF NOT EXISTS legal_type text,
  ADD COLUMN IF NOT EXISTS commercial_protected boolean,
  ADD COLUMN IF NOT EXISTS industry_code text,
  ADD COLUMN IF NOT EXISTS monthly_employment jsonb;

-- Add index for industry_code for potential filtering
CREATE INDEX IF NOT EXISTS idx_companies_industry_code ON public.companies (industry_code);

-- Add index for cvr_status
CREATE INDEX IF NOT EXISTS idx_companies_cvr_status ON public.companies (cvr_status);

-- Add comment to monthly_employment column
COMMENT ON COLUMN public.companies.monthly_employment IS 'Stores monthly employment data from CVR API as JSON. Contains: yearMonth, fullTimeEquivalent, employees, lastUpdated';

