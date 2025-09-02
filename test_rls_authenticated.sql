-- =========================================
-- Test RLS Policies with Authentication
-- =========================================

-- Step 1: Find your user ID (run this first)
SELECT 
  'Available users:' as info,
  id as user_id,
  email,
  created_at
FROM auth.users 
ORDER BY created_at DESC;

-- Step 2: Test as a specific user (replace USER_ID with your actual user ID)
-- Uncomment and modify the line below with your user ID from step 1
-- SET LOCAL ROLE authenticated;
-- SET LOCAL "request.jwt.claim.sub" TO 'YOUR_USER_ID_HERE';

-- Step 3: Test RLS policies
SELECT 'Current user:' as info, auth.uid() as user_id;

-- Test events table
SELECT 'Events count:' as info, count(*) as count from public.events;

-- Test user_settings table  
SELECT 'User settings count:' as info, count(*) as count from public.user_settings;

-- Try to insert a test event
INSERT INTO public.events (title, start_at, end_at) 
VALUES ('RLS Test Event', now(), now() + interval '1 hour')
RETURNING id, title, created_by;

-- Try to insert user settings
INSERT INTO public.user_settings (user_id, calendar_show_google)
VALUES (auth.uid(), true)
ON CONFLICT (user_id) DO UPDATE SET calendar_show_google = excluded.calendar_show_google
RETURNING id, user_id, calendar_show_google;
