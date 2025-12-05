-- Migration: Create function to get all users for assignee dropdowns
-- This function returns all users from auth.users, joined with user_settings
-- Author: CRMFlow
-- Date: 2025-02-25

-- Create function that returns all users with their settings
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  name text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    COALESCE(u.email, '')::text as email,
    COALESCE(us.name, 
      -- Extract name from email if no name in user_settings
      CASE 
        WHEN u.email IS NOT NULL THEN
          INITCAP(SPLIT_PART(u.email, '@', 1))
        ELSE NULL
      END
    )::text as name
  FROM auth.users u
  LEFT JOIN public.user_settings us ON u.id = us.user_id
  WHERE u.deleted_at IS NULL  -- Only include active users
  ORDER BY COALESCE(us.name, INITCAP(SPLIT_PART(u.email, '@', 1)), u.email) NULLS LAST;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_all_users() IS 'Returns all active users for assignee dropdowns, including users without user_settings entries';





