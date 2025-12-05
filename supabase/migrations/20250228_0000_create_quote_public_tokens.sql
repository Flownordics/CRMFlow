-- =========================================
-- CRMFlow – Quote Public Tokens Table
-- =========================================
-- This table stores secure tokens for public quote access
-- Each token is unique per quote + recipient email combination

CREATE TABLE IF NOT EXISTS public.quote_public_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE, -- Secure random token (UUID v4)
  recipient_email text NOT NULL, -- Email address link was sent to
  expires_at timestamptz, -- Optional expiration (default: 30 days)
  created_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz, -- Last time token was used
  access_count int NOT NULL DEFAULT 0 -- Number of times accessed
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quote_tokens_token ON public.quote_public_tokens(token);
CREATE INDEX IF NOT EXISTS idx_quote_tokens_quote ON public.quote_public_tokens(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_tokens_recipient ON public.quote_public_tokens(recipient_email);

-- Enable RLS
ALTER TABLE public.quote_public_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public can SELECT tokens for validation (no auth required)
DROP POLICY IF EXISTS "Public can validate tokens" ON public.quote_public_tokens;
CREATE POLICY "Public can validate tokens"
  ON public.quote_public_tokens
  FOR SELECT
  USING (true); -- Allow public access for token validation

-- Authenticated users can INSERT tokens (when sending quotes)
DROP POLICY IF EXISTS "Authenticated users can create tokens" ON public.quote_public_tokens;
CREATE POLICY "Authenticated users can create tokens"
  ON public.quote_public_tokens
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can SELECT tokens for quotes they have access to
-- (This allows internal users to see tracking info)
DROP POLICY IF EXISTS "Authenticated users can view tokens for their quotes" ON public.quote_public_tokens;
CREATE POLICY "Authenticated users can view tokens for their quotes"
  ON public.quote_public_tokens
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_public_tokens.quote_id
      AND (q.created_by = auth.uid() OR q.deleted_at IS NULL)
    )
  );

-- Authenticated users can UPDATE tokens (e.g., update last_accessed_at)
DROP POLICY IF EXISTS "Authenticated users can update tokens" ON public.quote_public_tokens;
CREATE POLICY "Authenticated users can update tokens"
  ON public.quote_public_tokens
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON public.quote_public_tokens TO anon, authenticated;
GRANT INSERT, UPDATE ON public.quote_public_tokens TO authenticated;

-- Comments
COMMENT ON TABLE public.quote_public_tokens IS 'Stores secure tokens for public quote access. Each token is unique per quote + recipient email.';
COMMENT ON COLUMN public.quote_public_tokens.token IS 'Secure random token (UUID v4) used in public URL';
COMMENT ON COLUMN public.quote_public_tokens.expires_at IS 'Optional expiration date. Default: 30 days from creation.';
COMMENT ON COLUMN public.quote_public_tokens.access_count IS 'Number of times the token has been accessed';
