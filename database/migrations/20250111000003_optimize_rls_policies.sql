-- =========================================
-- HIGH PRIORITY: Optimize RLS policies for performance
-- Migration: 20250111000003_optimize_rls_policies
-- =========================================
-- This migration wraps auth.role() and auth.uid() calls in SELECT
-- to prevent re-evaluation for each row, improving query performance.
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- =========================================

-- =========================================
-- Optimize: people
-- =========================================
DROP POLICY IF EXISTS "Allow authenticated users to manage people" ON public.people;
CREATE POLICY "Allow authenticated users to manage people" 
  ON public.people 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Optimize: companies
-- =========================================
DROP POLICY IF EXISTS "Allow authenticated users to manage companies" ON public.companies;
CREATE POLICY "Allow authenticated users to manage companies" 
  ON public.companies 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Optimize: deals
-- =========================================
DROP POLICY IF EXISTS "Allow authenticated users to manage deals" ON public.deals;
CREATE POLICY "Allow authenticated users to manage deals" 
  ON public.deals 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Optimize: quotes
-- =========================================
DROP POLICY IF EXISTS "Allow authenticated users to manage quotes" ON public.quotes;
CREATE POLICY "Allow authenticated users to manage quotes" 
  ON public.quotes 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Optimize: orders
-- =========================================
DROP POLICY IF EXISTS "Allow authenticated users to manage orders" ON public.orders;
CREATE POLICY "Allow authenticated users to manage orders" 
  ON public.orders 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Optimize: invoices
-- =========================================
DROP POLICY IF EXISTS "Allow authenticated users to manage invoices" ON public.invoices;
CREATE POLICY "Allow authenticated users to manage invoices" 
  ON public.invoices 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Optimize: line_items
-- =========================================
DROP POLICY IF EXISTS "Allow authenticated users to manage line_items" ON public.line_items;
CREATE POLICY "Allow authenticated users to manage line_items" 
  ON public.line_items 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Optimize: payments
-- =========================================
DROP POLICY IF EXISTS "Allow authenticated users to manage payments" ON public.payments;
CREATE POLICY "Allow authenticated users to manage payments" 
  ON public.payments 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Optimize: activities
-- =========================================
DROP POLICY IF EXISTS "Allow authenticated users to manage activities" ON public.activities;
CREATE POLICY "Allow authenticated users to manage activities" 
  ON public.activities 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Optimize: documents
-- =========================================
DROP POLICY IF EXISTS "Allow authenticated users to manage documents" ON public.documents;
CREATE POLICY "Allow authenticated users to manage documents" 
  ON public.documents 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Optimize: workspace_settings
-- =========================================
DROP POLICY IF EXISTS "Allow authenticated users to manage workspace_settings" ON public.workspace_settings;
CREATE POLICY "Allow authenticated users to manage workspace_settings" 
  ON public.workspace_settings 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Optimize: idempotency_keys
-- =========================================
DROP POLICY IF EXISTS "Allow authenticated users to manage idempotency_keys" ON public.idempotency_keys;
CREATE POLICY "Allow authenticated users to manage idempotency_keys" 
  ON public.idempotency_keys 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Optimize: email_logs
-- =========================================
DROP POLICY IF EXISTS "Allow authenticated users to manage email_logs" ON public.email_logs;
CREATE POLICY "Allow authenticated users to manage email_logs" 
  ON public.email_logs 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Optimize: user_integrations
-- =========================================
DROP POLICY IF EXISTS "Allow authenticated users to manage user_integrations" ON public.user_integrations;
CREATE POLICY "Allow authenticated users to manage user_integrations" 
  ON public.user_integrations 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Optimize: user_settings
-- =========================================
DROP POLICY IF EXISTS "Allow authenticated users to manage user_settings" ON public.user_settings;
CREATE POLICY "Allow authenticated users to manage user_settings" 
  ON public.user_settings 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Optimize: events
-- =========================================
DROP POLICY IF EXISTS "Allow authenticated users to manage events" ON public.events;
CREATE POLICY "Allow authenticated users to manage events" 
  ON public.events 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Optimize: tasks (multiple policies)
-- =========================================
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
CREATE POLICY "Users can view their own tasks" 
  ON public.tasks 
  FOR SELECT 
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
CREATE POLICY "Users can insert their own tasks" 
  ON public.tasks 
  FOR INSERT 
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
CREATE POLICY "Users can update their own tasks" 
  ON public.tasks 
  FOR UPDATE 
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
CREATE POLICY "Users can delete their own tasks" 
  ON public.tasks 
  FOR DELETE 
  USING (user_id = (SELECT auth.uid()));

-- =========================================
-- Optimize: task_comments (multiple policies)
-- =========================================
DROP POLICY IF EXISTS "Users can view task comments for their own tasks" ON public.task_comments;
CREATE POLICY "Users can view task comments for their own tasks" 
  ON public.task_comments 
  FOR SELECT 
  USING (
    task_id IN (
      SELECT id FROM public.tasks 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert task comments for their own tasks" ON public.task_comments;
CREATE POLICY "Users can insert task comments for their own tasks" 
  ON public.task_comments 
  FOR INSERT 
  WITH CHECK (
    task_id IN (
      SELECT id FROM public.tasks 
      WHERE user_id = (SELECT auth.uid())
    ) AND user_id = (SELECT auth.uid())
  );

-- =========================================
-- Optimize: task_activities (multiple policies)
-- =========================================
DROP POLICY IF EXISTS "Users can view task activities for their own tasks" ON public.task_activities;
CREATE POLICY "Users can view task activities for their own tasks" 
  ON public.task_activities 
  FOR SELECT 
  USING (
    task_id IN (
      SELECT id FROM public.tasks 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert task activities for their own tasks" ON public.task_activities;
CREATE POLICY "Users can insert task activities for their own tasks" 
  ON public.task_activities 
  FOR INSERT 
  WITH CHECK (
    task_id IN (
      SELECT id FROM public.tasks 
      WHERE user_id = (SELECT auth.uid())
    ) AND user_id = (SELECT auth.uid())
  );

-- =========================================
-- Optimize: activity_log (multiple policies)
-- =========================================
DROP POLICY IF EXISTS "Users can view all activity logs" ON public.activity_log;
CREATE POLICY "Users can view all activity logs" 
  ON public.activity_log 
  FOR SELECT 
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Users can insert activity logs" ON public.activity_log;
CREATE POLICY "Users can insert activity logs" 
  ON public.activity_log 
  FOR INSERT 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Optimize: call_lists (multiple policies)
-- =========================================
DROP POLICY IF EXISTS "Users can view their own and shared call lists" ON public.call_lists;
CREATE POLICY "Users can view their own and shared call lists" 
  ON public.call_lists 
  FOR SELECT 
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Users can insert their own call lists" ON public.call_lists;
CREATE POLICY "Users can insert their own call lists" 
  ON public.call_lists 
  FOR INSERT 
  WITH CHECK ((SELECT auth.role()) = 'authenticated' AND owner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own call lists" ON public.call_lists;
CREATE POLICY "Users can update their own call lists" 
  ON public.call_lists 
  FOR UPDATE 
  USING (owner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own call lists" ON public.call_lists;
CREATE POLICY "Users can delete their own call lists" 
  ON public.call_lists 
  FOR DELETE 
  USING (owner_user_id = (SELECT auth.uid()));

-- =========================================
-- Optimize: call_list_items
-- =========================================
DROP POLICY IF EXISTS "Users can view call list items" ON public.call_list_items;
CREATE POLICY "Users can view call list items" 
  ON public.call_list_items 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Performance verification
-- =========================================
-- After applying this migration, run EXPLAIN ANALYZE on your queries
-- to verify that auth functions are no longer being re-evaluated per row.
-- Look for "InitPlan" in the query plan instead of repeated function calls.

