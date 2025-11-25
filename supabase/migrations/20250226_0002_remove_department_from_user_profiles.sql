-- Migration: Remove department column from user_profiles
-- This migration removes the department field as it's only visual and has no functional purpose
-- Author: CRMFlow
-- Date: 2025-02-26

-- Remove department column from user_profiles table
ALTER TABLE public.user_profiles
  DROP COLUMN IF EXISTS department;

-- Drop and recreate function to remove department from return
DROP FUNCTION IF EXISTS public.get_all_users_with_profiles();

CREATE FUNCTION public.get_all_users_with_profiles()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  role text,
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

-- Drop and recreate admin function to remove department parameter
DROP FUNCTION IF EXISTS public.update_user_profile_admin(uuid, text, text, text, boolean, text);

CREATE FUNCTION public.update_user_profile_admin(
  target_user_id uuid,
  new_role text DEFAULT NULL,
  new_full_name text DEFAULT NULL,
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
      is_active,
      avatar_url
    ) VALUES (
      target_user_id,
      COALESCE(new_role::user_role, 'sales'),
      new_full_name,
      COALESCE(new_is_active, true),
      new_avatar_url
    );
  END IF;
END;
$$;

-- Update grant statement
GRANT EXECUTE ON FUNCTION public.update_user_profile_admin(uuid, text, text, boolean, text) TO authenticated;

