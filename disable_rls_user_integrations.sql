-- Temporarily disable RLS on user_integrations to test if that fixes the 406 error
-- Run this in Supabase SQL Editor

-- Disable RLS on user_integrations table
ALTER TABLE public.user_integrations DISABLE ROW LEVEL SECURITY;

-- Drop all policies (they're not needed when RLS is disabled)
DROP POLICY IF EXISTS "Users can manage their own integrations" ON public.user_integrations;

-- Grant all permissions to authenticated users
GRANT ALL ON public.user_integrations TO authenticated;

-- Test if the table is accessible by trying to select from it
SELECT COUNT(*) FROM public.user_integrations;

-- Show the current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_integrations';
