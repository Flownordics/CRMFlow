-- Simple test for user_settings table
-- Run this in Supabase SQL Editor

-- 1. Check if table exists
SELECT 'user_settings table exists' as check_type,
       EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = 'user_settings'
       ) as result;

-- 2. Show current table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_settings' 
ORDER BY ordinal_position;

-- 3. Check if specific columns exist
SELECT 'locale column exists' as check_type,
       EXISTS (
         SELECT 1 FROM information_schema.columns 
         WHERE table_schema = 'public' 
           AND table_name = 'user_settings' 
           AND column_name = 'locale'
       ) as result
UNION ALL
SELECT 'theme column exists' as check_type,
       EXISTS (
         SELECT 1 FROM information_schema.columns 
         WHERE table_schema = 'public' 
           AND table_name = 'user_settings' 
           AND column_name = 'theme'
       ) as result;

-- 4. Add missing columns if they don't exist
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
  ELSE
    RAISE NOTICE 'locale column already exists';
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
  ELSE
    RAISE NOTICE 'theme column already exists';
  END IF;
END $$;

-- 5. Show final table structure
SELECT 'Final table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_settings' 
ORDER BY ordinal_position;
