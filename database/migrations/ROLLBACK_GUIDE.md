# Rollback Guide for Database Migrations

## Overview
This guide provides step-by-step instructions for rolling back the database migrations if issues occur.

## When to Rollback

Consider rollback if:
- ❌ Application is broken after deployment
- ❌ Critical functionality is inaccessible
- ❌ Data integrity issues occur
- ❌ Performance degradation is severe

## Rollback Options

### Option 1: Full Restore from Backup (Fastest, Most Complete)

**⚠️ WARNING:** This will lose all data changes made after the backup.

```bash
# Using Supabase CLI
supabase db restore backup_before_fixes_TIMESTAMP.sql

# Or from Supabase Dashboard:
# Project Settings > Database > Restore from Backup
```

### Option 2: Selective Rollback (Per Migration)

Roll back migrations in **reverse order** (005 → 001).

---

## Rollback: Migration 005 (Constraints & Timestamps)

```sql
-- =========================================
-- ROLLBACK: 20250111000005_add_missing_constraints
-- =========================================

-- Remove unique constraint on line_items
DROP INDEX IF EXISTS public.uidx_line_items_parent_position;

-- Remove check constraints
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS check_events_time_range;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS check_tasks_completed_at_logic;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS check_payments_amount_positive;
ALTER TABLE public.line_items DROP CONSTRAINT IF EXISTS check_line_items_qty_positive;
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS check_quotes_valid_until;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS check_invoices_due_date;

-- Remove timestamps from pipelines
DROP TRIGGER IF EXISTS trg_pipelines_updated_at ON public.pipelines;
ALTER TABLE public.pipelines DROP COLUMN IF EXISTS created_at;
ALTER TABLE public.pipelines DROP COLUMN IF EXISTS updated_at;

-- Remove timestamps from stages
DROP TRIGGER IF EXISTS trg_stages_updated_at ON public.stages;
ALTER TABLE public.stages DROP COLUMN IF EXISTS created_at;
ALTER TABLE public.stages DROP COLUMN IF EXISTS updated_at;

-- Remove timestamps from numbering_counters
DROP TRIGGER IF EXISTS trg_numbering_counters_updated_at ON public.numbering_counters;
ALTER TABLE public.numbering_counters DROP COLUMN IF EXISTS created_at;
ALTER TABLE public.numbering_counters DROP COLUMN IF EXISTS updated_at;

-- Remove updated_at from activities
DROP TRIGGER IF EXISTS trg_activities_updated_at ON public.activities;
ALTER TABLE public.activities DROP COLUMN IF EXISTS updated_at;
```

---

## Rollback: Migration 004 (Missing Indexes)

```sql
-- =========================================
-- ROLLBACK: 20250111000004_add_missing_indexes
-- =========================================

-- Drop all added indexes
DROP INDEX IF EXISTS public.idx_deals_contact;
DROP INDEX IF EXISTS public.idx_quotes_contact;
DROP INDEX IF EXISTS public.idx_orders_contact;
DROP INDEX IF EXISTS public.idx_invoices_contact;
DROP INDEX IF EXISTS public.idx_task_activities_task;
DROP INDEX IF EXISTS public.idx_task_activities_user;
DROP INDEX IF EXISTS public.idx_task_comments_task;
DROP INDEX IF EXISTS public.idx_task_comments_user;
DROP INDEX IF EXISTS public.idx_tasks_assigned_by;
```

---

## Rollback: Migration 003 (RLS Policy Optimization)

**Note:** This rollback restores the original (slower) policy format.

```sql
-- =========================================
-- ROLLBACK: 20250111000003_optimize_rls_policies
-- =========================================

-- Restore original people policy
DROP POLICY IF EXISTS "Allow authenticated users to manage people" ON public.people;
CREATE POLICY "Allow authenticated users to manage people" 
  ON public.people 
  FOR ALL 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

-- Restore original companies policy
DROP POLICY IF EXISTS "Allow authenticated users to manage companies" ON public.companies;
CREATE POLICY "Allow authenticated users to manage companies" 
  ON public.companies 
  FOR ALL 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

-- Restore original deals policy
DROP POLICY IF EXISTS "Allow authenticated users to manage deals" ON public.deals;
CREATE POLICY "Allow authenticated users to manage deals" 
  ON public.deals 
  FOR ALL 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

-- Restore original quotes policy
DROP POLICY IF EXISTS "Allow authenticated users to manage quotes" ON public.quotes;
CREATE POLICY "Allow authenticated users to manage quotes" 
  ON public.quotes 
  FOR ALL 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

-- Restore original orders policy
DROP POLICY IF EXISTS "Allow authenticated users to manage orders" ON public.orders;
CREATE POLICY "Allow authenticated users to manage orders" 
  ON public.orders 
  FOR ALL 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

-- Restore original invoices policy
DROP POLICY IF EXISTS "Allow authenticated users to manage invoices" ON public.invoices;
CREATE POLICY "Allow authenticated users to manage invoices" 
  ON public.invoices 
  FOR ALL 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

-- Restore original line_items policy
DROP POLICY IF EXISTS "Allow authenticated users to manage line_items" ON public.line_items;
CREATE POLICY "Allow authenticated users to manage line_items" 
  ON public.line_items 
  FOR ALL 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

-- Restore original payments policy
DROP POLICY IF EXISTS "Allow authenticated users to manage payments" ON public.payments;
CREATE POLICY "Allow authenticated users to manage payments" 
  ON public.payments 
  FOR ALL 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

-- Restore original activities policy
DROP POLICY IF EXISTS "Allow authenticated users to manage activities" ON public.activities;
CREATE POLICY "Allow authenticated users to manage activities" 
  ON public.activities 
  FOR ALL 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

-- Restore original documents policy
DROP POLICY IF EXISTS "Allow authenticated users to manage documents" ON public.documents;
CREATE POLICY "Allow authenticated users to manage documents" 
  ON public.documents 
  FOR ALL 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

-- Restore original workspace_settings policy
DROP POLICY IF EXISTS "Allow authenticated users to manage workspace_settings" ON public.workspace_settings;
CREATE POLICY "Allow authenticated users to manage workspace_settings" 
  ON public.workspace_settings 
  FOR ALL 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

-- Restore original idempotency_keys policy
DROP POLICY IF EXISTS "Allow authenticated users to manage idempotency_keys" ON public.idempotency_keys;
CREATE POLICY "Allow authenticated users to manage idempotency_keys" 
  ON public.idempotency_keys 
  FOR ALL 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

-- Restore original email_logs policy
DROP POLICY IF EXISTS "Allow authenticated users to manage email_logs" ON public.email_logs;
CREATE POLICY "Allow authenticated users to manage email_logs" 
  ON public.email_logs 
  FOR ALL 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

-- Restore original user_integrations policy
DROP POLICY IF EXISTS "Allow authenticated users to manage user_integrations" ON public.user_integrations;
CREATE POLICY "Allow authenticated users to manage user_integrations" 
  ON public.user_integrations 
  FOR ALL 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

-- Restore original user_settings policy
DROP POLICY IF EXISTS "Allow authenticated users to manage user_settings" ON public.user_settings;
CREATE POLICY "Allow authenticated users to manage user_settings" 
  ON public.user_settings 
  FOR ALL 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

-- Restore original events policy
DROP POLICY IF EXISTS "Allow authenticated users to manage events" ON public.events;
CREATE POLICY "Allow authenticated users to manage events" 
  ON public.events 
  FOR ALL 
  USING (auth.role() = 'authenticated') 
  WITH CHECK (auth.role() = 'authenticated');

-- Restore original tasks policies
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
CREATE POLICY "Users can view their own tasks" 
  ON public.tasks 
  FOR SELECT 
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
CREATE POLICY "Users can insert their own tasks" 
  ON public.tasks 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
CREATE POLICY "Users can update their own tasks" 
  ON public.tasks 
  FOR UPDATE 
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
CREATE POLICY "Users can delete their own tasks" 
  ON public.tasks 
  FOR DELETE 
  USING (user_id = auth.uid());

-- Continue for all other tables... (truncated for brevity)
```

---

## Rollback: Migration 002 (Function search_path)

**⚠️ WARNING:** Removing SECURITY DEFINER and search_path re-introduces security vulnerability.

```sql
-- =========================================
-- ROLLBACK: 20250111000002_fix_function_search_path
-- =========================================

-- Restore original set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Restore original line_item_parent_exists
CREATE OR REPLACE FUNCTION public.line_item_parent_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- Restore original next_doc_number
CREATE OR REPLACE FUNCTION public.next_doc_number(
  p_doc_type TEXT,
  p_prefix TEXT,
  p_year_infix BOOLEAN,
  p_pad INT
)
RETURNS TEXT
LANGUAGE plpgsql
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

-- Continue for all other functions...
```

---

## Rollback: Migration 001 (RLS Enablement)

**⚠️ CRITICAL WARNING:** This re-introduces the security vulnerability!

```sql
-- =========================================
-- ROLLBACK: 20250111000001_fix_critical_missing_rls
-- =========================================

-- Drop all policies first
DROP POLICY IF EXISTS "Allow authenticated users to view pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Allow authenticated users to manage pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Allow authenticated users to view stages" ON public.stages;
DROP POLICY IF EXISTS "Allow authenticated users to manage stages" ON public.stages;
DROP POLICY IF EXISTS "Allow authenticated users to manage deal_integrations" ON public.deal_integrations;
DROP POLICY IF EXISTS "Allow authenticated users to view stage_probabilities" ON public.stage_probabilities;
DROP POLICY IF EXISTS "Allow authenticated users to manage stage_probabilities" ON public.stage_probabilities;
DROP POLICY IF EXISTS "Allow authenticated users to view numbering_counters" ON public.numbering_counters;
DROP POLICY IF EXISTS "Allow authenticated users to manage numbering_counters" ON public.numbering_counters;

-- Disable RLS
ALTER TABLE public.pipelines DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_probabilities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.numbering_counters DISABLE ROW LEVEL SECURITY;
```

---

## Post-Rollback Verification

After rollback, verify the database is in the expected state:

```sql
-- Verify tables state
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check application functionality
-- (Manual testing required)
```

## Re-Deployment After Rollback

If you need to re-deploy after fixing issues:

1. Identify root cause of the rollback
2. Fix the problematic migration
3. Test in development/staging
4. Follow deployment guide again

---

**Rollback Date:** _____________  
**Rolled Back By:** _____________  
**Reason:** _____________  
**Notes:** _____________

