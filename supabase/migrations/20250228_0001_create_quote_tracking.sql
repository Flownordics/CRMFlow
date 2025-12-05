-- =========================================
-- CRMFlow – Quote Tracking Table
-- =========================================
-- This table tracks customer interactions with public quotes
-- Events: viewed, downloaded, accepted, rejected

CREATE TABLE IF NOT EXISTS public.quote_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  token_id uuid REFERENCES public.quote_public_tokens(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('viewed', 'downloaded', 'accepted', 'rejected')),
  ip_address text, -- Optional: anonymized IP for analytics (GDPR compliant)
  user_agent text, -- Optional: browser info
  metadata jsonb DEFAULT '{}'::jsonb, -- Additional data (e.g., rejection comment, PDF version)
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quote_tracking_quote ON public.quote_tracking(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_tracking_token ON public.quote_tracking(token_id);
CREATE INDEX IF NOT EXISTS idx_quote_tracking_event ON public.quote_tracking(event_type);
CREATE INDEX IF NOT EXISTS idx_quote_tracking_created ON public.quote_tracking(created_at DESC);

-- Enable RLS
ALTER TABLE public.quote_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public can INSERT tracking events (no auth required for tracking)
DROP POLICY IF EXISTS "Public can insert tracking events" ON public.quote_tracking;
CREATE POLICY "Public can insert tracking events"
  ON public.quote_tracking
  FOR INSERT
  WITH CHECK (true); -- Allow public access for tracking

-- Authenticated users can SELECT tracking for quotes they have access to
DROP POLICY IF EXISTS "Authenticated users can view tracking for their quotes" ON public.quote_tracking;
CREATE POLICY "Authenticated users can view tracking for their quotes"
  ON public.quote_tracking
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_tracking.quote_id
      AND (q.created_by = auth.uid() OR q.deleted_at IS NULL)
    )
  );

-- Grant permissions
GRANT INSERT ON public.quote_tracking TO anon, authenticated;
GRANT SELECT ON public.quote_tracking TO authenticated;

-- Comments
COMMENT ON TABLE public.quote_tracking IS 'Tracks customer interactions with public quotes (viewed, downloaded, accepted, rejected)';
COMMENT ON COLUMN public.quote_tracking.event_type IS 'Type of event: viewed, downloaded, accepted, rejected';
COMMENT ON COLUMN public.quote_tracking.ip_address IS 'Anonymized IP address (last octet removed for GDPR compliance)';
COMMENT ON COLUMN public.quote_tracking.metadata IS 'Additional event data as JSON (e.g., rejection comment, PDF version)';
