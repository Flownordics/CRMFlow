-- =========================================
-- HIGH PRIORITY: Add missing indexes on foreign keys
-- Migration: 20250111000004_add_missing_indexes
-- =========================================
-- This migration adds indexes on foreign key columns that are
-- currently missing, which will significantly improve JOIN performance.
-- =========================================

-- =========================================
-- Add index on deals.contact_id
-- =========================================
-- Improves performance when joining deals with people (contacts)
CREATE INDEX IF NOT EXISTS idx_deals_contact 
  ON public.deals (contact_id) 
  WHERE contact_id IS NOT NULL;

-- =========================================
-- Add index on quotes.contact_id
-- =========================================
-- Improves performance when joining quotes with people (contacts)
CREATE INDEX IF NOT EXISTS idx_quotes_contact 
  ON public.quotes (contact_id) 
  WHERE contact_id IS NOT NULL;

-- =========================================
-- Add index on orders.contact_id
-- =========================================
-- Improves performance when joining orders with people (contacts)
CREATE INDEX IF NOT EXISTS idx_orders_contact 
  ON public.orders (contact_id) 
  WHERE contact_id IS NOT NULL;

-- =========================================
-- Add index on invoices.contact_id
-- =========================================
-- Improves performance when joining invoices with people (contacts)
CREATE INDEX IF NOT EXISTS idx_invoices_contact 
  ON public.invoices (contact_id) 
  WHERE contact_id IS NOT NULL;

-- =========================================
-- Add index on task_activities.task_id
-- =========================================
-- Improves performance when loading task timeline/history
CREATE INDEX IF NOT EXISTS idx_task_activities_task 
  ON public.task_activities (task_id, created_at DESC);

-- =========================================
-- Add index on task_activities.user_id
-- =========================================
-- Improves performance when finding activities by user
CREATE INDEX IF NOT EXISTS idx_task_activities_user 
  ON public.task_activities (user_id, created_at DESC);

-- =========================================
-- Add index on task_comments.task_id
-- =========================================
-- Improves performance when loading task comments
CREATE INDEX IF NOT EXISTS idx_task_comments_task 
  ON public.task_comments (task_id, created_at DESC);

-- =========================================
-- Add index on task_comments.user_id
-- =========================================
-- Improves performance when finding comments by user
CREATE INDEX IF NOT EXISTS idx_task_comments_user 
  ON public.task_comments (user_id, created_at DESC);

-- =========================================
-- Add index on tasks.assigned_by
-- =========================================
-- Improves performance when tracking who assigned tasks
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by 
  ON public.tasks (assigned_by) 
  WHERE assigned_by IS NOT NULL;

-- =========================================
-- Verification
-- =========================================
-- Run this query to verify indexes were created:
-- SELECT 
--   tablename, 
--   indexname, 
--   indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND indexname IN (
--   'idx_deals_contact',
--   'idx_quotes_contact', 
--   'idx_orders_contact',
--   'idx_invoices_contact',
--   'idx_task_activities_task',
--   'idx_task_activities_user',
--   'idx_task_comments_task',
--   'idx_task_comments_user',
--   'idx_tasks_assigned_by'
-- )
-- ORDER BY tablename, indexname;

