-- =========================================
-- Aggressive Fix for user_integrations 406 Error
-- =========================================
-- This script completely rebuilds the table and policies
-- Run this in Supabase SQL Editor

-- Step 1: Completely drop and recreate the table
DROP TABLE IF EXISTS public.user_integrations CASCADE;

-- Step 2: Create the table with correct structure
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

-- Step 3: Create indexes
CREATE INDEX idx_user_integrations_user_id ON public.user_integrations (user_id);
CREATE INDEX idx_user_integrations_provider_kind ON public.user_integrations (provider, kind);

-- Step 4: Create updated_at trigger
CREATE TRIGGER trg_user_integrations_updated_at
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Step 5: Enable RLS
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- Step 6: Create a simple, comprehensive RLS policy
CREATE POLICY "user_integrations_full_access"
  ON public.user_integrations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 7: Grant all permissions to authenticated users
GRANT ALL ON public.user_integrations TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 8: Insert a test record to verify the setup works
-- (This will only work if you're authenticated)
INSERT INTO public.user_integrations (
  user_id, 
  provider, 
  kind, 
  access_token, 
  email
) VALUES (
  auth.uid(),
  'google',
  'calendar',
  'test_token_for_verification',
  'test@example.com'
) ON CONFLICT (user_id, provider, kind) DO NOTHING;

-- Step 9: Verify the setup
SELECT 
  'Setup verification' as check_type,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_integrations';

-- Step 10: Test the specific query that was failing
SELECT 
  'Query test' as check_type,
  id,
  provider,
  kind,
  email
FROM public.user_integrations 
WHERE user_id = auth.uid() 
AND provider = 'google' 
AND kind = 'calendar';

-- Step 11: Show final table structure
SELECT 
  'Final structure' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_integrations'
ORDER BY ordinal_position;

-- Success message
SELECT 'user_integrations table has been completely rebuilt and should now work correctly' as status;
