-- Fix companies table for API access
-- Run this in Supabase SQL Editor

-- 1. Ensure companies table has correct structure
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS invoice_email citext;
ALTER TABLE public.companies DROP COLUMN IF EXISTS domain;

-- 2. Add check constraint for invoice_email
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

-- 3. Enable RLS on companies table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to manage companies" ON public.companies;

-- 5. Create comprehensive RLS policy for companies
CREATE POLICY "Allow authenticated users to manage companies" 
ON public.companies 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- 6. Grant all permissions to authenticated role
GRANT ALL ON public.companies TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 7. Ensure PostgREST can access the table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO service_role;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies (lower(name));
CREATE INDEX IF NOT EXISTS idx_companies_country ON public.companies (country);
CREATE INDEX IF NOT EXISTS idx_companies_updated_at ON public.companies (updated_at desc);

-- 9. Add comment for invoice_email
COMMENT ON COLUMN public.companies.invoice_email IS 'Email used for sending invoices for this company';

-- 10. Verify the setup
SELECT 
    'Companies table structure:' as info,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 
    'RLS policies:' as info,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'companies';

SELECT 
    'Table permissions:' as info,
    grantee,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'companies';
