-- =========================================
-- Fix 406 Error on user_integrations table
-- =========================================
-- This script fixes the "Not Acceptable" error when querying user_integrations
-- Run this in your Supabase SQL Editor

-- Step 1: Verify the table exists and check its current state
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_integrations';

-- Step 2: Check current RLS policies
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
WHERE tablename = 'user_integrations';

-- Step 3: Check current grants
SELECT 
  grantee,
  table_name,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' AND table_name = 'user_integrations';

-- Step 4: Ensure the table has the correct structure
-- If the table doesn't exist or has wrong structure, recreate it
DO $$
BEGIN
  -- Check if table exists and has correct structure
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_integrations' 
    AND column_name = 'user_id'
  ) THEN
    -- Drop and recreate the table
    DROP TABLE IF EXISTS public.user_integrations CASCADE;
    
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
    
    -- Create indexes
    CREATE INDEX idx_user_integrations_user_id ON public.user_integrations (user_id);
    CREATE INDEX idx_user_integrations_provider_kind ON public.user_integrations (provider, kind);
    
    -- Create updated_at trigger
    CREATE TRIGGER trg_user_integrations_updated_at
      BEFORE UPDATE ON public.user_integrations
      FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
      
    RAISE NOTICE 'Recreated user_integrations table with correct structure';
  ELSE
    RAISE NOTICE 'user_integrations table already exists with correct structure';
  END IF;
END $$;

-- Step 5: Ensure RLS is enabled
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users can insert their own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users can update their own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users can delete their own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users can manage their own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "users manage own integrations" ON public.user_integrations;

-- Step 7: Create comprehensive RLS policies
-- Policy for SELECT operations
CREATE POLICY "user_integrations_select_own"
  ON public.user_integrations FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for INSERT operations
CREATE POLICY "user_integrations_insert_own"
  ON public.user_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE operations
CREATE POLICY "user_integrations_update_own"
  ON public.user_integrations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE operations
CREATE POLICY "user_integrations_delete_own"
  ON public.user_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Step 8: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_integrations TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 9: Verify the setup
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
WHERE tablename = 'user_integrations'
ORDER BY policyname;

-- Step 10: Test the table access (this should work for authenticated users)
-- Note: This will only work if you're authenticated
SELECT COUNT(*) as total_integrations 
FROM public.user_integrations;

-- Step 11: Check if the table is properly exposed to PostgREST
-- The table should be in the public schema and accessible to authenticated users
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'user_integrations';

-- Step 12: Verify RLS is working correctly
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_integrations';

-- Step 13: Test a specific query pattern (similar to what your API does)
-- This should work for authenticated users
SELECT id, provider, kind, email 
FROM public.user_integrations 
WHERE user_id = auth.uid() 
AND provider = 'google' 
AND kind = 'calendar';

-- Success message
SELECT 'user_integrations table has been fixed and should now work correctly' as status;
