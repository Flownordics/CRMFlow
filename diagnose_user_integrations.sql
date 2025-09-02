-- =========================================
-- Diagnose user_integrations 406 Error
-- =========================================
-- Run this first to see what's wrong

-- 1. Check if table exists and its structure
SELECT 
  'Table exists' as check_type,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_integrations';

-- 2. Check table columns
SELECT 
  'Table columns' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_integrations'
ORDER BY ordinal_position;

-- 3. Check current RLS policies
SELECT 
  'Current policies' as check_type,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_integrations';

-- 4. Check grants
SELECT 
  'Current grants' as check_type,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' AND table_name = 'user_integrations';

-- 5. Check if RLS is enabled
SELECT 
  'RLS status' as check_type,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_integrations';

-- 6. Test basic access (this should work for authenticated users)
SELECT 
  'Basic access test' as check_type,
  COUNT(*) as total_records
FROM public.user_integrations;

-- 7. Test the specific query pattern that's failing
SELECT 
  'Specific query test' as check_type,
  id,
  provider,
  kind,
  email
FROM public.user_integrations 
WHERE user_id = auth.uid() 
AND provider = 'google' 
AND kind = 'calendar';

-- 8. Check if there are any data issues
SELECT 
  'Data check' as check_type,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT provider) as unique_providers,
  COUNT(DISTINCT kind) as unique_kinds
FROM public.user_integrations;
