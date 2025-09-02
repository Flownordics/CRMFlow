-- Fix schema by adding missing columns
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS vat text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS website text;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_companies_domain ON public.companies (lower(domain));
CREATE INDEX IF NOT EXISTS idx_companies_country ON public.companies (country);
CREATE INDEX IF NOT EXISTS idx_companies_updated_at ON public.companies (updated_at desc);

-- Enable RLS and create policies
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Allow authenticated users to manage people" ON public.people FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Allow authenticated users to manage companies" ON public.companies FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
