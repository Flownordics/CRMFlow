-- Add probability column to deals table
-- This allows individual deals to override the default stage probability
-- Probability is stored as a decimal (0.00 to 1.00) representing 0% to 100%

-- Add the column
ALTER TABLE public.deals
ADD COLUMN probability numeric(4,3) 
CHECK (probability >= 0 AND probability <= 1)
DEFAULT NULL;

-- Add index for queries filtering/sorting by probability
CREATE INDEX IF NOT EXISTS idx_deals_probability ON public.deals (probability) 
WHERE probability IS NOT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN public.deals.probability IS 'Deal-specific win probability (0.00-1.00). NULL means use the stage default from stage_probabilities table.';

