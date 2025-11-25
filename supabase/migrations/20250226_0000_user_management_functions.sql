-- Migration: User Management Functions
-- This migration creates functions for admin user management
-- Author: CRMFlow
-- Date: 2025-02-26

-- Function to get all users with profile information (for admin)
CREATE OR REPLACE FUNCTION public.get_all_users_with_profiles()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  role text,
  department text,
  is_active boolean,
  avatar_url text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::text,
    up.full_name,
    up.role::text,
    up.department,
    up.is_active,
    up.avatar_url,
    u.created_at,
    u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN public.user_profiles up ON u.id = up.user_id
  WHERE u.deleted_at IS NULL
  ORDER BY up.is_active DESC, up.full_name NULLS LAST, u.email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users_with_profiles() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_all_users_with_profiles() IS 'Returns all active users with their profile information for admin user management';

-- Function to update user profile (for admin - can change role and is_active)
CREATE OR REPLACE FUNCTION public.update_user_profile_admin(
  target_user_id uuid,
  new_role text DEFAULT NULL,
  new_full_name text DEFAULT NULL,
  new_department text DEFAULT NULL,
  new_is_active boolean DEFAULT NULL,
  new_avatar_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role
  FROM public.user_profiles
  WHERE user_id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can update user profiles';
  END IF;
  
  -- Update user_profiles
  UPDATE public.user_profiles
  SET 
    role = COALESCE(new_role::user_role, role),
    full_name = COALESCE(new_full_name, full_name),
    department = COALESCE(new_department, department),
    is_active = COALESCE(new_is_active, is_active),
    avatar_url = COALESCE(new_avatar_url, avatar_url),
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- If profile doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO public.user_profiles (
      user_id,
      role,
      full_name,
      department,
      is_active,
      avatar_url
    ) VALUES (
      target_user_id,
      COALESCE(new_role::user_role, 'sales'),
      new_full_name,
      new_department,
      COALESCE(new_is_active, true),
      new_avatar_url
    );
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_profile_admin(uuid, text, text, text, boolean, text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.update_user_profile_admin(uuid, text, text, text, boolean, text) IS 'Allows admins to update any user profile including role and active status';

-- Function to deactivate user (soft delete by setting is_active = false)
-- This prevents user from logging in but preserves data
CREATE OR REPLACE FUNCTION public.deactivate_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role
  FROM public.user_profiles
  WHERE user_id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can deactivate users';
  END IF;
  
  -- Prevent deactivating yourself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot deactivate your own account';
  END IF;
  
  -- Set is_active to false
  UPDATE public.user_profiles
  SET is_active = false, updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- If profile doesn't exist, create it with is_active = false
  IF NOT FOUND THEN
    INSERT INTO public.user_profiles (user_id, role, is_active)
    VALUES (target_user_id, 'sales', false);
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.deactivate_user(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.deactivate_user(uuid) IS 'Allows admins to deactivate users (soft delete) while preserving data';

