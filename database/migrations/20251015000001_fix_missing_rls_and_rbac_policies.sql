-- =========================================
-- Fix Missing RLS + RBAC Policies
-- Migration: 20251015000001_fix_missing_rls_and_rbac_policies
-- =========================================
-- This migration fixes missing RLS on 3 tables and updates
-- all RLS policies to use role-based access control
-- =========================================

-- =========================================
-- 1. Enable RLS on missing tables
-- =========================================

-- company_tags
ALTER TABLE public.company_tags ENABLE ROW LEVEL SECURITY;

-- company_tag_assignments  
ALTER TABLE public.company_tag_assignments ENABLE ROW LEVEL SECURITY;

-- company_notes
ALTER TABLE public.company_notes ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 2. RLS Policies for company_tags
-- =========================================

-- All can view tags
DROP POLICY IF EXISTS "All can view company tags" ON public.company_tags;
CREATE POLICY "All can view company tags"
  ON public.company_tags FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- Sales and above can create tags
DROP POLICY IF EXISTS "Sales and above can create tags" ON public.company_tags;
CREATE POLICY "Sales and above can create tags"
  ON public.company_tags FOR INSERT
  WITH CHECK (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]));

-- Sales and above can update tags
DROP POLICY IF EXISTS "Sales and above can update tags" ON public.company_tags;
CREATE POLICY "Sales and above can update tags"
  ON public.company_tags FOR UPDATE
  USING (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]))
  WITH CHECK (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]));

-- Admins and managers can delete tags
DROP POLICY IF EXISTS "Admins and managers can delete tags" ON public.company_tags;
CREATE POLICY "Admins and managers can delete tags"
  ON public.company_tags FOR DELETE
  USING (public.user_has_role(ARRAY['admin', 'manager']::user_role[]));

-- =========================================
-- 3. RLS Policies for company_tag_assignments
-- =========================================

-- All can view tag assignments
DROP POLICY IF EXISTS "All can view tag assignments" ON public.company_tag_assignments;
CREATE POLICY "All can view tag assignments"
  ON public.company_tag_assignments FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- Sales and above can create tag assignments
DROP POLICY IF EXISTS "Sales and above can assign tags" ON public.company_tag_assignments;
CREATE POLICY "Sales and above can assign tags"
  ON public.company_tag_assignments FOR INSERT
  WITH CHECK (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]));

-- Sales and above can delete tag assignments
DROP POLICY IF EXISTS "Sales and above can remove tags" ON public.company_tag_assignments;
CREATE POLICY "Sales and above can remove tags"
  ON public.company_tag_assignments FOR DELETE
  USING (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]));

-- =========================================
-- 4. RLS Policies for company_notes
-- =========================================

-- All can view notes
DROP POLICY IF EXISTS "All can view company notes" ON public.company_notes;
CREATE POLICY "All can view company notes"
  ON public.company_notes FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- Sales and above can create notes
DROP POLICY IF EXISTS "Sales and above can create notes" ON public.company_notes;
CREATE POLICY "Sales and above can create notes"
  ON public.company_notes FOR INSERT
  WITH CHECK (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]));

-- Users can update own notes, admins/managers can update all
DROP POLICY IF EXISTS "Update notes based on role" ON public.company_notes;
CREATE POLICY "Update notes based on role"
  ON public.company_notes FOR UPDATE
  USING (
    public.user_has_role(ARRAY['admin', 'manager']::user_role[])
    OR user_id = auth.uid()
  )
  WITH CHECK (
    public.user_has_role(ARRAY['admin', 'manager']::user_role[])
    OR user_id = auth.uid()
  );

-- Users can delete own notes, admins/managers can delete all
DROP POLICY IF EXISTS "Delete notes based on role" ON public.company_notes;
CREATE POLICY "Delete notes based on role"
  ON public.company_notes FOR DELETE
  USING (
    public.user_has_role(ARRAY['admin', 'manager']::user_role[])
    OR user_id = auth.uid()
  );

-- =========================================
-- 5. Update companies policies
-- =========================================

DROP POLICY IF EXISTS "Allow authenticated users to manage companies" ON public.companies;
DROP POLICY IF EXISTS "All authenticated can view companies" ON public.companies;
DROP POLICY IF EXISTS "Sales and above can create companies" ON public.companies;
DROP POLICY IF EXISTS "Sales and above can update companies" ON public.companies;
DROP POLICY IF EXISTS "Admins and managers can delete companies" ON public.companies;

-- View: All can view
CREATE POLICY "All can view companies"
  ON public.companies FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- Create: Sales and above
CREATE POLICY "Sales and above can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]));

-- Update: Sales and above
CREATE POLICY "Sales and above can update companies"
  ON public.companies FOR UPDATE
  USING (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]))
  WITH CHECK (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]));

-- Delete: Admins and managers only
CREATE POLICY "Admins and managers can delete companies"
  ON public.companies FOR DELETE
  USING (public.user_has_role(ARRAY['admin', 'manager']::user_role[]));

-- =========================================
-- 6. Update deals policies
-- =========================================

DROP POLICY IF EXISTS "Allow authenticated users to manage deals" ON public.deals;
DROP POLICY IF EXISTS "View deals based on role" ON public.deals;
DROP POLICY IF EXISTS "Sales and above can create deals" ON public.deals;
DROP POLICY IF EXISTS "Update deals based on role" ON public.deals;
DROP POLICY IF EXISTS "Admins and managers can delete deals" ON public.deals;

-- View: Admins/managers/support/viewers see all, sales see own
CREATE POLICY "View deals based on role"
  ON public.deals FOR SELECT
  USING (
    public.user_has_role(ARRAY['admin', 'manager', 'support', 'viewer']::user_role[])
    OR (
      public.current_user_role() = 'sales' 
      AND owner_user_id = auth.uid()
    )
  );

-- Create: Sales and above
CREATE POLICY "Sales and above can create deals"
  ON public.deals FOR INSERT
  WITH CHECK (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]));

-- Update: Admins/managers can update all, sales can update own
CREATE POLICY "Update deals based on role"
  ON public.deals FOR UPDATE
  USING (
    public.user_has_role(ARRAY['admin', 'manager']::user_role[])
    OR (
      public.current_user_role() = 'sales' 
      AND owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.user_has_role(ARRAY['admin', 'manager']::user_role[])
    OR (
      public.current_user_role() = 'sales' 
      AND owner_user_id = auth.uid()
    )
  );

-- Delete: Admins and managers only
CREATE POLICY "Admins and managers can delete deals"
  ON public.deals FOR DELETE
  USING (public.user_has_role(ARRAY['admin', 'manager']::user_role[]));

-- =========================================
-- 7. Update quotes policies
-- =========================================

DROP POLICY IF EXISTS "Allow authenticated users to manage quotes" ON public.quotes;

CREATE POLICY "All can view quotes"
  ON public.quotes FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "Sales and above can create quotes"
  ON public.quotes FOR INSERT
  WITH CHECK (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]));

CREATE POLICY "Sales and above can update quotes"
  ON public.quotes FOR UPDATE
  USING (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]))
  WITH CHECK (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]));

CREATE POLICY "Admins and managers can delete quotes"
  ON public.quotes FOR DELETE
  USING (public.user_has_role(ARRAY['admin', 'manager']::user_role[]));

-- =========================================
-- 8. Update orders policies
-- =========================================

DROP POLICY IF EXISTS "Allow authenticated users to manage orders" ON public.orders;

CREATE POLICY "All can view orders"
  ON public.orders FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "Sales and above can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]));

CREATE POLICY "Sales and above can update orders"
  ON public.orders FOR UPDATE
  USING (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]))
  WITH CHECK (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]));

CREATE POLICY "Admins and managers can delete orders"
  ON public.orders FOR DELETE
  USING (public.user_has_role(ARRAY['admin', 'manager']::user_role[]));

-- =========================================
-- 9. Update invoices policies
-- =========================================

DROP POLICY IF EXISTS "Allow authenticated users to manage invoices" ON public.invoices;

CREATE POLICY "All can view invoices"
  ON public.invoices FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "Sales and above can create invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]));

CREATE POLICY "Sales and above can update invoices"
  ON public.invoices FOR UPDATE
  USING (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]))
  WITH CHECK (public.user_has_role(ARRAY['admin', 'manager', 'sales']::user_role[]));

CREATE POLICY "Admins and managers can delete invoices"
  ON public.invoices FOR DELETE
  USING (public.user_has_role(ARRAY['admin', 'manager']::user_role[]));

-- =========================================
-- 10. Update tasks policies
-- =========================================

DROP POLICY IF EXISTS "Allow authenticated users to manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "View tasks based on role" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Update tasks based on role" ON public.tasks;
DROP POLICY IF EXISTS "Delete tasks based on role" ON public.tasks;

-- View: Admins/managers/viewers see all, others see assigned tasks
CREATE POLICY "View tasks based on role"
  ON public.tasks FOR SELECT
  USING (
    public.user_has_role(ARRAY['admin', 'manager', 'viewer']::user_role[])
    OR user_id = auth.uid()
    OR assigned_to = auth.uid()
  );

-- Create: All except viewers
CREATE POLICY "All except viewers can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (public.user_has_role(ARRAY['admin', 'manager', 'sales', 'support']::user_role[]));

-- Update: Admins/managers can update all, others can update own/assigned
CREATE POLICY "Update tasks based on role"
  ON public.tasks FOR UPDATE
  USING (
    public.user_has_role(ARRAY['admin', 'manager']::user_role[])
    OR user_id = auth.uid()
    OR assigned_to = auth.uid()
  );

-- Delete: Admins/managers can delete all, others can delete own
CREATE POLICY "Delete tasks based on role"
  ON public.tasks FOR DELETE
  USING (
    public.user_has_role(ARRAY['admin', 'manager']::user_role[])
    OR user_id = auth.uid()
  );

-- =========================================
-- 11. Update workspace_settings policies
-- =========================================

DROP POLICY IF EXISTS "Allow authenticated users to manage workspace_settings" ON public.workspace_settings;

-- View: All can view
CREATE POLICY "All can view workspace settings"
  ON public.workspace_settings FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- Update: Only admins
CREATE POLICY "Only admins can update workspace settings"
  ON public.workspace_settings FOR UPDATE
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- =========================================
-- 12. Update pipelines policies
-- =========================================

DROP POLICY IF EXISTS "Allow authenticated users to view pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Allow authenticated users to manage pipelines" ON public.pipelines;

-- View: All can view
CREATE POLICY "All can view pipelines"
  ON public.pipelines FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- Manage: Admins and managers only
CREATE POLICY "Admins and managers can manage pipelines"
  ON public.pipelines FOR ALL
  USING (public.user_has_role(ARRAY['admin', 'manager']::user_role[]))
  WITH CHECK (public.user_has_role(ARRAY['admin', 'manager']::user_role[]));

-- =========================================
-- 13. Update stages policies
-- =========================================

DROP POLICY IF EXISTS "Allow authenticated users to view stages" ON public.stages;
DROP POLICY IF EXISTS "Allow authenticated users to manage stages" ON public.stages;

-- View: All can view
CREATE POLICY "All can view stages"
  ON public.stages FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- Manage: Admins and managers only
CREATE POLICY "Admins and managers can manage stages"
  ON public.stages FOR ALL
  USING (public.user_has_role(ARRAY['admin', 'manager']::user_role[]))
  WITH CHECK (public.user_has_role(ARRAY['admin', 'manager']::user_role[]));

-- =========================================
-- 14. Update stage_probabilities policies
-- =========================================

DROP POLICY IF EXISTS "Allow authenticated users to view stage_probabilities" ON public.stage_probabilities;
DROP POLICY IF EXISTS "Allow authenticated users to manage stage_probabilities" ON public.stage_probabilities;

-- View: All can view
CREATE POLICY "All can view stage probabilities"
  ON public.stage_probabilities FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- Manage: Admins and managers only
CREATE POLICY "Admins and managers can manage stage probabilities"
  ON public.stage_probabilities FOR ALL
  USING (public.user_has_role(ARRAY['admin', 'manager']::user_role[]))
  WITH CHECK (public.user_has_role(ARRAY['admin', 'manager']::user_role[]));

-- =========================================
-- Verification
-- =========================================
-- Run these queries to verify:

-- Check RLS is enabled on all tables:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('company_tags', 'company_tag_assignments', 'company_notes')
-- ORDER BY tablename;

-- Check all policies:
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;



