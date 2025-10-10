-- =========================================
-- OPTIONAL: Cleanup Unused Indexes
-- =========================================
-- ⚠️ WARNING: Only run this after 2+ weeks of monitoring!
-- ⚠️ Test in staging first!
-- ⚠️ Have rollback script ready!
-- =========================================
-- This script drops indexes that have never been used
-- after sufficient monitoring period.
-- =========================================

-- Step 1: Analyze current usage (RUN THIS FIRST!)
-- =========================================
SELECT 
  indexrelname AS index_name,
  relname AS table_name,
  idx_scan AS scans,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size,
  pg_get_indexdef(indexrelid) AS definition
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND idx_scan = 0
AND indexrelname NOT LIKE '%_pkey'
AND indexrelname NOT LIKE '%_key'  -- Keep unique constraints
ORDER BY pg_relation_size(indexrelid) DESC;

-- Step 2: Drop indexes in categories
-- =========================================

-- Category A: Redundant Search Indexes (if no search feature exists)
-- =========================================
-- DROP INDEX IF EXISTS public.idx_companies_name;         -- lower(name) search
-- DROP INDEX IF EXISTS public.idx_companies_domain;       -- lower(domain) search
-- DROP INDEX IF EXISTS public.idx_people_name;            -- lower(first_name, last_name) search
-- DROP INDEX IF EXISTS public.idx_deals_title;            -- lower(title) search

-- Category B: Unused Updated_At Indexes (if not sorting by updated_at)
-- =========================================
-- DROP INDEX IF EXISTS public.idx_companies_updated_at;
-- DROP INDEX IF EXISTS public.idx_people_updated_at;
-- DROP INDEX IF EXISTS public.idx_deals_updated_at;
-- DROP INDEX IF EXISTS public.idx_quotes_updated_at;
-- DROP INDEX IF EXISTS public.idx_orders_updated_at;
-- DROP INDEX IF EXISTS public.idx_invoices_updated_at;

-- Category C: Over-Specific Partial Indexes
-- =========================================
-- DROP INDEX IF EXISTS public.idx_companies_activity_status;  -- Too specific
-- DROP INDEX IF EXISTS public.idx_companies_do_not_call;      -- Partial index, rarely used
-- DROP INDEX IF EXISTS public.idx_call_lists_shared;          -- Partial index, rarely used

-- Category D: Potentially Unused Relationship Indexes
-- =========================================
-- Only drop these if verified unused in queries!
-- DROP INDEX IF EXISTS public.idx_quotes_deal;
-- DROP INDEX IF EXISTS public.idx_quotes_company;
-- DROP INDEX IF EXISTS public.idx_orders_deal;
-- DROP INDEX IF EXISTS public.idx_orders_company;
-- DROP INDEX IF EXISTS public.idx_invoices_deal;
-- DROP INDEX IF EXISTS public.idx_invoices_company;
-- DROP INDEX IF EXISTS public.idx_documents_deal;
-- DROP INDEX IF EXISTS public.idx_documents_company;
-- DROP INDEX IF EXISTS public.idx_documents_person;
-- DROP INDEX IF EXISTS public.idx_activities_deal;

-- Category E: Email/Integration Indexes (if features not used)
-- =========================================
-- DROP INDEX IF EXISTS public.idx_email_logs_user_id;
-- DROP INDEX IF EXISTS public.idx_email_logs_related_type_related_id;
-- DROP INDEX IF EXISTS public.idx_email_logs_created_at;
-- DROP INDEX IF EXISTS public.idx_user_integrations_user_id;
-- DROP INDEX IF EXISTS public.idx_user_integrations_provider_kind;

-- Category F: Event Indexes (if calendar not heavily used)
-- =========================================
-- DROP INDEX IF EXISTS public.idx_events_user_id;
-- DROP INDEX IF EXISTS public.idx_events_deal_id;
-- DROP INDEX IF EXISTS public.idx_events_company_id;
-- DROP INDEX IF EXISTS public.idx_events_contact_id;
-- DROP INDEX IF EXISTS public.idx_events_start_time;
-- DROP INDEX IF EXISTS public.idx_events_google_event_id;

-- Category G: Task Indexes (if tasks feature not used)
-- =========================================
-- DROP INDEX IF EXISTS public.idx_tasks_user_id;
-- DROP INDEX IF EXISTS public.idx_tasks_status;
-- DROP INDEX IF EXISTS public.idx_tasks_assigned_to;
-- DROP INDEX IF EXISTS public.idx_tasks_related;
-- DROP INDEX IF EXISTS public.idx_tasks_created_at;
-- DROP INDEX IF EXISTS public.idx_tasks_due_date;
-- DROP INDEX IF EXISTS public.idx_task_activities_task;
-- DROP INDEX IF EXISTS public.idx_task_activities_user;
-- DROP INDEX IF EXISTS public.idx_task_comments_task;
-- DROP INDEX IF EXISTS public.idx_task_comments_user;

-- Category H: Call List Indexes (if feature not used)
-- =========================================
-- DROP INDEX IF EXISTS public.idx_call_lists_owner;
-- DROP INDEX IF EXISTS public.idx_call_list_items_list;
-- DROP INDEX IF EXISTS public.idx_call_list_items_company;
-- DROP INDEX IF EXISTS public.idx_call_list_items_status;
-- DROP INDEX IF EXISTS public.idx_activity_log_company;
-- DROP INDEX IF EXISTS public.idx_activity_log_user;
-- DROP INDEX IF EXISTS public.idx_activity_log_type;

-- =========================================
-- Step 3: Verify Impact
-- =========================================
-- After dropping indexes, monitor query performance for 24 hours
-- Run EXPLAIN ANALYZE on critical queries to ensure no performance degradation

-- Check slow queries:
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- queries taking > 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;

-- =========================================
-- Rollback Script (Keep This Handy!)
-- =========================================
-- If you need to restore an index, use the definition from step 1

-- Example rollback:
-- CREATE INDEX idx_deals_company ON public.deals USING btree (company_id);

-- =========================================
-- Estimated Space Savings
-- =========================================
-- Dropping ~60 unused indexes could save:
-- - Disk space: ~500-600 KB
-- - Write performance: 5-10% improvement on INSERTs/UPDATEs
-- - Maintenance overhead: Reduced vacuum/analyze time

-- =========================================
-- Safety Checklist Before Running:
-- =========================================
-- [ ] Monitored indexes for 2+ weeks
-- [ ] Verified application doesn't use these indexes
-- [ ] Tested in staging environment
-- [ ] Database backup created
-- [ ] Rollback script prepared
-- [ ] Team notified of maintenance window
-- [ ] Query performance baseline captured

