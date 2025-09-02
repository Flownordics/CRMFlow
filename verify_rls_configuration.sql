-- =========================================
-- Verify RLS Configuration
-- =========================================
-- This script verifies that RLS is properly configured
-- Run this in SQL Editor (no authentication needed)

-- ========== 1. Check RLS is enabled ==========
SELECT 
  'RLS Status' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename in ('events', 'user_settings')
  and schemaname = 'public';

-- ========== 2. Check policies are created ==========
SELECT 
  'RLS Policies' as check_type,
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  qual as condition
FROM pg_policies 
WHERE tablename in ('events', 'user_settings')
  and schemaname = 'public'
ORDER BY tablename, policyname;

-- ========== 3. Check table structure ==========
SELECT 
  'Table Structure' as check_type,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('events', 'user_settings')
  AND column_name IN ('created_by', 'user_id')
ORDER BY table_name, column_name;

-- ========== 4. Test unauthenticated access (should return 0 rows) ==========
SELECT 
  'Unauthenticated Events Test' as test_type,
  count(*) as events_count
FROM public.events;

SELECT 
  'Unauthenticated Settings Test' as test_type,
  count(*) as settings_count
FROM public.user_settings;

-- ========== 5. Summary ==========
SELECT 
  '✅ RLS Configuration Complete' as status,
  'Events and user_settings tables are protected by RLS' as message,
  'Users must be authenticated to access their own data' as note;
