-- Migration: User Management RLS Policies
-- This migration updates RLS policies to allow admins to manage all user profiles
-- Author: CRMFlow
-- Date: 2025-02-26

-- Ensure admins can update any user profile
-- First, drop the existing "Users can update own profile" policy if it exists
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Create new policy that allows users to update their own profile (but not role)
-- and admins to update any profile (including role)
CREATE POLICY "Users can update own profile, admins can update any"
  ON public.user_profiles FOR UPDATE
  USING (
    -- User can update own profile
    user_id = auth.uid()
    OR
    -- Admin can update any profile
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    -- User can update own profile (but not role)
    (user_id = auth.uid() AND role = (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()))
    OR
    -- Admin can update any profile including role
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add comment
COMMENT ON POLICY "Users can update own profile, admins can update any" ON public.user_profiles IS 
  'Allows users to update their own profile (except role) and admins to update any profile including role';





