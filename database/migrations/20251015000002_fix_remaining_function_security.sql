-- =========================================
-- Fix Remaining Function Security Issues
-- Migration: 20251015000002_fix_remaining_function_security
-- =========================================
-- This migration fixes the remaining functions that are missing
-- the search_path security setting to prevent privilege escalation attacks
-- =========================================

-- =========================================
-- 1. trg_update_company_activity()
-- =========================================
CREATE OR REPLACE FUNCTION public.trg_update_company_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.update_company_activity_status();
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$;

-- =========================================
-- 2. validate_invoice_status()
-- =========================================
CREATE OR REPLACE FUNCTION public.validate_invoice_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Validate invoice status transitions
  IF NEW.status = 'paid' AND NEW.total_minor != NEW.paid_minor THEN
    RAISE EXCEPTION 'Cannot mark invoice as paid when balance is not zero';
  END IF;
  
  RETURN NEW;
END;
$$;

-- =========================================
-- 3. cleanup_deal_positions()
-- =========================================
CREATE OR REPLACE FUNCTION public.cleanup_deal_positions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- When a deal is deleted or moved to another stage, cleanup positions
  IF TG_OP = 'DELETE' THEN
    -- Reorder remaining deals in the stage
    WITH ranked_deals AS (
      SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY position) - 1 AS new_position
      FROM public.deals
      WHERE stage_id = OLD.stage_id
        AND id != OLD.id
        AND deleted_at IS NULL
    )
    UPDATE public.deals d
    SET position = rd.new_position
    FROM ranked_deals rd
    WHERE d.id = rd.id
      AND d.position != rd.new_position;
      
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND OLD.stage_id != NEW.stage_id THEN
    -- Deal moved to different stage, cleanup old stage
    WITH ranked_deals AS (
      SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY position) - 1 AS new_position
      FROM public.deals
      WHERE stage_id = OLD.stage_id
        AND id != NEW.id
        AND deleted_at IS NULL
    )
    UPDATE public.deals d
    SET position = rd.new_position
    FROM ranked_deals rd
    WHERE d.id = rd.id
      AND d.position != rd.new_position;
      
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =========================================
-- 4. log_deal_to_company_activity()
-- =========================================
CREATE OR REPLACE FUNCTION public.log_deal_to_company_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  activity_type TEXT;
  activity_notes TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    activity_type := 'deal';
    activity_notes := 'New deal created: ' || NEW.title;
  ELSIF TG_OP = 'UPDATE' THEN
    activity_type := 'deal';
    
    IF OLD.stage_id != NEW.stage_id THEN
      activity_notes := 'Deal moved to new stage: ' || NEW.title;
    ELSIF OLD.expected_value_minor != NEW.expected_value_minor THEN
      activity_notes := 'Deal value updated: ' || NEW.title;
    ELSE
      activity_notes := 'Deal updated: ' || NEW.title;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    activity_type := 'deal';
    activity_notes := 'Deal deleted: ' || OLD.title;
  END IF;
  
  -- Insert into activity_log
  INSERT INTO public.activity_log (
    company_id,
    user_id,
    type,
    notes,
    meta
  )
  VALUES (
    COALESCE(NEW.company_id, OLD.company_id),
    auth.uid(),
    activity_type,
    activity_notes,
    jsonb_build_object(
      'deal_id', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =========================================
-- 5. log_task_to_company_activity()
-- =========================================
CREATE OR REPLACE FUNCTION public.log_task_to_company_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  task_company_id UUID;
  activity_notes TEXT;
BEGIN
  -- Get company_id from task
  task_company_id := COALESCE(NEW.company_id, OLD.company_id);
  
  -- Skip if no company_id
  IF task_company_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    activity_notes := 'Task created: ' || NEW.title;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      activity_notes := 'Task status changed to ' || NEW.status || ': ' || NEW.title;
    ELSE
      activity_notes := 'Task updated: ' || NEW.title;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    activity_notes := 'Task deleted: ' || OLD.title;
  END IF;
  
  -- Insert into activity_log
  INSERT INTO public.activity_log (
    company_id,
    user_id,
    type,
    notes,
    meta
  )
  VALUES (
    task_company_id,
    auth.uid(),
    'task',
    activity_notes,
    jsonb_build_object(
      'task_id', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =========================================
-- 6. update_company_activity_status() (already fixed but updating)
-- =========================================
CREATE OR REPLACE FUNCTION public.update_company_activity_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.companies
  SET 
    last_activity_at = NOW(),
    activity_status = public.compute_activity_status(NOW())
  WHERE id = NEW.company_id;
  
  RETURN NEW;
END;
$$;

-- =========================================
-- 7. upsert_user_integration()
-- =========================================
CREATE OR REPLACE FUNCTION public.upsert_user_integration(
  p_user_id UUID,
  p_provider TEXT,
  p_kind TEXT,
  p_email TEXT,
  p_access_token TEXT,
  p_refresh_token TEXT,
  p_expires_at TIMESTAMPTZ,
  p_scopes TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.user_integrations (
    user_id,
    provider,
    kind,
    email,
    access_token,
    refresh_token,
    expires_at,
    scopes,
    connected_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_provider,
    p_kind,
    p_email,
    p_access_token,
    p_refresh_token,
    p_expires_at,
    p_scopes,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, provider, kind) 
  DO UPDATE SET
    email = EXCLUDED.email,
    access_token = EXCLUDED.access_token,
    refresh_token = COALESCE(EXCLUDED.refresh_token, user_integrations.refresh_token),
    expires_at = EXCLUDED.expires_at,
    scopes = EXCLUDED.scopes,
    updated_at = NOW()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- =========================================
-- 8. exec_sql() - This is a dangerous function, let's comment on security
-- =========================================
-- WARNING: This function allows executing arbitrary SQL
-- It should be very carefully secured or removed in production

CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only allow admins to execute arbitrary SQL
  IF NOT public.user_is_admin() THEN
    RAISE EXCEPTION 'Only admins can execute SQL';
  END IF;
  
  EXECUTE sql;
END;
$$;

COMMENT ON FUNCTION public.exec_sql IS 'DANGEROUS: Executes arbitrary SQL. Only accessible by admins. Consider removing in production.';

-- =========================================
-- Verification
-- =========================================
-- Run this query to verify all functions have search_path set:
-- SELECT 
--   proname, 
--   prosecdef, 
--   proconfig 
-- FROM pg_proc 
-- WHERE pronamespace = 'public'::regnamespace 
-- AND proname IN (
--   'trg_update_company_activity',
--   'validate_invoice_status',
--   'cleanup_deal_positions',
--   'log_deal_to_company_activity',
--   'log_task_to_company_activity',
--   'update_company_activity_status',
--   'upsert_user_integration',
--   'exec_sql'
-- )
-- ORDER BY proname;



