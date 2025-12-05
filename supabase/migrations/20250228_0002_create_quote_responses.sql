-- =========================================
-- CRMFlow – Quote Responses Table
-- =========================================
-- This table stores customer responses (accept/reject) to public quotes
-- Separate table for better history and potential multiple responses

CREATE TABLE IF NOT EXISTS public.quote_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  token_id uuid REFERENCES public.quote_public_tokens(id) ON DELETE SET NULL,
  response_type text NOT NULL CHECK (response_type IN ('accepted', 'rejected')),
  comment text, -- Optional comment from customer (especially for rejections)
  responded_at timestamptz NOT NULL DEFAULT now(),
  ip_address text, -- Optional: anonymized IP for analytics (GDPR compliant)
  user_agent text -- Optional: browser info
);

-- Unique constraint: one response per quote (first response is final)
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_responses_quote ON public.quote_responses(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_responses_token ON public.quote_responses(token_id);
CREATE INDEX IF NOT EXISTS idx_quote_responses_type ON public.quote_responses(response_type);
CREATE INDEX IF NOT EXISTS idx_quote_responses_responded ON public.quote_responses(responded_at DESC);

-- Enable RLS
ALTER TABLE public.quote_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public can INSERT responses (no auth required for customer responses)
DROP POLICY IF EXISTS "Public can insert responses" ON public.quote_responses;
CREATE POLICY "Public can insert responses"
  ON public.quote_responses
  FOR INSERT
  WITH CHECK (true); -- Allow public access for responses

-- Authenticated users can SELECT responses for quotes they have access to
DROP POLICY IF EXISTS "Authenticated users can view responses for their quotes" ON public.quote_responses;
CREATE POLICY "Authenticated users can view responses for their quotes"
  ON public.quote_responses
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_responses.quote_id
      AND (q.created_by = auth.uid() OR q.deleted_at IS NULL)
    )
  );

-- Grant permissions
GRANT INSERT ON public.quote_responses TO anon, authenticated;
GRANT SELECT ON public.quote_responses TO authenticated;

-- Comments
COMMENT ON TABLE public.quote_responses IS 'Stores customer responses (accept/reject) to public quotes. One response per quote (first response is final).';
COMMENT ON COLUMN public.quote_responses.response_type IS 'Type of response: accepted or rejected';
COMMENT ON COLUMN public.quote_responses.comment IS 'Optional comment from customer (especially useful for rejections)';
COMMENT ON COLUMN public.quote_responses.ip_address IS 'Anonymized IP address (last octet removed for GDPR compliance)';
