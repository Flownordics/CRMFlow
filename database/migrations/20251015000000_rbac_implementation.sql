-- =========================================
-- RBAC Implementation - User Profiles and Roles
-- Migration: 20251015000000_rbac_implementation
-- =========================================
-- This migration implements Role-Based Access Control (RBAC) for CRMFlow
-- with 5 user roles: admin, manager, sales, support, viewer
-- =========================================

-- =========================================
-- 1. Create user_role enum
-- =========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'sales', 'support', 'viewer');
  END IF;
END$$;

-- =========================================
-- 2. Create user_profiles table
-- =========================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'sales',
  full_name TEXT,
  avatar_url TEXT,
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comment
COMMENT ON TABLE public.user_profiles IS 'User profiles with RBAC roles and metadata';
COMMENT ON COLUMN public.user_profiles.role IS 'User role: admin (full access), manager (manage team), sales (own deals), support (tasks only), viewer (read-only)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON public.user_profiles(is_active) WHERE is_active = TRUE;

-- Trigger for updated_at
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- =========================================
-- 3. Enable RLS on user_profiles
-- =========================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view all profiles (needed for UI, assignments, etc.)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
CREATE POLICY "Users can view all profiles"
  ON public.user_profiles FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- Users can update their own profile (but cannot change their role)
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() 
    AND role = (SELECT role FROM public.user_profiles WHERE user_id = auth.uid())
  );

-- Only admins can insert new profiles
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.user_profiles;
CREATE POLICY "Admins can insert profiles"
  ON public.user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.user_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =========================================
-- 4. Create helper functions for RBAC
-- =========================================

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN (SELECT role FROM public.user_profiles WHERE user_id = auth.uid());
END;
$$;

COMMENT ON FUNCTION public.current_user_role IS 'Returns the role of the currently authenticated user';

-- Function to check if user has one of the required roles
CREATE OR REPLACE FUNCTION public.user_has_role(required_roles user_role[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = ANY(required_roles);
END;
$$;

COMMENT ON FUNCTION public.user_has_role IS 'Checks if current user has one of the specified roles';

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.user_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = 'admin';
END;
$$;

COMMENT ON FUNCTION public.user_is_admin IS 'Checks if current user is an admin';

-- =========================================
-- 5. Seed initial admin user
-- =========================================
-- This will create a profile for the first existing user as admin
-- Only runs if there are no profiles yet
DO $$
DECLARE
  first_user_id UUID;
BEGIN
  -- Check if any profiles exist
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles LIMIT 1) THEN
    -- Get the first user from auth.users
    SELECT id INTO first_user_id 
    FROM auth.users 
    WHERE deleted_at IS NULL
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- If a user exists, make them admin
    IF first_user_id IS NOT NULL THEN
      INSERT INTO public.user_profiles (user_id, role, full_name, is_active)
      VALUES (
        first_user_id, 
        'admin', 
        (SELECT email FROM auth.users WHERE id = first_user_id),
        TRUE
      );
      
      RAISE NOTICE 'Created admin profile for user: %', first_user_id;
    END IF;
  END IF;
END$$;

-- =========================================
-- 6. Create trigger to auto-create profile for new users
-- =========================================
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Create profile with default 'sales' role for new users
  INSERT INTO public.user_profiles (user_id, role, full_name, is_active)
  VALUES (
    NEW.id,
    'sales', -- Default role
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    TRUE
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_user_profile IS 'Auto-creates user profile when new user signs up';

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- =========================================
-- Verification queries (commented out)
-- =========================================
-- Check that user_profiles table was created:
-- SELECT * FROM public.user_profiles;

-- Check that enum was created:
-- SELECT unnest(enum_range(NULL::user_role));

-- Test helper functions:
-- SELECT public.current_user_role();
-- SELECT public.user_has_role(ARRAY['admin', 'manager']::user_role[]);
-- SELECT public.user_is_admin();



