-- Fix user_settings table schema to match application expectations
-- Run this in Supabase SQL Editor

-- Drop the existing user_settings table and recreate it with the correct schema
DROP TABLE IF EXISTS public.user_settings CASCADE;

-- Recreate user_settings table with the correct schema
CREATE TABLE public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Calendar preferences
  calendar_show_google boolean DEFAULT false,
  calendar_default_sync boolean DEFAULT false,
  -- General preferences
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  language text DEFAULT 'en',
  timezone text DEFAULT 'UTC',
  date_format text DEFAULT 'YYYY-MM-DD',
  time_format text DEFAULT '24h',
  currency text DEFAULT 'DKK',
  notifications_enabled boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own settings" ON public.user_settings 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.user_settings TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings (user_id);

-- Create trigger for updated_at
CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Show the updated table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_settings' 
ORDER BY ordinal_position;
