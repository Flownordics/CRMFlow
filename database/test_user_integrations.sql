-- =========================================
-- CRMFlow – Test User Integrations Setup
-- =========================================

-- Check if user_integrations table exists
select 
  schemaname,
  tablename,
  tableowner,
  tablespace,
  hasindexes,
  hasrules,
  hastriggers,
  rowsecurity
from pg_tables 
where tablename = 'user_integrations';

-- Check table structure
select 
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns 
where table_name = 'user_integrations'
order by ordinal_position;

-- Check RLS policies
select 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies 
where tablename = 'user_integrations';

-- Check grants
select 
  grantee,
  table_name,
  privilege_type,
  is_grantable
from information_schema.table_privileges 
where table_name = 'user_integrations';

-- Test basic query (should work for authenticated users)
-- Note: This will only work if you're authenticated
select count(*) as total_integrations 
from public.user_integrations;

-- Check for any recent errors in the logs
-- (This is just for reference, actual log access depends on your setup)
select 'Check Supabase logs for 406 errors' as note;
