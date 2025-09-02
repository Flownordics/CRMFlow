-- Fix user_settings table schema by adding missing columns
-- This migration ensures the user_settings table has all required columns

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

-- Ensure the table has the correct structure
-- The table should now have:
-- - id (uuid, primary key)
-- - user_id (uuid, unique, not null)
-- - locale (text, default 'en')
-- - theme (text, default 'system')
-- - calendar_show_google (boolean, default false)
-- - calendar_default_sync (boolean, default false)
-- - created_at (timestamptz, default now())
-- - updated_at (timestamptz, default now())

-- Verify RLS is enabled and policies are correct
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Ensure the RLS policy exists
DROP POLICY IF EXISTS "users manage own settings" ON public.user_settings;
CREATE POLICY "users manage own settings"
  ON public.user_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings (user_id);
