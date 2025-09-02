-- =========================================
-- Quick Fix for user_integrations 406 Error
-- =========================================
-- Run this in Supabase SQL Editor to fix the immediate issue

-- 1. Ensure RLS is enabled
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users can insert their own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users can update their own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users can delete their own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users can manage their own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "users manage own integrations" ON public.user_integrations;

-- 3. Create a single comprehensive policy for all operations
CREATE POLICY "user_integrations_manage_own"
  ON public.user_integrations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Ensure proper grants
GRANT ALL ON public.user_integrations TO authenticated;

-- 5. Test the fix
SELECT 'Policy created successfully' as status;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'user_integrations';
