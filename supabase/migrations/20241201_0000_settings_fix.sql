-- Settings fixes migration
-- Add missing columns and ensure RLS policies

-- Email templates on workspace_settings
ALTER TABLE public.workspace_settings 
  ADD COLUMN IF NOT EXISTS email_template_quote_html text,
  ADD COLUMN IF NOT EXISTS email_template_quote_text text;

-- User prefs: locale & theme
ALTER TABLE public.user_settings 
  ADD COLUMN IF NOT EXISTS locale text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS theme text DEFAULT 'system';

-- RLS sanity check for workspace_settings
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ws manage by authenticated" ON public.workspace_settings;
CREATE POLICY "ws manage by authenticated"
  ON public.workspace_settings FOR ALL
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- RLS sanity check for user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own settings" ON public.user_settings;
CREATE POLICY "users manage own settings"
  ON public.user_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS sanity check for user_integrations
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own integrations" ON public.user_integrations;
CREATE POLICY "users manage own integrations"
  ON public.user_integrations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_integrations TO authenticated;

-- Create default sales pipeline with stages if none exists
INSERT INTO public.pipelines (id, name, position) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Sales Pipeline', 0)
ON CONFLICT DO NOTHING;

-- Create default stages for the sales pipeline
INSERT INTO public.stages (id, pipeline_id, name, position) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Lead', 0),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Qualified', 1),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Proposal', 2),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Negotiation', 3),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'Closed Won', 4),
  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'Closed Lost', 5)
ON CONFLICT DO NOTHING;

-- Create default stage probabilities with realistic sales funnel percentages
INSERT INTO public.stage_probabilities (stage_id, probability) VALUES
  ('00000000-0000-0000-0000-000000000010', 0.05),   -- Lead: 5% win rate
  ('00000000-0000-0000-0000-000000000011', 0.15),   -- Qualified: 15% win rate
  ('00000000-0000-0000-0000-000000000012', 0.30),   -- Proposal: 30% win rate
  ('00000000-0000-0000-0000-000000000013', 0.60),   -- Negotiation: 60% win rate
  ('00000000-0000-0000-0000-000000000014', 1.00),   -- Closed Won: 100% (already won)
  ('00000000-0000-0000-0000-000000000015', 0.00)    -- Closed Lost: 0% (already lost)
ON CONFLICT (stage_id) DO UPDATE SET 
  probability = EXCLUDED.probability,
  updated_at = now();

-- Grant permissions for pipeline and stages
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipelines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_probabilities TO authenticated;
