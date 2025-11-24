-- Add budget_minor field to projects table
-- budget_minor stores budget in minor currency units (e.g., øre for DKK)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS budget_minor BIGINT DEFAULT NULL;

-- Add index for budget queries
CREATE INDEX IF NOT EXISTS idx_projects_budget_minor ON public.projects(budget_minor) WHERE budget_minor IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.projects.budget_minor IS 'Project budget in minor currency units (e.g., øre for DKK)';

