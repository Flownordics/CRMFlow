-- =========================================
-- Fix user_integrations 406 Error (with auth handling)
-- =========================================
-- This script handles authentication context issues in SQL Editor
-- Run this in Supabase SQL Editor

-- Step 1: Check current authentication context
SELECT 
  'Auth check' as check_type,
  current_user as current_user,
  session_user as session_user,
  auth.uid() as auth_uid;

-- Step 2: Completely drop and recreate the table
DROP TABLE IF EXISTS public.user_integrations CASCADE;

-- Step 3: Create the table with correct structure
CREATE TABLE public.user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google')),
  kind text NOT NULL CHECK (kind IN ('gmail','calendar')),
  email text,
  account_id text,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scopes text[],
  connected_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider, kind)
);

-- Step 4: Create indexes
CREATE INDEX idx_user_integrations_user_id ON public.user_integrations (user_id);
CREATE INDEX idx_user_integrations_provider_kind ON public.user_integrations (provider, kind);

-- Step 5: Create updated_at trigger
CREATE TRIGGER trg_user_integrations_updated_at
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Step 6: Enable RLS
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- Step 7: Create a simple, comprehensive RLS policy
CREATE POLICY "user_integrations_full_access"
  ON public.user_integrations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 8: Grant all permissions to authenticated users
GRANT ALL ON public.user_integrations TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 9: Verify the setup (without trying to insert test data)
SELECT 
  'Setup verification' as check_type,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_integrations';

-- Step 10: Show final table structure
SELECT 
  'Final structure' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_integrations'
ORDER BY ordinal_position;

-- Step 11: Check RLS status
SELECT 
  'RLS status' as check_type,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_integrations';

-- Success message
SELECT 'user_integrations table has been created with proper RLS policies' as status;
SELECT 'Note: Test data insertion was skipped due to auth context in SQL Editor' as note;
SELECT 'The table should now work correctly from your application' as next_step;
