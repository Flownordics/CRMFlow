-- Fix RLS policy for people table
-- First, re-enable RLS
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to manage people" ON public.people;

-- Create a proper policy that allows authenticated users to manage people
-- This policy allows:
-- 1. All authenticated users to create people (created_by can be null)
-- 2. Users to manage people they created (where created_by = auth.uid())
-- 3. Users to manage people with null created_by (for backward compatibility)
CREATE POLICY "Allow authenticated users to manage people" ON public.people 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
) 
WITH CHECK (
  auth.role() = 'authenticated' AND (
    created_by IS NULL OR 
    created_by = auth.uid()
  )
);
