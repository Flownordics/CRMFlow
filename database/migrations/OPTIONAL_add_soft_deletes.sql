-- =========================================
-- OPTIONAL: Soft Delete Implementation
-- =========================================
-- Adds soft delete capability to critical tables
-- Allows recovery of accidentally deleted records
-- =========================================

-- =========================================
-- Step 1: Add deleted_at columns
-- =========================================

-- High Priority Tables
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Medium Priority Tables
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =========================================
-- Step 2: Add indexes for soft delete queries
-- =========================================

-- Index for filtering non-deleted records
CREATE INDEX IF NOT EXISTS idx_companies_deleted_at 
  ON public.companies (deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_people_deleted_at 
  ON public.people (deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_deals_deleted_at 
  ON public.deals (deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at 
  ON public.quotes (deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_deleted_at 
  ON public.orders (deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at 
  ON public.invoices (deleted_at) WHERE deleted_at IS NULL;

-- =========================================
-- Step 3: Create views for active records
-- =========================================

-- These views automatically filter out deleted records
-- Use these in your application instead of querying tables directly

CREATE OR REPLACE VIEW public.active_companies AS
SELECT * FROM public.companies WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_people AS
SELECT * FROM public.people WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_deals AS
SELECT * FROM public.deals WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_quotes AS
SELECT * FROM public.quotes WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_orders AS
SELECT * FROM public.orders WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_invoices AS
SELECT * FROM public.invoices WHERE deleted_at IS NULL;

-- =========================================
-- Step 4: Create soft delete helper functions
-- =========================================

-- Soft delete function
CREATE OR REPLACE FUNCTION public.soft_delete(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    p_table_name
  ) USING p_record_id;
  
  RETURN FOUND;
END;
$$;

-- Restore deleted record
CREATE OR REPLACE FUNCTION public.restore_deleted(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
    p_table_name
  ) USING p_record_id;
  
  RETURN FOUND;
END;
$$;

-- Permanently delete (hard delete) old soft-deleted records
CREATE OR REPLACE FUNCTION public.permanently_delete_old(
  p_table_name TEXT,
  p_days_old INT DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  EXECUTE format(
    'DELETE FROM %I WHERE deleted_at < NOW() - INTERVAL ''%s days''',
    p_table_name,
    p_days_old
  );
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- =========================================
-- Step 5: Create cleanup job (pg_cron)
-- =========================================

-- If pg_cron is available, schedule cleanup of old deleted records
-- This runs every Sunday at 2 AM and permanently deletes records deleted > 90 days ago

-- SELECT cron.schedule(
--   'cleanup-old-soft-deletes',
--   '0 2 * * 0',  -- Every Sunday at 2 AM
--   $$
--   SELECT public.permanently_delete_old('companies', 90);
--   SELECT public.permanently_delete_old('people', 90);
--   SELECT public.permanently_delete_old('deals', 90);
--   SELECT public.permanently_delete_old('quotes', 90);
--   SELECT public.permanently_delete_old('orders', 90);
--   SELECT public.permanently_delete_old('invoices', 90);
--   $$
-- );

-- =========================================
-- Step 6: Update RLS policies (if needed)
-- =========================================

-- Example: Update policies to only show non-deleted records
-- You may need to update your existing policies

-- DROP POLICY IF EXISTS "Allow authenticated users to manage companies" ON public.companies;
-- CREATE POLICY "Allow authenticated users to manage companies" 
--   ON public.companies 
--   FOR ALL 
--   USING ((SELECT auth.role()) = 'authenticated' AND deleted_at IS NULL) 
--   WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Usage Examples
-- =========================================

-- Soft delete a company
-- SELECT public.soft_delete('companies', 'uuid-here');

-- Restore a deleted company
-- SELECT public.restore_deleted('companies', 'uuid-here');

-- View deleted companies
-- SELECT * FROM public.companies WHERE deleted_at IS NOT NULL;

-- Permanently delete old records (manual trigger)
-- SELECT public.permanently_delete_old('companies', 90);

-- =========================================
-- Application Code Changes Required
-- =========================================

-- 1. Update all SELECT queries to filter deleted records:
--    Before: SELECT * FROM companies
--    After:  SELECT * FROM companies WHERE deleted_at IS NULL
--    Or:     SELECT * FROM active_companies

-- 2. Change DELETE operations to soft deletes:
--    Before: DELETE FROM companies WHERE id = ?
--    After:  UPDATE companies SET deleted_at = NOW() WHERE id = ?
--    Or:     SELECT public.soft_delete('companies', ?)

-- 3. Add "Restore" functionality in UI for deleted records

-- 4. Add "Recently Deleted" view in UI showing:
--    SELECT * FROM companies 
--    WHERE deleted_at > NOW() - INTERVAL '30 days'
--    ORDER BY deleted_at DESC

-- =========================================
-- Benefits
-- =========================================
-- ✅ Recover accidentally deleted data
-- ✅ Audit trail (who deleted what when)
-- ✅ "Trash bin" feature in UI
-- ✅ Maintain referential integrity
-- ✅ Compliance with data retention policies

-- =========================================
-- Trade-offs
-- =========================================
-- ⚠️ All queries must filter deleted_at IS NULL
-- ⚠️ Database size increases (deleted records retained)
-- ⚠️ Need cleanup job for old deleted records
-- ⚠️ Slightly more complex queries

-- =========================================
-- Monitoring
-- =========================================

-- Count of soft-deleted records per table
SELECT 
  'companies' AS table_name,
  COUNT(*) AS deleted_count,
  pg_size_pretty(pg_total_relation_size('public.companies')) AS table_size
FROM public.companies WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 
  'people',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('public.people'))
FROM public.people WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 
  'deals',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('public.deals'))
FROM public.deals WHERE deleted_at IS NOT NULL;

-- Old deleted records (candidates for permanent deletion)
SELECT 
  'companies' AS table_name,
  COUNT(*) AS old_deleted_count,
  MIN(deleted_at) AS oldest_deletion
FROM public.companies 
WHERE deleted_at < NOW() - INTERVAL '90 days';

