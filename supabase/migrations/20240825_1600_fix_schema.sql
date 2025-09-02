-- Fix schema by adding missing columns and removing domain
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS invoice_email citext;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS vat text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS website text;

-- Remove domain column if it exists
ALTER TABLE public.companies DROP COLUMN IF EXISTS domain;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_companies_country ON public.companies (country);
CREATE INDEX IF NOT EXISTS idx_companies_updated_at ON public.companies (updated_at desc);

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

-- Enable RLS and create policies
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Allow authenticated users to manage people" ON public.people FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Allow authenticated users to manage companies" ON public.companies FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
