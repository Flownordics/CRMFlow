-- =========================================
-- TEST & VERIFICATION SCRIPT
-- Database Migrations Test Suite
-- =========================================
-- Run this script after deploying migrations to verify
-- all changes were applied correctly.
-- =========================================

-- =========================================
-- TEST 1: RLS Enablement
-- =========================================
SELECT '=== TEST 1: Verify RLS is Enabled ===' AS test_section;

SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END AS rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('pipelines', 'stages', 'deal_integrations', 'stage_probabilities', 'numbering_counters')
ORDER BY tablename;

-- Expected: All 5 tables should show ✅ ENABLED

-- =========================================
-- TEST 2: RLS Policies Exist
-- =========================================
SELECT '=== TEST 2: Verify RLS Policies Exist ===' AS test_section;

SELECT 
  tablename,
  COUNT(*) AS policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) AS policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('pipelines', 'stages', 'deal_integrations', 'stage_probabilities', 'numbering_counters')
GROUP BY tablename
ORDER BY tablename;

-- Expected: Each table should have at least 1-2 policies

-- =========================================
-- TEST 3: Function Security
-- =========================================
SELECT '=== TEST 3: Verify Functions Have search_path ===' AS test_section;

SELECT 
  proname AS function_name,
  CASE 
    WHEN prosecdef THEN '✅ SECURITY DEFINER'
    ELSE '❌ NO SECURITY DEFINER'
  END AS security_status,
  CASE 
    WHEN proconfig IS NOT NULL AND proconfig::text LIKE '%search_path%' THEN '✅ HAS search_path'
    ELSE '❌ MISSING search_path'
  END AS search_path_status,
  proconfig AS config
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
AND proname IN (
  'set_updated_at', 
  'line_item_parent_exists', 
  'next_doc_number',
  'update_tasks_updated_at',
  'create_task_activity',
  'compute_activity_status',
  'update_company_activity_status',
  'trg_update_company_activity'
)
ORDER BY proname;

-- Expected: All 8 functions should show ✅ for both columns

-- =========================================
-- TEST 4: RLS Policy Performance Optimization
-- =========================================
SELECT '=== TEST 4: Verify RLS Policies Use SELECT Wrapper ===' AS test_section;

-- This checks if policies use (SELECT auth.role()) instead of auth.role()
SELECT 
  tablename,
  policyname,
  CASE 
    WHEN qual LIKE '%(SELECT auth.%' OR qual LIKE '%((SELECT auth.%' THEN '✅ OPTIMIZED'
    WHEN qual LIKE '%auth.role()%' OR qual LIKE '%auth.uid()%' THEN '❌ NOT OPTIMIZED'
    ELSE '⚠️  CHECK MANUALLY'
  END AS optimization_status,
  qual AS policy_condition
FROM pg_policies
WHERE schemaname = 'public'
AND (qual LIKE '%auth.%' OR with_check LIKE '%auth.%')
ORDER BY 
  CASE 
    WHEN qual LIKE '%(SELECT auth.%' OR qual LIKE '%((SELECT auth.%' THEN 1
    WHEN qual LIKE '%auth.role()%' OR qual LIKE '%auth.uid()%' THEN 2
    ELSE 3
  END,
  tablename;

-- Expected: Most policies should show ✅ OPTIMIZED

-- =========================================
-- TEST 5: Missing Indexes
-- =========================================
SELECT '=== TEST 5: Verify New Indexes Exist ===' AS test_section;

SELECT 
  schemaname,
  tablename,
  indexname,
  CASE 
    WHEN indexdef IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS index_status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname IN (
  'idx_deals_contact',
  'idx_quotes_contact', 
  'idx_orders_contact',
  'idx_invoices_contact',
  'idx_task_activities_task',
  'idx_task_activities_user',
  'idx_task_comments_task',
  'idx_task_comments_user',
  'idx_tasks_assigned_by'
)
ORDER BY tablename, indexname;

-- Expected: All 9 indexes should show ✅ EXISTS

-- =========================================
-- TEST 6: Constraints
-- =========================================
SELECT '=== TEST 6: Verify New Constraints Exist ===' AS test_section;

-- Check unique constraint on line_items
SELECT 
  'line_items' AS table_name,
  'uidx_line_items_parent_position' AS constraint_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'line_items' 
      AND indexname = 'uidx_line_items_parent_position'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status
UNION ALL
-- Check events time constraint
SELECT 
  'events' AS table_name,
  'check_events_time_range' AS constraint_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'public.events'::regclass 
      AND conname = 'check_events_time_range'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status
UNION ALL
-- Check tasks completed_at constraint
SELECT 
  'tasks' AS table_name,
  'check_tasks_completed_at_logic' AS constraint_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'public.tasks'::regclass 
      AND conname = 'check_tasks_completed_at_logic'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status;

-- Expected: All constraints should show ✅ EXISTS

-- =========================================
-- TEST 7: New Timestamps
-- =========================================
SELECT '=== TEST 7: Verify New Timestamp Columns ===' AS test_section;

SELECT 
  table_name,
  column_name,
  data_type,
  CASE 
    WHEN is_nullable = 'NO' THEN '✅ NOT NULL'
    ELSE '⚠️  NULLABLE'
  END AS nullable_status,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
  (table_name IN ('pipelines', 'stages', 'numbering_counters') AND column_name IN ('created_at', 'updated_at'))
  OR (table_name = 'activities' AND column_name = 'updated_at')
)
ORDER BY table_name, column_name;

-- Expected: 7 rows showing timestamp columns with NOT NULL

-- =========================================
-- TEST 8: Triggers Exist
-- =========================================
SELECT '=== TEST 8: Verify New Triggers Exist ===' AS test_section;

SELECT 
  trigger_schema,
  trigger_name,
  event_object_table AS table_name,
  action_timing,
  event_manipulation,
  CASE 
    WHEN action_statement LIKE '%set_updated_at%' THEN '✅ CORRECT FUNCTION'
    ELSE '⚠️  CHECK FUNCTION'
  END AS function_status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN (
  'trg_pipelines_updated_at',
  'trg_stages_updated_at',
  'trg_numbering_counters_updated_at',
  'trg_activities_updated_at'
)
ORDER BY event_object_table;

-- Expected: 4 triggers should exist

-- =========================================
-- TEST 9: Data Integrity Check
-- =========================================
SELECT '=== TEST 9: Data Integrity Check ===' AS test_section;

-- Check for orphaned records
SELECT 
  'Orphaned line_items' AS check_name,
  COUNT(*) AS count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NO ISSUES'
    ELSE '❌ ORPHANED RECORDS FOUND'
  END AS status
FROM public.line_items li
WHERE NOT EXISTS (
  SELECT 1 FROM public.quotes WHERE id = li.parent_id AND li.parent_type = 'quote'
  UNION ALL
  SELECT 1 FROM public.orders WHERE id = li.parent_id AND li.parent_type = 'order'
  UNION ALL
  SELECT 1 FROM public.invoices WHERE id = li.parent_id AND li.parent_type = 'invoice'
)
UNION ALL
SELECT 
  'Invalid event time ranges' AS check_name,
  COUNT(*) AS count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NO ISSUES'
    ELSE '❌ INVALID TIME RANGES FOUND'
  END AS status
FROM public.events
WHERE start_time >= end_time
UNION ALL
SELECT 
  'Invalid task completed_at' AS check_name,
  COUNT(*) AS count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NO ISSUES'
    ELSE '❌ INVALID COMPLETED_AT FOUND'
  END AS status
FROM public.tasks
WHERE (status = 'completed' AND completed_at IS NULL)
   OR (status != 'completed' AND completed_at IS NOT NULL);

-- Expected: All checks should show 0 count and ✅ NO ISSUES

-- =========================================
-- TEST 10: Performance Check
-- =========================================
SELECT '=== TEST 10: Check for Unused Indexes (Sample) ===' AS test_section;

SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan AS scans_count,
  CASE 
    WHEN idx_scan = 0 THEN '⚠️  NEVER USED'
    WHEN idx_scan < 10 THEN '⚠️  RARELY USED'
    ELSE '✅ ACTIVELY USED'
  END AS usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexname IN (
  'idx_deals_contact',
  'idx_quotes_contact', 
  'idx_orders_contact',
  'idx_invoices_contact',
  'idx_task_activities_task',
  'idx_task_activities_user',
  'idx_task_comments_task',
  'idx_task_comments_user',
  'idx_tasks_assigned_by'
)
ORDER BY idx_scan DESC;

-- Note: New indexes will show 0 scans initially. Check again after 1 week.

-- =========================================
-- SUMMARY
-- =========================================
SELECT '=== VERIFICATION SUMMARY ===' AS summary_section;

SELECT 
  'RLS Enabled Tables' AS metric,
  COUNT(*) AS count,
  5 AS expected
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('pipelines', 'stages', 'deal_integrations', 'stage_probabilities', 'numbering_counters')
AND rowsecurity = true

UNION ALL

SELECT 
  'Secured Functions' AS metric,
  COUNT(*) AS count,
  8 AS expected
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
AND proname IN (
  'set_updated_at', 'line_item_parent_exists', 'next_doc_number',
  'update_tasks_updated_at', 'create_task_activity', 'compute_activity_status',
  'update_company_activity_status', 'trg_update_company_activity'
)
AND prosecdef = true
AND proconfig IS NOT NULL

UNION ALL

SELECT 
  'New Indexes Created' AS metric,
  COUNT(*) AS count,
  9 AS expected
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname IN (
  'idx_deals_contact', 'idx_quotes_contact', 'idx_orders_contact', 'idx_invoices_contact',
  'idx_task_activities_task', 'idx_task_activities_user', 'idx_task_comments_task',
  'idx_task_comments_user', 'idx_tasks_assigned_by'
)

UNION ALL

SELECT 
  'New Constraints Added' AS metric,
  COUNT(*) AS count,
  3 AS expected
FROM (
  SELECT 1 FROM pg_indexes WHERE indexname = 'uidx_line_items_parent_position'
  UNION ALL
  SELECT 1 FROM pg_constraint WHERE conname = 'check_events_time_range'
  UNION ALL
  SELECT 1 FROM pg_constraint WHERE conname = 'check_tasks_completed_at_logic'
) AS constraints;

-- Expected: All counts should match expected values

-- =========================================
-- NEXT STEPS
-- =========================================
/*
If all tests pass (✅), the migrations were successful!

Manual verification checklist:
1. [ ] Test application login
2. [ ] Create a new deal
3. [ ] Create a quote
4. [ ] View calendar events
5. [ ] Create a task
6. [ ] Check browser console for errors
7. [ ] Monitor Supabase logs for 1 hour
8. [ ] Run Supabase Advisors again to verify reduced warnings

If any tests fail (❌):
1. Review the specific failure
2. Check ROLLBACK_GUIDE.md if rollback needed
3. Fix and re-deploy if issue identified
*/

