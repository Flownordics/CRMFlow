-- Try to refresh PostgREST schema cache and fix 406 errors
-- Run this in Supabase SQL Editor

-- First, let's check if we can access the table directly
SELECT COUNT(*) as record_count FROM public.user_integrations;

-- Try to force a schema refresh by making a small change to the table
-- This sometimes helps PostgREST refresh its cache
ALTER TABLE public.user_integrations ALTER COLUMN email SET DEFAULT NULL;

-- Revert the change
ALTER TABLE public.user_integrations ALTER COLUMN email DROP DEFAULT;

-- Check if the table is properly exposed to PostgREST
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_integrations';

-- Try to create a simple view to test if that works
CREATE OR REPLACE VIEW public.user_integrations_view AS
SELECT * FROM public.user_integrations;

-- Grant permissions on the view
GRANT ALL ON public.user_integrations_view TO authenticated;

-- Test the view
SELECT COUNT(*) as view_count FROM public.user_integrations_view;

-- Show all tables in public schema to verify user_integrations is there
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
