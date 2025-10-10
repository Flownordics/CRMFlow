-- Seed stages for CRMFlow
-- This creates the default pipeline and stages

-- Insert default pipeline
INSERT INTO public.pipelines (id, name, position) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Default Sales Pipeline', 0)
ON CONFLICT (id) DO NOTHING;

-- Insert default stages
INSERT INTO public.stages (id, pipeline_id, name, position) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Prospecting', 1),
  ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Qualified', 2),
  ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Proposal', 3),
  ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Negotiation', 4),
  ('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', 'Closed Won', 5),
  ('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440000', 'Closed Lost', 6)
ON CONFLICT (id) DO NOTHING;

-- Insert stage probabilities
INSERT INTO public.stage_probabilities (stage_id, probability) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 0.10), -- Prospecting: 10%
  ('550e8400-e29b-41d4-a716-446655440002', 0.25), -- Qualified: 25%
  ('550e8400-e29b-41d4-a716-446655440003', 0.50), -- Proposal: 50%
  ('550e8400-e29b-41d4-a716-446655440004', 0.75), -- Negotiation: 75%
  ('550e8400-e29b-41d4-a716-446655440005', 1.00), -- Closed Won: 100%
  ('550e8400-e29b-41d4-a716-446655440006', 0.00)  -- Closed Lost: 0%
ON CONFLICT (stage_id) DO NOTHING;
