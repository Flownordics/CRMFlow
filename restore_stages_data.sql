-- Restore stages data for the deal pipeline
-- This script will recreate the stages that were accidentally deleted
-- and ensure proper pipeline configuration

-- First, let's check what pipelines exist
SELECT 'Current pipelines:' as info;
SELECT id, name, position FROM public.pipelines ORDER BY position;

-- First, ensure we have a default pipeline with the correct name
-- We'll use "Default Pipeline" to match the existing setup
INSERT INTO public.pipelines (name, position)
VALUES 
  ('Default Pipeline', 1)
ON CONFLICT DO NOTHING;

-- Get the pipeline ID we just created or the existing one
WITH pipeline AS (
  SELECT id FROM public.pipelines WHERE name = 'Default Pipeline' LIMIT 1
)
-- Insert stages for the default pipeline
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

-- Also insert stage probabilities for better deal tracking
INSERT INTO public.stage_probabilities (stage_id, probability)
SELECT st.id, x.prob
FROM public.stages st
JOIN public.pipelines p ON st.pipeline_id = p.id
JOIN (
  VALUES
    ('Prospecting', 0.10),
    ('Qualified', 0.25),
    ('Proposal', 0.50),
    ('Negotiation', 0.70),
    ('Closed Won', 1.00),
    ('Closed Lost', 0.00)
) AS x(name, prob) ON lower(st.name) = lower(x.name)
WHERE p.name = 'Default Pipeline'
ON CONFLICT (stage_id) DO UPDATE SET probability = excluded.probability;

-- Verify the stages were created
SELECT 'Stages created:' as info;
SELECT 
  s.id,
  s.name,
  s.position,
  p.name as pipeline_name,
  p.id as pipeline_id
FROM public.stages s
JOIN public.pipelines p ON s.pipeline_id = p.id
WHERE p.name = 'Default Pipeline'
ORDER BY s.position;

-- Show stage probabilities
SELECT 'Stage probabilities:' as info;
SELECT 
  s.name as stage_name,
  sp.probability,
  ROUND(sp.probability * 100, 0) as probability_percent
FROM public.stage_probabilities sp
JOIN public.stages s ON sp.stage_id = s.id
JOIN public.pipelines p ON s.pipeline_id = p.id
WHERE p.name = 'Default Pipeline'
ORDER BY s.position;
