-- Test API connection and table permissions
-- Run this in Supabase SQL Editor

-- 1. Check if companies table exists and has correct structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check RLS policies on companies table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'companies';

-- 3. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'companies';

-- 4. Check grants for authenticated role
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'companies' 
AND grantee = 'authenticated';

-- 5. Test inserting a company directly (this should work if RLS is configured correctly)
INSERT INTO public.companies (name, email, website) 
VALUES ('Test Company', 'test@example.com', 'test.com')
RETURNING id, name, email, website;

-- 6. Clean up test data
DELETE FROM public.companies WHERE name = 'Test Company';
