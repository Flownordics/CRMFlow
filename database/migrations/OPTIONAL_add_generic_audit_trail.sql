-- =========================================
-- OPTIONAL: Generic Audit Trail Implementation
-- =========================================
-- Creates a comprehensive audit log for tracking all changes
-- to critical data in the database
-- =========================================

-- =========================================
-- Step 1: Create generic audit_trail table
-- =========================================

CREATE TABLE IF NOT EXISTS public.audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was changed
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  
  -- What type of change
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  
  -- Who made the change
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- When
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- What changed (JSONB for flexibility)
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],  -- Array of field names that changed
  
  -- Additional context
  ip_address INET,
  user_agent TEXT,
  request_id TEXT,
  
  -- Indexes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================
-- Step 2: Add indexes for audit queries
-- =========================================

-- Query by table and record
CREATE INDEX IF NOT EXISTS idx_audit_trail_table_record 
  ON public.audit_trail (table_name, record_id, changed_at DESC);

-- Query by user
CREATE INDEX IF NOT EXISTS idx_audit_trail_user 
  ON public.audit_trail (user_id, changed_at DESC);

-- Query by time
CREATE INDEX IF NOT EXISTS idx_audit_trail_time 
  ON public.audit_trail (changed_at DESC);

-- Query by operation type
CREATE INDEX IF NOT EXISTS idx_audit_trail_operation 
  ON public.audit_trail (operation, changed_at DESC);

-- GIN index for JSONB queries on changed values
CREATE INDEX IF NOT EXISTS idx_audit_trail_old_values 
  ON public.audit_trail USING GIN (old_values);

CREATE INDEX IF NOT EXISTS idx_audit_trail_new_values 
  ON public.audit_trail USING GIN (new_values);

-- =========================================
-- Step 3: Enable RLS
-- =========================================

ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view audit trail
DROP POLICY IF EXISTS "Allow authenticated users to view audit_trail" ON public.audit_trail;
CREATE POLICY "Allow authenticated users to view audit_trail" 
  ON public.audit_trail 
  FOR SELECT 
  USING ((SELECT auth.role()) = 'authenticated');

-- Only system can insert (via trigger)
DROP POLICY IF EXISTS "Allow system to insert audit_trail" ON public.audit_trail;
CREATE POLICY "Allow system to insert audit_trail" 
  ON public.audit_trail 
  FOR INSERT 
  WITH CHECK (true);  -- Trigger function bypasses RLS

-- Prevent updates/deletes
DROP POLICY IF EXISTS "Prevent audit_trail modifications" ON public.audit_trail;
CREATE POLICY "Prevent audit_trail modifications" 
  ON public.audit_trail 
  FOR UPDATE 
  USING (false);

-- =========================================
-- Step 4: Create audit logging function
-- =========================================

CREATE OR REPLACE FUNCTION public.log_audit_trail()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_values JSONB;
  v_new_values JSONB;
  v_changed_fields TEXT[];
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Prepare old and new values
  IF TG_OP = 'DELETE' THEN
    v_old_values := to_jsonb(OLD);
    v_new_values := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_old_values := NULL;
    v_new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
    
    -- Identify changed fields
    SELECT ARRAY_AGG(key)
    INTO v_changed_fields
    FROM jsonb_each(v_new_values)
    WHERE v_new_values->key IS DISTINCT FROM v_old_values->key;
  END IF;
  
  -- Insert audit record
  INSERT INTO public.audit_trail (
    table_name,
    record_id,
    operation,
    user_id,
    old_values,
    new_values,
    changed_fields
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    v_user_id,
    v_old_values,
    v_new_values,
    v_changed_fields
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =========================================
-- Step 5: Add triggers to tables
-- =========================================

-- Companies
DROP TRIGGER IF EXISTS trg_audit_companies ON public.companies;
CREATE TRIGGER trg_audit_companies
  AFTER INSERT OR UPDATE OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

-- People
DROP TRIGGER IF EXISTS trg_audit_people ON public.people;
CREATE TRIGGER trg_audit_people
  AFTER INSERT OR UPDATE OR DELETE ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

-- Deals
DROP TRIGGER IF EXISTS trg_audit_deals ON public.deals;
CREATE TRIGGER trg_audit_deals
  AFTER INSERT OR UPDATE OR DELETE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

-- Quotes
DROP TRIGGER IF EXISTS trg_audit_quotes ON public.quotes;
CREATE TRIGGER trg_audit_quotes
  AFTER INSERT OR UPDATE OR DELETE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

-- Orders
DROP TRIGGER IF EXISTS trg_audit_orders ON public.orders;
CREATE TRIGGER trg_audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

-- Invoices
DROP TRIGGER IF EXISTS trg_audit_invoices ON public.invoices;
CREATE TRIGGER trg_audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

-- Payments
DROP TRIGGER IF EXISTS trg_audit_payments ON public.payments;
CREATE TRIGGER trg_audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

-- Line Items
DROP TRIGGER IF EXISTS trg_audit_line_items ON public.line_items;
CREATE TRIGGER trg_audit_line_items
  AFTER INSERT OR UPDATE OR DELETE ON public.line_items
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

-- =========================================
-- Step 6: Create helpful views
-- =========================================

-- View for recent changes
CREATE OR REPLACE VIEW public.recent_audit_changes AS
SELECT 
  a.id,
  a.table_name,
  a.record_id,
  a.operation,
  a.changed_at,
  a.changed_fields,
  u.email AS user_email,
  CASE 
    WHEN a.operation = 'INSERT' THEN 'Created'
    WHEN a.operation = 'UPDATE' THEN 'Modified: ' || COALESCE(array_to_string(a.changed_fields, ', '), 'unknown')
    WHEN a.operation = 'DELETE' THEN 'Deleted'
  END AS change_summary
FROM public.audit_trail a
LEFT JOIN auth.users u ON a.user_id = u.id
WHERE a.changed_at > NOW() - INTERVAL '7 days'
ORDER BY a.changed_at DESC;

-- View for user activity
CREATE OR REPLACE VIEW public.user_audit_activity AS
SELECT 
  u.email,
  a.table_name,
  COUNT(*) AS change_count,
  MAX(a.changed_at) AS last_change,
  COUNT(*) FILTER (WHERE a.operation = 'INSERT') AS inserts,
  COUNT(*) FILTER (WHERE a.operation = 'UPDATE') AS updates,
  COUNT(*) FILTER (WHERE a.operation = 'DELETE') AS deletes
FROM public.audit_trail a
JOIN auth.users u ON a.user_id = u.id
WHERE a.changed_at > NOW() - INTERVAL '30 days'
GROUP BY u.email, a.table_name
ORDER BY change_count DESC;

-- =========================================
-- Step 7: Create cleanup job
-- =========================================

-- Function to cleanup old audit records
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_trail(
  p_days_old INT DEFAULT 365
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.audit_trail
  WHERE changed_at < NOW() - INTERVAL '1 day' * p_days_old;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- Schedule cleanup (if pg_cron available)
-- Runs first day of each month at 3 AM
-- SELECT cron.schedule(
--   'cleanup-old-audit-trail',
--   '0 3 1 * *',
--   'SELECT public.cleanup_old_audit_trail(365)'
-- );

-- =========================================
-- Usage Examples
-- =========================================

-- View all changes to a specific company
-- SELECT * FROM public.audit_trail
-- WHERE table_name = 'companies' AND record_id = 'uuid-here'
-- ORDER BY changed_at DESC;

-- View what changed in a specific field
-- SELECT 
--   changed_at,
--   old_values->>'field_name' AS old_value,
--   new_values->>'field_name' AS new_value
-- FROM public.audit_trail
-- WHERE table_name = 'invoices' AND record_id = 'uuid-here'
-- AND 'field_name' = ANY(changed_fields)
-- ORDER BY changed_at DESC;

-- View all changes by a specific user
-- SELECT * FROM public.audit_trail
-- WHERE user_id = 'user-uuid-here'
-- ORDER BY changed_at DESC;

-- View recent changes across all tables
-- SELECT * FROM public.recent_audit_changes LIMIT 100;

-- View most active users
-- SELECT * FROM public.user_audit_activity;

-- Find who deleted a record
-- SELECT 
--   u.email,
--   a.changed_at,
--   a.old_values
-- FROM public.audit_trail a
-- JOIN auth.users u ON a.user_id = u.id
-- WHERE a.table_name = 'deals' 
-- AND a.record_id = 'uuid-here'
-- AND a.operation = 'DELETE';

-- =========================================
-- Monitoring Queries
-- =========================================

-- Check audit trail size
SELECT 
  pg_size_pretty(pg_total_relation_size('public.audit_trail')) AS total_size,
  COUNT(*) AS record_count,
  COUNT(*) / GREATEST(EXTRACT(EPOCH FROM (MAX(changed_at) - MIN(changed_at))) / 86400, 1) AS avg_records_per_day
FROM public.audit_trail;

-- Check audit trail by table
SELECT 
  table_name,
  COUNT(*) AS audit_records,
  COUNT(DISTINCT record_id) AS unique_records,
  MAX(changed_at) AS last_change
FROM public.audit_trail
GROUP BY table_name
ORDER BY audit_records DESC;

-- Check operations distribution
SELECT 
  operation,
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM public.audit_trail
GROUP BY operation;

-- =========================================
-- Benefits
-- =========================================
-- ✅ Complete change history for all critical data
-- ✅ Know who changed what and when
-- ✅ See old vs new values
-- ✅ Compliance and security requirements
-- ✅ Debug data issues
-- ✅ Recover from mistakes

-- =========================================
-- Trade-offs
-- =========================================
-- ⚠️ Increases database size (plan for ~2-5x size of audited tables)
-- ⚠️ Slight write performance overhead (~5-10%)
-- ⚠️ Requires cleanup job for old records
-- ⚠️ JSONB storage can be large for big records

-- =========================================
-- Performance Considerations
-- =========================================
-- - Trigger adds ~1-2ms per write operation
-- - JSONB indexes allow fast queries on changed values
-- - Partition table by time for better performance (advanced)
-- - Consider archiving old audit records to separate table

-- =========================================
-- Advanced: Partition by Month (Optional)
-- =========================================
-- For high-volume applications, partition audit_trail by month
-- This keeps queries fast even with millions of audit records

-- CREATE TABLE audit_trail_2025_01 PARTITION OF audit_trail
-- FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
-- 
-- CREATE TABLE audit_trail_2025_02 PARTITION OF audit_trail
-- FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- 
-- ... etc

-- =========================================
-- Integration with Application
-- =========================================

-- 1. No changes needed! Audit triggers run automatically

-- 2. Add "View History" button in UI to show audit trail

-- 3. Example React component query:
--    const { data } = useQuery('audit-trail', () =>
--      supabase.from('audit_trail')
--        .select('*')
--        .eq('table_name', 'companies')
--        .eq('record_id', companyId)
--        .order('changed_at', { ascending: false })
--    );

-- 4. Show "Last modified by X on Y" in UI:
--    SELECT u.email, a.changed_at
--    FROM audit_trail a
--    JOIN auth.users u ON a.user_id = u.id
--    WHERE a.table_name = 'companies' 
--    AND a.record_id = ?
--    ORDER BY a.changed_at DESC
--    LIMIT 1;

