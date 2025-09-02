-- Test companies table access and RLS policies
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'companies';

-- Check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'companies';

-- Test inserting a company directly (this should work if RLS is disabled)
INSERT INTO public.companies (name, domain, country) 
VALUES ('Test Company', 'test.com', 'DK')
RETURNING id, name, created_at;

-- Check if the insert worked
SELECT * FROM public.companies WHERE name = 'Test Company';

-- Clean up test data
DELETE FROM public.companies WHERE name = 'Test Company';
