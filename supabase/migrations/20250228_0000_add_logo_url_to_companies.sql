-- Add logo_url column to companies table for storing Clearbit logo URLs
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS logo_url text;

-- Add comment for logo_url
COMMENT ON COLUMN public.companies.logo_url IS 'URL to company logo fetched from Clearbit (https://logo.clearbit.com/{domain})';

