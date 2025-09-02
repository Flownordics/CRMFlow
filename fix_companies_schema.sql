-- Fix companies table schema
-- Remove domain column and ensure invoice_email exists

-- Add invoice_email column if it doesn't exist
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS invoice_email citext;

-- Add check constraint for invoice_email if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'companies_invoice_email_chk'
    ) THEN
        ALTER TABLE public.companies ADD CONSTRAINT companies_invoice_email_chk
        CHECK (invoice_email IS NULL OR invoice_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$');
    END IF;
END $$;

-- Add comment for invoice_email
COMMENT ON COLUMN public.companies.invoice_email IS 'Email used for sending invoices for this company';

-- Remove domain column if it exists
ALTER TABLE public.companies DROP COLUMN IF EXISTS domain;

-- Drop domain index if it exists
DROP INDEX IF EXISTS idx_companies_domain;

-- Update any existing companies to move domain data to website if website is empty
UPDATE public.companies 
SET website = domain 
WHERE domain IS NOT NULL AND (website IS NULL OR website = '');

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND table_schema = 'public'
ORDER BY ordinal_position;
