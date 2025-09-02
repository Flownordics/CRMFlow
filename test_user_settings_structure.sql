-- Test user_settings table structure and identify missing columns
-- Run this in Supabase SQL Editor

-- Check if the table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'user_settings'
) as table_exists;

-- Check current table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_settings' 
ORDER BY ordinal_position;

-- Check if locale and theme columns exist
SELECT 
  'locale' as column_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_settings' 
      AND column_name = 'locale'
  ) as exists
UNION ALL
SELECT 
  'theme' as column_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_settings' 
      AND column_name = 'theme'
  ) as exists;

-- Try to add missing columns if they don't exist
DO $$
BEGIN
  -- Add locale column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_settings' 
      AND column_name = 'locale'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN locale text DEFAULT 'en';
    RAISE NOTICE 'Added locale column';
  END IF;

  -- Add theme column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_settings' 
      AND column_name = 'theme'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN theme text DEFAULT 'system';
    RAISE NOTICE 'Added theme column';
  END IF;
END $$;

-- Show final table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_settings' 
ORDER BY ordinal_position;

-- Test inserting a user settings record
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

-- Show the inserted/updated record
SELECT * FROM public.user_settings;
