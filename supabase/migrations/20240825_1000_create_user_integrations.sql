-- Create user_integrations table for Google Calendar integration
-- =========================================

-- Create user_integrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google')),
  kind text NOT NULL CHECK (kind IN ('gmail','calendar')),
  email text,
  account_id text,
  -- OAuth tokens (only access_token is required initially)
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scopes text[],
  connected_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider, kind)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON public.user_integrations (user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_provider_kind ON public.user_integrations (provider, kind);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_set_updated_at ON public.user_integrations;
CREATE TRIGGER trigger_set_updated_at
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own integrations" ON public.user_integrations;
CREATE POLICY "Users can view their own integrations"
  ON public.user_integrations
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert their own integrations" ON public.user_integrations;
CREATE POLICY "Users can insert their own integrations"
  ON public.user_integrations
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update their own integrations" ON public.user_integrations;
CREATE POLICY "Users can update their own integrations"
  ON public.user_integrations
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can delete their own integrations" ON public.user_integrations;
CREATE POLICY "Users can delete their own integrations"
  ON public.user_integrations
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_integrations TO authenticated;

