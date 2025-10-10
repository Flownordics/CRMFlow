-- =========================================
-- MEDIUM PRIORITY: Add missing constraints
-- Migration: 20250111000005_add_missing_constraints
-- =========================================
-- This migration adds logical constraints that enforce data integrity
-- rules at the database level.
-- =========================================

-- =========================================
-- Add unique constraint on line_items position per parent
-- =========================================
-- Prevents duplicate position values for line items within the same parent document
-- Note: This constraint allows NULLs since position might not always be set
CREATE UNIQUE INDEX IF NOT EXISTS uidx_line_items_parent_position 
  ON public.line_items (parent_type, parent_id, position)
  WHERE position IS NOT NULL;

-- =========================================
-- Add check constraint on events time range
-- =========================================
-- Ensures that event start time is before end time
ALTER TABLE public.events 
  DROP CONSTRAINT IF EXISTS check_events_time_range;

ALTER TABLE public.events 
  ADD CONSTRAINT check_events_time_range 
  CHECK (start_time < end_time);

-- =========================================
-- Add check constraint on tasks completed_at logic
-- =========================================
-- Ensures completed_at is only set when status is 'completed'
-- Note: We allow completed_at to be set for completed status, but not required
ALTER TABLE public.tasks 
  DROP CONSTRAINT IF EXISTS check_tasks_completed_at_logic;

ALTER TABLE public.tasks 
  ADD CONSTRAINT check_tasks_completed_at_logic 
  CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed' AND completed_at IS NULL)
  );

-- =========================================
-- Add check constraint on tasks due_date
-- =========================================
-- Ensures due_date is in the future (relative to created_at)
ALTER TABLE public.tasks 
  DROP CONSTRAINT IF EXISTS check_tasks_due_date_future;

-- Note: Commented out as this might be too restrictive
-- Users should be able to create overdue tasks or backlog items
-- ALTER TABLE public.tasks 
--   ADD CONSTRAINT check_tasks_due_date_future 
--   CHECK (due_date IS NULL OR due_date >= created_at);

-- =========================================
-- Add check constraint on payments amount
-- =========================================
-- Ensures payment amount is positive (already has >= 0, but adding explicit > 0)
ALTER TABLE public.payments 
  DROP CONSTRAINT IF EXISTS check_payments_amount_positive;

ALTER TABLE public.payments 
  ADD CONSTRAINT check_payments_amount_positive 
  CHECK (amount_minor > 0);

-- =========================================
-- Add check constraint on line_items quantity
-- =========================================
-- Ensures quantity is positive (already has >= 0, but adding explicit > 0)
ALTER TABLE public.line_items 
  DROP CONSTRAINT IF EXISTS check_line_items_qty_positive;

ALTER TABLE public.line_items 
  ADD CONSTRAINT check_line_items_qty_positive 
  CHECK (qty > 0);

-- =========================================
-- Add check constraint on quote valid_until
-- =========================================
-- Ensures valid_until is after issue_date
ALTER TABLE public.quotes 
  DROP CONSTRAINT IF EXISTS check_quotes_valid_until;

ALTER TABLE public.quotes 
  ADD CONSTRAINT check_quotes_valid_until 
  CHECK (valid_until IS NULL OR issue_date IS NULL OR valid_until >= issue_date);

-- =========================================
-- Add check constraint on invoice due_date
-- =========================================
-- Ensures due_date is after issue_date
ALTER TABLE public.invoices 
  DROP CONSTRAINT IF EXISTS check_invoices_due_date;

ALTER TABLE public.invoices 
  ADD CONSTRAINT check_invoices_due_date 
  CHECK (due_date IS NULL OR issue_date IS NULL OR due_date >= issue_date);

-- =========================================
-- Add timestamps to pipelines
-- =========================================
ALTER TABLE public.pipelines 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.pipelines 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add trigger for pipelines updated_at
DROP TRIGGER IF EXISTS trg_pipelines_updated_at ON public.pipelines;
CREATE TRIGGER trg_pipelines_updated_at
  BEFORE UPDATE ON public.pipelines
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- Add timestamps to stages
-- =========================================
ALTER TABLE public.stages 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.stages 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add trigger for stages updated_at
DROP TRIGGER IF EXISTS trg_stages_updated_at ON public.stages;
CREATE TRIGGER trg_stages_updated_at
  BEFORE UPDATE ON public.stages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- Add timestamps to numbering_counters
-- =========================================
ALTER TABLE public.numbering_counters 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.numbering_counters 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add trigger for numbering_counters updated_at
DROP TRIGGER IF EXISTS trg_numbering_counters_updated_at ON public.numbering_counters;
CREATE TRIGGER trg_numbering_counters_updated_at
  BEFORE UPDATE ON public.numbering_counters
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- Add updated_at to activities table
-- =========================================
ALTER TABLE public.activities 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add trigger for activities updated_at
DROP TRIGGER IF EXISTS trg_activities_updated_at ON public.activities;
CREATE TRIGGER trg_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- Verification
-- =========================================
-- Run these queries to verify constraints:
-- 
-- Check unique constraint on line_items:
-- SELECT conname, contype, conkey 
-- FROM pg_constraint 
-- WHERE conrelid = 'public.line_items'::regclass;
--
-- Check time-based constraints:
-- SELECT conname, contype, consrc 
-- FROM pg_constraint 
-- WHERE conrelid IN (
--   'public.events'::regclass,
--   'public.tasks'::regclass,
--   'public.quotes'::regclass,
--   'public.invoices'::regclass
-- );
--
-- Check new timestamps:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('pipelines', 'stages', 'numbering_counters', 'activities')
-- AND column_name IN ('created_at', 'updated_at');

