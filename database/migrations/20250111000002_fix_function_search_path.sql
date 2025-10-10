-- =========================================
-- CRITICAL FIX: Add search_path to all PL/pgSQL functions
-- Migration: 20250111000002_fix_function_search_path
-- =========================================
-- This migration fixes the security vulnerability where functions
-- without explicit search_path can be exploited for privilege escalation.
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- =========================================

-- =========================================
-- Fix: set_updated_at()
-- =========================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =========================================
-- Fix: line_item_parent_exists()
-- =========================================
CREATE OR REPLACE FUNCTION public.line_item_parent_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  exists_bool BOOLEAN;
BEGIN
  IF NEW.parent_type = 'quote' THEN
    SELECT EXISTS(SELECT 1 FROM public.quotes WHERE id = NEW.parent_id) INTO exists_bool;
  ELSIF NEW.parent_type = 'order' THEN
    SELECT EXISTS(SELECT 1 FROM public.orders WHERE id = NEW.parent_id) INTO exists_bool;
  ELSIF NEW.parent_type = 'invoice' THEN
    SELECT EXISTS(SELECT 1 FROM public.invoices WHERE id = NEW.parent_id) INTO exists_bool;
  ELSE
    RAISE EXCEPTION 'Invalid parent_type %', NEW.parent_type;
  END IF;

  IF NOT exists_bool THEN
    RAISE EXCEPTION 'line_items parent not found: % %', NEW.parent_type, NEW.parent_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =========================================
-- Fix: next_doc_number()
-- =========================================
CREATE OR REPLACE FUNCTION public.next_doc_number(
  p_doc_type TEXT,
  p_prefix TEXT,
  p_year_infix BOOLEAN,
  p_pad INT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  y INT := EXTRACT(YEAR FROM NOW())::INT;
  c INT;
  infix TEXT := CASE WHEN p_year_infix THEN '-' || y::TEXT || '-' ELSE '-' END;
  fmt TEXT;
BEGIN
  INSERT INTO public.numbering_counters (doc_type, year, counter)
  VALUES (p_doc_type, y, 0)
  ON CONFLICT (doc_type, year) DO NOTHING;

  UPDATE public.numbering_counters
  SET counter = counter + 1
  WHERE doc_type = p_doc_type AND year = y
  RETURNING counter INTO c;

  fmt := LPAD(c::TEXT, p_pad, '0');
  RETURN p_prefix || infix || fmt;
END;
$$;

-- =========================================
-- Fix: update_tasks_updated_at()
-- =========================================
CREATE OR REPLACE FUNCTION public.update_tasks_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =========================================
-- Fix: create_task_activity()
-- =========================================
CREATE OR REPLACE FUNCTION public.create_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Insert activity record
  INSERT INTO public.task_activities (task_id, user_id, activity_type, old_value, new_value, description)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.user_id, OLD.user_id),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'UPDATE' THEN 'updated'
      WHEN TG_OP = 'DELETE' THEN 'deleted'
    END,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Task created'
      WHEN TG_OP = 'UPDATE' THEN 'Task updated'
      WHEN TG_OP = 'DELETE' THEN 'Task deleted'
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =========================================
-- Fix: compute_activity_status()
-- =========================================
CREATE OR REPLACE FUNCTION public.compute_activity_status(last_activity TIMESTAMPTZ)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  days_since INT;
BEGIN
  IF last_activity IS NULL THEN
    RETURN 'red';
  END IF;
  
  days_since := EXTRACT(DAY FROM NOW() - last_activity)::INT;
  
  IF days_since <= 7 THEN
    RETURN 'green';
  ELSIF days_since <= 30 THEN
    RETURN 'yellow';
  ELSE
    RETURN 'red';
  END IF;
END;
$$;

-- =========================================
-- Fix: update_company_activity_status()
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
-- Fix: trg_update_company_activity()
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
-- Verification
-- =========================================
-- Run this query to verify functions have search_path set:
-- SELECT proname, prosecdef, proconfig 
-- FROM pg_proc 
-- WHERE pronamespace = 'public'::regnamespace 
-- AND proname IN (
--   'set_updated_at', 
--   'line_item_parent_exists', 
--   'next_doc_number',
--   'update_tasks_updated_at',
--   'create_task_activity',
--   'compute_activity_status',
--   'update_company_activity_status',
--   'trg_update_company_activity'
-- );

