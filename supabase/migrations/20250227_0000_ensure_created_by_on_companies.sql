-- Ensure created_by column exists on companies table
-- This migration ensures that the created_by column exists even if the table
-- was created before the initial schema migration included it

ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Add comment for created_by
COMMENT ON COLUMN public.companies.created_by IS 'UUID of the user who created this company (references auth.users.id)';

-- Create index for created_by if it doesn't exist (useful for queries)
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON public.companies (created_by);

