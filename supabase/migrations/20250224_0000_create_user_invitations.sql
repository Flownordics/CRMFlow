-- =========================================
-- CRMFlow – User Invitations System
-- =========================================
-- Creates table and RPC functions for invitation-based user onboarding

-- Create user_invitations table
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'sales', 'support', 'viewer')),
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON public.user_invitations (email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations (token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON public.user_invitations (invited_by);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON public.user_invitations (expires_at);

-- Create updated_at trigger
CREATE TRIGGER trg_user_invitations_updated_at
  BEFORE UPDATE ON public.user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Enable RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- For now, allow authenticated users to manage invitations
-- This can be tightened later when user_roles table is implemented
-- Users can view invitations they created
CREATE POLICY "Users can view their own invitations"
  ON public.user_invitations
  FOR SELECT
  USING (invited_by = auth.uid());

-- Authenticated users can create invitations
CREATE POLICY "Authenticated users can create invitations"
  ON public.user_invitations
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND invited_by = auth.uid()
  );

-- Users can delete invitations they created
CREATE POLICY "Users can delete their own invitations"
  ON public.user_invitations
  FOR DELETE
  USING (invited_by = auth.uid());

-- RPC Function: Get pending invitations
CREATE OR REPLACE FUNCTION public.get_pending_invitations()
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  invited_by uuid,
  invited_by_name text,
  token text,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Return invitations created by the current user
  -- TODO: Add admin check when user_roles table is implemented
  RETURN QUERY
  SELECT 
    i.id,
    i.email,
    i.role,
    i.invited_by,
    COALESCE(u.raw_user_meta_data->>'name', u.email, 'Unknown') as invited_by_name,
    i.token,
    i.expires_at,
    i.accepted_at,
    i.created_at
  FROM public.user_invitations i
  LEFT JOIN auth.users u ON i.invited_by = u.id
  WHERE i.invited_by = auth.uid()
    AND i.accepted_at IS NULL
    AND i.expires_at > now()
  ORDER BY i.created_at DESC;
END;
$$;

-- RPC Function: Create invitation
CREATE OR REPLACE FUNCTION public.create_invitation(
  p_email text,
  p_role text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token text;
  v_invitation_id uuid;
  v_expires_at timestamptz;
BEGIN
  -- TODO: Add admin check when user_roles table is implemented
  -- For now, allow any authenticated user to create invitations

  -- Validate role (matching types from rbac.ts)
  IF p_role NOT IN ('admin', 'manager', 'sales', 'support', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Check if user already exists
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = lower(p_email)
  ) THEN
    RAISE EXCEPTION 'User with email % already exists', p_email;
  END IF;

  -- Check if pending invitation already exists
  IF EXISTS (
    SELECT 1 FROM public.user_invitations
    WHERE email = lower(p_email)
      AND accepted_at IS NULL
      AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Pending invitation already exists for email %', p_email;
  END IF;

  -- Generate secure token
  v_token := encode(gen_random_bytes(32), 'base64url');
  
  -- Set expiration to 7 days from now
  v_expires_at := now() + interval '7 days';

  -- Create invitation
  INSERT INTO public.user_invitations (
    email,
    role,
    token,
    invited_by,
    expires_at
  ) VALUES (
    lower(p_email),
    p_role,
    v_token,
    auth.uid(),
    v_expires_at
  )
  RETURNING id INTO v_invitation_id;

  RETURN v_token;
END;
$$;

-- RPC Function: Revoke invitation
CREATE OR REPLACE FUNCTION public.revoke_invitation(
  p_invitation_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- TODO: Add admin check when user_roles table is implemented
  -- For now, allow users to delete invitations they created
  -- Delete invitation
  DELETE FROM public.user_invitations
  WHERE id = p_invitation_id
    AND invited_by = auth.uid()
    AND accepted_at IS NULL;

  RETURN FOUND;
END;
$$;

-- RPC Function: Validate invitation token (public, for signup page)
CREATE OR REPLACE FUNCTION public.validate_invitation_token(
  p_token text
)
RETURNS TABLE (
  is_valid boolean,
  email text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invitation public.user_invitations%ROWTYPE;
BEGIN
  -- Find invitation by token
  SELECT * INTO v_invitation
  FROM public.user_invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  -- Return validation result
  IF v_invitation.id IS NOT NULL THEN
    RETURN QUERY SELECT true, v_invitation.email, v_invitation.role;
  ELSE
    RETURN QUERY SELECT false, NULL::text, NULL::text;
  END IF;
END;
$$;

-- RPC Function: Accept invitation (called after user signs up)
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_token text,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invitation public.user_invitations%ROWTYPE;
BEGIN
  -- Find invitation by token
  SELECT * INTO v_invitation
  FROM public.user_invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  -- Check if invitation exists and is valid
  IF v_invitation.id IS NULL THEN
    RETURN false;
  END IF;

  -- Verify user email matches invitation email
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id
      AND email = v_invitation.email
  ) THEN
    RAISE EXCEPTION 'User email does not match invitation email';
  END IF;

  -- Mark invitation as accepted
  UPDATE public.user_invitations
  SET accepted_at = now()
  WHERE id = v_invitation.id;

  -- TODO: Assign role to user when user_roles table is implemented
  -- For now, role assignment can be handled in application code or via user metadata
  -- The role is stored in the invitation and can be used during signup

  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_pending_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_invitation(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invitation_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text, uuid) TO authenticated;

