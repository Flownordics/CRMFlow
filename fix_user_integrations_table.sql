-- Completely recreate user_integrations table to fix 406 errors
-- Run this in Supabase SQL Editor

-- Drop the existing table and all its dependencies
DROP TABLE IF EXISTS public.user_integrations CASCADE;

-- Recreate the table with a simpler structure
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

-- Enable RLS
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policy that allows all authenticated users to manage their own data
DROP POLICY IF EXISTS "Users can manage their own integrations" ON public.user_integrations;
CREATE POLICY "Users can manage their own integrations" ON public.user_integrations 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.user_integrations TO authenticated;

-- Create trigger for updated_at
CREATE TRIGGER trg_user_integrations_updated_at
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Test the table by inserting a sample record (optional)
-- INSERT INTO public.user_integrations (user_id, provider, kind, access_token, email)
-- VALUES (
--   (SELECT id FROM auth.users LIMIT 1),
--   'google',
--   'calendar',
--   'test_token',
--   'test@example.com'
-- );

-- Show the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_integrations' 
ORDER BY ordinal_position;

-- Show the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_integrations';
