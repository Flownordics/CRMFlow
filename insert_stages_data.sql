-- Insert stages data for the default pipeline
-- This will help with deal creation

-- First, ensure we have a default pipeline
INSERT INTO public.pipelines (name, position)
VALUES 
  ('Default Sales Pipeline', 1)
ON CONFLICT DO NOTHING;

-- Insert stages for the default pipeline
-- We need to get the pipeline ID first
WITH pipeline AS (
  SELECT id FROM public.pipelines WHERE name = 'Default Sales Pipeline' LIMIT 1
)
INSERT INTO public.stages (pipeline_id, name, position)
SELECT 
  pipeline.id,
  stage_name,
  stage_position
FROM pipeline,
(VALUES 
  ('Prospecting', 1),
  ('Qualified', 2),
  ('Proposal', 3),
  ('Negotiation', 4),
  ('Closed Won', 5),
  ('Closed Lost', 6)
) AS stages(stage_name, stage_position)
ON CONFLICT DO NOTHING;
