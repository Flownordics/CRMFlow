-- Test preferences save functionality
-- Run this in Supabase SQL Editor to verify the user_settings table works

-- Check if user_settings table exists and has correct structure
SELECT 
  table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_settings'
  ) as table_exists
FROM (SELECT 'user_settings' as table_name) t;

-- Show current table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_settings' 
ORDER BY ordinal_position;

-- Check if we have any authenticated users
SELECT COUNT(*) as user_count FROM auth.users;

-- Try to insert a test user settings record
-- This will help identify any permission or constraint issues
INSERT INTO public.user_settings (
  user_id, 
  locale, 
  theme, 
  calendar_show_google, 
  calendar_default_sync
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'da',
  'system',
  true,
  false
) ON CONFLICT (user_id) DO UPDATE SET
  locale = EXCLUDED.locale,
  theme = EXCLUDED.theme,
  calendar_show_google = EXCLUDED.calendar_show_google,
  calendar_default_sync = EXCLUDED.calendar_default_sync,
  updated_at = now();

-- Show the result
SELECT * FROM public.user_settings;

-- Check RLS policies
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
WHERE tablename = 'user_settings';
