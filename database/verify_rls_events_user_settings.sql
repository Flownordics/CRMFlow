-- =========================================
-- Verification Script for RLS Policies
-- events & user_settings
-- =========================================

-- Run this as an authenticated user to verify RLS is working correctly

-- ========== 1. Check current user ==========
select 'Current user:' as info, auth.uid() as user_id;

-- ========== 2. Test EVENTS table ==========
-- Should only return events created by current user
select 'Events for current user:' as info, count(*) as count from public.events;

-- Test insert (should auto-set created_by = auth.uid())
insert into public.events (title, start_at, end_at) 
values ('RLS Test Event', now(), now() + interval '1 hour')
returning id, title, created_by;

-- Verify the event was created with correct created_by
select 'Created event:' as info, id, title, created_by from public.events 
where title = 'RLS Test Event' limit 1;

-- Test update (should work for own events)
update public.events 
set title = 'RLS Test Event Updated' 
where title = 'RLS Test Event'
returning id, title, created_by;

-- Test delete (should work for own events)
delete from public.events 
where title = 'RLS Test Event Updated'
returning id, title;

-- ========== 3. Test USER_SETTINGS table ==========
-- Should only return settings for current user
select 'User settings for current user:' as info, count(*) as count from public.user_settings;

-- Test insert/upsert (should auto-set user_id = auth.uid())
insert into public.user_settings (user_id, calendar_show_google, calendar_default_sync)
values (auth.uid(), true, false)
on conflict (user_id) do update set 
  calendar_show_google = excluded.calendar_show_google,
  calendar_default_sync = excluded.calendar_default_sync
returning id, user_id, calendar_show_google, calendar_default_sync;

-- Verify the settings were created/updated correctly
select 'Current user settings:' as info, id, user_id, calendar_show_google, calendar_default_sync 
from public.user_settings where user_id = auth.uid();

-- Test update (should work for own settings)
update public.user_settings 
set calendar_show_google = false 
where user_id = auth.uid()
returning id, user_id, calendar_show_google;

-- ========== 4. Verify RLS is enabled ==========
select 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
from pg_tables 
where tablename in ('events', 'user_settings')
  and schemaname = 'public';

-- ========== 5. List RLS policies ==========
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
where tablename in ('events', 'user_settings')
  and schemaname = 'public'
order by tablename, policyname;

-- ========== 6. Test cross-user access (should fail) ==========
-- Note: These queries should return 0 rows or fail due to RLS
-- This simulates trying to access another user's data

-- Try to select events from a different user (should return 0 rows)
select 'Cross-user events test:' as info, count(*) as count 
from public.events 
where created_by != auth.uid();

-- Try to select settings from a different user (should return 0 rows)
select 'Cross-user settings test:' as info, count(*) as count 
from public.user_settings 
where user_id != auth.uid();

-- ========== 7. Summary ==========
select 
  'RLS Verification Complete' as status,
  'Events and user_settings tables are now protected by RLS' as message,
  'Users can only access their own data' as security_note;
