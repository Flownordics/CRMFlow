-- Test direct access to user_integrations table and check for issues
-- Run this in Supabase SQL Editor

-- Check if the table exists and is accessible
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'user_integrations'
) as table_exists;

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_integrations' 
ORDER BY ordinal_position;

-- Try to insert a test record
INSERT INTO public.user_integrations (user_id, provider, kind, access_token, email)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'google',
  'calendar',
  'test_token_123',
  'test@example.com'
) ON CONFLICT (user_id, provider, kind) DO NOTHING;

-- Try to select from the table
SELECT * FROM public.user_integrations LIMIT 5;

-- Check if there are any constraints or triggers that might be causing issues
SELECT 
  tc.constraint_name, 
  tc.constraint_type, 
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public' 
  AND tc.table_name = 'user_integrations';

-- Check triggers
SELECT 
  trigger_name, 
  event_manipulation, 
  action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
  AND event_object_table = 'user_integrations';
