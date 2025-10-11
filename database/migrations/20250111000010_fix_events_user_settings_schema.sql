-- =========================================
-- CRITICAL FIX: Align events and user_settings schema with application
-- Migration: 20250111000010_fix_events_user_settings_schema
-- =========================================
-- This migration fixes the schema mismatch between production DB and application code
-- =========================================

-- =========================================
-- FIX 1: events table - rename columns to match application expectations
-- =========================================

-- Rename user_id to created_by
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.events RENAME COLUMN user_id TO created_by;
    END IF;
END $$;

-- Rename start_time to start_at
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'start_time'
    ) THEN
        ALTER TABLE public.events RENAME COLUMN start_time TO start_at;
    END IF;
END $$;

-- Rename end_time to end_at
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'end_time'
    ) THEN
        ALTER TABLE public.events RENAME COLUMN end_time TO end_at;
    END IF;
END $$;

-- Add missing columns to events if they don't exist
DO $$
BEGIN
    -- Add quote_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'quote_id'
    ) THEN
        ALTER TABLE public.events ADD COLUMN quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL;
    END IF;

    -- Add order_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'order_id'
    ) THEN
        ALTER TABLE public.events ADD COLUMN order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;
    END IF;

    -- Add color if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'color'
    ) THEN
        ALTER TABLE public.events ADD COLUMN color text;
    END IF;

    -- Add sync_state if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'sync_state'
    ) THEN
        ALTER TABLE public.events ADD COLUMN sync_state text DEFAULT 'none';
    END IF;
END $$;

-- Update indexes to use new column names
DROP INDEX IF EXISTS public.idx_events_user_id;
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events (created_by);
CREATE INDEX IF NOT EXISTS idx_events_timerange ON public.events (start_at, end_at);

-- Update RLS policies to use new column name
DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
CREATE POLICY "Users can view their own events" 
  ON public.events 
  FOR SELECT 
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own events" ON public.events;
CREATE POLICY "Users can insert their own events" 
  ON public.events 
  FOR INSERT 
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
CREATE POLICY "Users can update their own events" 
  ON public.events 
  FOR UPDATE 
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
CREATE POLICY "Users can delete their own events" 
  ON public.events 
  FOR DELETE 
  USING (created_by = auth.uid());

-- =========================================
-- FIX 2: user_settings table - restructure from jsonb to explicit columns
-- =========================================

-- Drop the old user_settings table and recreate with correct schema
DROP TABLE IF EXISTS public.user_settings CASCADE;

CREATE TABLE public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_show_google boolean DEFAULT false,
  calendar_default_sync boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW 
  EXECUTE PROCEDURE set_updated_at();

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_settings
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings" 
  ON public.user_settings 
  FOR SELECT 
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
CREATE POLICY "Users can insert their own settings" 
  ON public.user_settings 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings" 
  ON public.user_settings 
  FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =========================================
-- Verification
-- =========================================
-- Run this query to verify the changes:
-- SELECT 
--     table_name,
--     column_name,
--     data_type,
--     is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
-- AND table_name IN ('events', 'user_settings')
-- ORDER BY table_name, ordinal_position;


