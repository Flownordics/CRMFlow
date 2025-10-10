# Database Cleanup Tasks - Low Priority

## Overview
These are non-critical improvements identified in the audit. Implement after verifying the critical fixes are stable.

---

## 1. 🗂️ Unused Index Cleanup

### Summary
**90 indexes are currently showing 0 scans** - but this includes:
- ✅ **9 indexes we just added** (give them 1 week to be used)
- ⚠️ **~15-20 system/unique indexes** (never show usage but are needed)
- 🔴 **~60-70 potentially unused indexes** (safe to consider dropping)

### Strategy

#### Phase 1: Wait & Monitor (1 Week)
**DO NOT DROP ANY INDEXES YET!**

1. Let the new indexes (added today) get used
2. Monitor application usage patterns
3. Run usage check again after 1 week

#### Phase 2: Categorize (After 1 Week)
Run the analysis script to categorize indexes:
- **Keep:** New indexes, unique constraints, heavily used
- **Monitor:** Rarely used (< 10 scans/week)
- **Consider Dropping:** Never used after 2 weeks

#### Phase 3: Safe Cleanup (After 2 Weeks)
Drop indexes that are confirmed unused.

### New Indexes to Monitor (Added Today)
These should START being used within 1 week:

```sql
-- Monitor these - should see usage increase
SELECT 
  indexrelname,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes
WHERE indexrelname IN (
  'idx_deals_contact',
  'idx_quotes_contact',
  'idx_orders_contact',
  'idx_invoices_contact',
  'idx_task_activities_task',
  'idx_task_activities_user',
  'idx_task_comments_task',
  'idx_task_comments_user',
  'idx_tasks_assigned_by'
);
```

### Indexes Likely Safe to Drop (After Verification)

These have never been used and are likely redundant:

#### Category A: Duplicate or Redundant (Highest Priority)
```sql
-- idx_people_company duplicates foreign key
-- uidx_line_items_parent_position duplicates idx_line_items_parent
-- Multiple updated_at indexes if you don't sort by updated_at
```

#### Category B: Over-Optimized
```sql
-- idx_companies_activity_status - too specific, rarely queried
-- idx_companies_do_not_call - only useful if many companies have this flag
-- idx_call_lists_shared - partial index, likely rarely used
```

#### Category C: Premature Optimization
```sql
-- idx_deals_title - lower(title) search, but is there a search feature?
-- idx_people_name - lower(name) search, but is there a search feature?
-- idx_companies_name - lower(name) search, but is there a search feature?
-- idx_companies_domain - lower(domain) search, rarely needed
```

### Analysis Script (Run After 2 Weeks)

See: `database/migrations/OPTIONAL_cleanup_unused_indexes.sql`

---

## 2. 🗑️ Soft Delete Implementation

### Problem
Currently all deletes are permanent. If you accidentally delete a deal, company, or invoice, it's gone forever.

### Solution: Soft Deletes
Add `deleted_at` column and filter deleted records in queries.

### Tables to Implement Soft Deletes

**High Priority:**
- ✅ `deals` - Critical business data
- ✅ `companies` - Hard to recover
- ✅ `people` - Contact data
- ✅ `quotes` - Financial documents
- ✅ `orders` - Financial documents
- ✅ `invoices` - Financial documents

**Medium Priority:**
- `documents` - Can be re-uploaded
- `activities` - Timeline data
- `tasks` - Task history

**Low Priority / Skip:**
- `line_items` - Tied to parent document
- `payments` - Should follow invoice
- System tables - Not user-facing

### Implementation

See: `database/migrations/OPTIONAL_add_soft_deletes.sql`

**Benefits:**
- ✅ Recover accidentally deleted data
- ✅ Maintain referential integrity
- ✅ Audit trail (who deleted what when)
- ✅ "Trash bin" feature in UI

**Trade-offs:**
- ⚠️ Queries must filter `WHERE deleted_at IS NULL`
- ⚠️ Need cleanup job for old deleted records
- ⚠️ Slightly larger database

---

## 3. 📝 Enhanced Audit Trail

### Current State
- ✅ `activities` table tracks deal changes
- ✅ `task_activities` tracks task changes
- ❌ No audit for: companies, people, quotes, orders, invoices, payments

### Problem
When data changes, you can't answer:
- Who changed this company's info?
- When was this invoice amount modified?
- What was the old value?

### Solution: Generic Audit Log

**Option A: Expand Existing `activities` Table**
- Pros: Simple, uses existing pattern
- Cons: Limited to specific entity types

**Option B: New `audit_log` Table**
- Pros: Generic, works for all tables
- Cons: More complex queries

**Option C: Use Supabase Built-in Logging**
- Pros: No code needed
- Cons: Expensive, limited retention

### Recommended: Option B - Generic Audit Log

See: `database/migrations/OPTIONAL_add_generic_audit_trail.sql`

**Benefits:**
- ✅ Track ALL changes to critical data
- ✅ See who, what, when for every change
- ✅ Store old/new values
- ✅ Compliance/security requirements

**Trade-offs:**
- ⚠️ Increases database size
- ⚠️ Slight performance overhead on writes
- ⚠️ Need cleanup job for old audit records

---

## 4. 🔍 Full-Text Search Indexes

### Problem
Searching for companies, people, or deals by name is slow without proper indexes.

### Current State
- ✅ Basic indexes on name columns exist (but unused)
- ❌ No full-text search indexes
- ❌ No trigram (similarity) indexes

### Solution: GIN Indexes for Search

See: `database/migrations/OPTIONAL_add_fulltext_search.sql`

**Add GIN indexes for:**
- `companies.name` - Search companies
- `companies.domain` - Find by domain
- `people.first_name`, `people.last_name`, `people.email` - Search contacts
- `deals.title` - Search deals

**Benefits:**
- ✅ Fast fuzzy search
- ✅ Typo-tolerant search
- ✅ Better user experience

**Trade-offs:**
- ⚠️ Larger index size (~2-3x)
- ⚠️ Slower writes

---

## 5. 🧹 Idempotency Keys Cleanup

### Problem
`idempotency_keys` table has `expires_at` but no automatic cleanup.

### Solution: Periodic Cleanup Job

**Option A: pg_cron (if available)**
```sql
SELECT cron.schedule('cleanup-old-idempotency-keys', '0 2 * * *', 
  'DELETE FROM public.idempotency_keys WHERE expires_at < NOW()');
```

**Option B: Supabase Edge Function**
- Run daily via cron
- Delete expired keys

**Option C: Application-level Cleanup**
- Run on app startup
- Delete expired keys older than 48 hours

See: `database/migrations/OPTIONAL_idempotency_cleanup.sql`

---

## Implementation Priority

### Must Do (After 1 Week Verification):
1. ✅ Monitor new indexes usage
2. ⚠️ Drop confirmed unused indexes (if verified)

### Should Do (Within 1 Month):
3. 🗑️ Implement soft deletes for critical tables
4. 📝 Add audit trail for financial documents

### Nice to Have (Within 3 Months):
5. 🔍 Add full-text search if search feature is built
6. 🧹 Implement idempotency cleanup job

---

## Safety Guidelines

### Before Dropping Any Index:
1. ✅ Verify it's been unused for 2+ weeks
2. ✅ Check if it's referenced in application code
3. ✅ Verify it's not a unique constraint
4. ✅ Test in staging first
5. ✅ Have rollback script ready
6. ✅ Monitor query performance after drop

### Before Adding Soft Deletes:
1. ✅ Plan UI for "restore" feature
2. ✅ Update all queries to filter deleted records
3. ✅ Test foreign key behavior
4. ✅ Plan cleanup job for old deleted records

### Before Adding Audit Trail:
1. ✅ Decide retention policy (90 days? 1 year?)
2. ✅ Plan cleanup job
3. ✅ Consider impact on database size
4. ✅ Test write performance

---

## Monitoring Queries

### Check Index Usage (Run Weekly)
```sql
SELECT 
  schemaname,
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan AS scans_count,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size,
  CASE 
    WHEN idx_scan = 0 THEN '🔴 NEVER'
    WHEN idx_scan < 10 THEN '🟡 RARE'
    WHEN idx_scan < 100 THEN '🟢 OCCASIONAL'
    ELSE '✅ ACTIVE'
  END AS usage
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexrelname NOT LIKE '%_pkey'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;
```

### Check Database Size Growth
```sql
SELECT 
  pg_size_pretty(pg_database_size(current_database())) AS total_size,
  pg_size_pretty(SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename)))) AS tables_size,
  pg_size_pretty(SUM(pg_indexes_size(quote_ident(schemaname) || '.' || quote_ident(tablename)))) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY schemaname;
```

---

## Summary

These cleanup tasks are **low priority** but will:
- ✅ Reduce database size
- ✅ Improve write performance (fewer indexes)
- ✅ Add data recovery capabilities (soft deletes)
- ✅ Improve compliance (audit trail)
- ✅ Better search experience (full-text indexes)

**Recommendation:** Tackle these one at a time, starting with index cleanup after verifying the critical fixes are stable.

---

*Last Updated: 2025-01-11*  
*Status: Awaiting 1-2 week verification period*

