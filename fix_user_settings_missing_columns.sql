-- Fix user_settings table by adding missing columns
-- Run this in Supabase SQL Editor

-- Add missing columns if they don't exist
ALTER TABLE public.user_settings 
  ADD COLUMN IF NOT EXISTS locale text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS theme text DEFAULT 'system';

-- Update existing records to have default values
UPDATE public.user_settings 
SET 
  locale = COALESCE(locale, 'en'),
  theme = COALESCE(theme, 'system')
WHERE locale IS NULL OR theme IS NULL;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_settings' 
ORDER BY ordinal_position;

-- Test inserting/updating a record
INSERT INTO public.user_settings (user_id, locale, theme, calendar_show_google, calendar_default_sync)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'da',
  'system',
  true,
  false
) ON CONFLICT (user_id) DO UPDATE SET
  locale = EXCLUDED.locale,
  theme = EXCLUDED.theme,
  calendar_show_google = EXCLUDED.calendar_show_google,
  calendar_default_sync = EXCLUDED.calendar_default_sync,
  updated_at = now();

-- Show the result
SELECT * FROM public.user_settings;
