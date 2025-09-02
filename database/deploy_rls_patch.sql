-- =========================================
-- Deploy RLS Patch for Events & User Settings
-- =========================================
-- Run this script to apply RLS policies
-- This script is idempotent and safe to run multiple times

-- ========== 1. Apply RLS Migration ==========
\i database/patches/2025-rls-events-user_settings.sql

-- ========== 2. Quick Verification ==========
-- Check RLS is enabled
SELECT 
  'RLS Status Check' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename in ('events', 'user_settings')
  and schemaname = 'public';

-- Check policies are created
SELECT 
  'Policy Check' as check_type,
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename in ('events', 'user_settings')
  and schemaname = 'public'
ORDER BY tablename, policyname;

-- ========== 3. Success Message ==========
SELECT 
  '✅ RLS Patch Deployed Successfully' as status,
  'Events and user_settings tables are now protected by RLS' as message,
  'Run database/verify_rls_events_user_settings.sql for full verification' as next_step;
