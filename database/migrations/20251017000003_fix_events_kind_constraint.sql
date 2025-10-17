-- =========================================
-- FIX: events.kind constraint mismatch
-- Migration: 20251017000003_fix_events_kind_constraint
-- =========================================
-- The database has kind IN ('native', 'google') but the application
-- expects kind IN ('meeting', 'call', 'deadline', 'other')
-- This migration fixes the constraint and updates existing data
-- =========================================

-- Step 1: Drop the incorrect CHECK constraint
ALTER TABLE public.events 
  DROP CONSTRAINT IF EXISTS events_kind_check;

-- Step 2: Update existing data from old values to new values
-- If any events have 'native' or 'google', update them to 'meeting' as a safe default
UPDATE public.events 
SET kind = 'meeting' 
WHERE kind IN ('native', 'google') OR kind IS NULL;

-- Step 3: Add the correct CHECK constraint
-- Allow: 'meeting', 'call', 'deadline', 'other'
ALTER TABLE public.events 
  ADD CONSTRAINT events_kind_check 
  CHECK (kind IN ('meeting', 'call', 'deadline', 'other'));

-- Step 4: Set a proper default value
ALTER TABLE public.events 
  ALTER COLUMN kind SET DEFAULT 'meeting';

-- Step 5: Make kind NOT NULL since it should always have a value
ALTER TABLE public.events 
  ALTER COLUMN kind SET NOT NULL;

-- =========================================
-- Verification
-- =========================================
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable, 
--   column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
-- AND table_name = 'events'
-- AND column_name = 'kind';
--
-- SELECT 
--   conname, 
--   pg_get_constraintdef(oid) as definition
-- FROM pg_constraint 
-- WHERE conrelid = 'public.events'::regclass
-- AND conname LIKE '%kind%';

