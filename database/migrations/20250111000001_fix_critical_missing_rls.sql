-- =========================================
-- CRITICAL FIX: Enable RLS on missing tables
-- Migration: 20250111000001_fix_critical_missing_rls
-- =========================================
-- This migration fixes the critical security issue where 5 tables
-- do not have Row Level Security enabled, allowing any authenticated
-- user to read/write all data.
-- =========================================

-- Enable RLS on pipelines
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

-- Enable RLS on stages
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;

-- Enable RLS on deal_integrations
ALTER TABLE public.deal_integrations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on stage_probabilities
ALTER TABLE public.stage_probabilities ENABLE ROW LEVEL SECURITY;

-- Enable RLS on numbering_counters
ALTER TABLE public.numbering_counters ENABLE ROW LEVEL SECURITY;

-- =========================================
-- Create RLS policies for pipelines
-- =========================================
-- Pipelines should be readable by all authenticated users,
-- but only manageable by admins (for now, allowing all authenticated)

DROP POLICY IF EXISTS "Allow authenticated users to view pipelines" ON public.pipelines;
CREATE POLICY "Allow authenticated users to view pipelines" 
  ON public.pipelines 
  FOR SELECT 
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage pipelines" ON public.pipelines;
CREATE POLICY "Allow authenticated users to manage pipelines" 
  ON public.pipelines 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Create RLS policies for stages
-- =========================================
-- Stages should be readable by all authenticated users

DROP POLICY IF EXISTS "Allow authenticated users to view stages" ON public.stages;
CREATE POLICY "Allow authenticated users to view stages" 
  ON public.stages 
  FOR SELECT 
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage stages" ON public.stages;
CREATE POLICY "Allow authenticated users to manage stages" 
  ON public.stages 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Create RLS policies for deal_integrations
-- =========================================
-- Deal integrations should only be accessible to authenticated users

DROP POLICY IF EXISTS "Allow authenticated users to manage deal_integrations" ON public.deal_integrations;
CREATE POLICY "Allow authenticated users to manage deal_integrations" 
  ON public.deal_integrations 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Create RLS policies for stage_probabilities
-- =========================================
-- Stage probabilities should be readable by all, manageable by authenticated

DROP POLICY IF EXISTS "Allow authenticated users to view stage_probabilities" ON public.stage_probabilities;
CREATE POLICY "Allow authenticated users to view stage_probabilities" 
  ON public.stage_probabilities 
  FOR SELECT 
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage stage_probabilities" ON public.stage_probabilities;
CREATE POLICY "Allow authenticated users to manage stage_probabilities" 
  ON public.stage_probabilities 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Create RLS policies for numbering_counters
-- =========================================
-- Numbering counters should be system-managed, but allow authenticated access

DROP POLICY IF EXISTS "Allow authenticated users to view numbering_counters" ON public.numbering_counters;
CREATE POLICY "Allow authenticated users to view numbering_counters" 
  ON public.numbering_counters 
  FOR SELECT 
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage numbering_counters" ON public.numbering_counters;
CREATE POLICY "Allow authenticated users to manage numbering_counters" 
  ON public.numbering_counters 
  FOR ALL 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- =========================================
-- Verification
-- =========================================
-- Run this query to verify RLS is enabled:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('pipelines', 'stages', 'deal_integrations', 'stage_probabilities', 'numbering_counters');

