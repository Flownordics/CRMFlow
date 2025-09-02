-- =========================================
-- Test user_integrations Table Fix
-- =========================================
-- Run this after applying the fix to verify it works

-- 1. Check if the table exists and has correct structure
SELECT 
  'Table verification' as test_type,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_integrations';

-- 2. Check RLS policies
SELECT 
  'Policy verification' as test_type,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_integrations';

-- 3. Check permissions
SELECT 
  'Permission verification' as test_type,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' AND table_name = 'user_integrations';

-- 4. Test basic table access (should work for authenticated users)
SELECT 
  'Basic access test' as test_type,
  COUNT(*) as total_records
FROM public.user_integrations;

-- 5. Test the specific query pattern that was failing
-- This should now work without the 406 error
SELECT 
  'Specific query test' as test_type,
  id,
  provider,
  kind,
  email
FROM public.user_integrations 
WHERE provider = 'google' 
AND kind = 'calendar';

-- 6. Check if RLS is working correctly
SELECT 
  'RLS functionality test' as test_type,
  CASE 
    WHEN rowsecurity = true THEN 'RLS is enabled'
    ELSE 'RLS is disabled'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_integrations';

-- 7. Summary
SELECT 
  'Fix verification complete' as status,
  'If all tests above show expected results, the 406 error should be resolved' as note;
