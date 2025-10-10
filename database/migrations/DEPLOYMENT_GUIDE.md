# Database Migrations Deployment Guide

## Overview
This guide covers the deployment of 5 critical database migrations to fix security and performance issues identified in the database audit.

## Migration Summary

| Migration | Priority | Description | Estimated Duration |
|-----------|----------|-------------|-------------------|
| `20250111000001_fix_critical_missing_rls.sql` | CRITICAL | Enable RLS on 5 tables | ~30 seconds |
| `20250111000002_fix_function_search_path.sql` | CRITICAL | Secure 8 PL/pgSQL functions | ~1 minute |
| `20250111000003_optimize_rls_policies.sql` | HIGH | Optimize 33 RLS policies for performance | ~2 minutes |
| `20250111000004_add_missing_indexes.sql` | HIGH | Add 9 missing indexes | ~1-2 minutes |
| `20250111000005_add_missing_constraints.sql` | MEDIUM | Add constraints and timestamps | ~2-3 minutes |

**Total Estimated Time:** 7-9 minutes

## Pre-Deployment Checklist

### 1. Backup Database
```bash
# Using Supabase CLI
supabase db dump -f backup_before_fixes_$(date +%Y%m%d_%H%M%S).sql

# Or from Supabase Dashboard:
# Project Settings > Database > Backup
```

### 2. Test in Development First
```bash
# Apply to local development
supabase db push

# Or apply to staging branch
supabase link --project-ref YOUR_STAGING_PROJECT_REF
supabase db push
```

### 3. Check Current State
Run this in Supabase SQL Editor to verify current issues:
```sql
-- Check tables without RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false
AND tablename IN ('pipelines', 'stages', 'deal_integrations', 'stage_probabilities', 'numbering_counters');

-- Check functions without search_path
SELECT proname, prosecdef, proconfig 
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
AND proname IN (
  'set_updated_at', 
  'line_item_parent_exists', 
  'next_doc_number',
  'update_tasks_updated_at',
  'create_task_activity',
  'compute_activity_status',
  'update_company_activity_status',
  'trg_update_company_activity'
);
```

## Deployment Steps

### Option A: Using Supabase Migrations (Recommended)

1. **Copy migrations to Supabase migrations folder:**
```bash
cp database/migrations/20250111000001_fix_critical_missing_rls.sql supabase/migrations/
cp database/migrations/20250111000002_fix_function_search_path.sql supabase/migrations/
cp database/migrations/20250111000003_optimize_rls_policies.sql supabase/migrations/
cp database/migrations/20250111000004_add_missing_indexes.sql supabase/migrations/
cp database/migrations/20250111000005_add_missing_constraints.sql supabase/migrations/
```

2. **Apply migrations:**
```bash
# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

### Option B: Manual Application via SQL Editor

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste each migration file in order
3. Click "Run" for each migration
4. Verify output shows success

**IMPORTANT:** Run migrations in numbered order (001 → 005)

## Deployment Windows

### Recommended: Low-Traffic Period
- **Best Time:** During maintenance window or off-peak hours
- **Reason:** Some migrations lock tables briefly during ALTER operations

### Expected Impact
- **Downtime:** None (migrations run in <10 minutes)
- **Performance:** Brief locks during index creation (milliseconds per table)
- **User Impact:** Minimal to none

## Post-Deployment Verification

### 1. Verify RLS is Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('pipelines', 'stages', 'deal_integrations', 'stage_probabilities', 'numbering_counters');

-- Expected: All should have rowsecurity = true
```

### 2. Verify Functions Have search_path
```sql
SELECT proname, prosecdef, proconfig 
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
AND proname IN (
  'set_updated_at', 
  'line_item_parent_exists', 
  'next_doc_number',
  'update_tasks_updated_at',
  'create_task_activity',
  'compute_activity_status',
  'update_company_activity_status',
  'trg_update_company_activity'
);

-- Expected: All should have proconfig containing 'search_path'
```

### 3. Verify Indexes Were Created
```sql
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname IN (
  'idx_deals_contact',
  'idx_quotes_contact', 
  'idx_orders_contact',
  'idx_invoices_contact',
  'idx_task_activities_task',
  'idx_task_activities_user',
  'idx_task_comments_task',
  'idx_task_comments_user',
  'idx_tasks_assigned_by'
)
ORDER BY tablename, indexname;

-- Expected: 9 rows returned
```

### 4. Verify Constraints Were Added
```sql
-- Check unique constraint on line_items
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'public.line_items'::regclass
AND conname = 'uidx_line_items_parent_position';

-- Check time constraints
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'public.events'::regclass
AND conname = 'check_events_time_range';

-- Check new timestamps
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('pipelines', 'stages', 'numbering_counters', 'activities')
AND column_name IN ('created_at', 'updated_at')
ORDER BY table_name, column_name;
```

### 5. Test Application Functionality
- [ ] Login/Authentication works
- [ ] Can create/view deals
- [ ] Can create/view quotes, orders, invoices
- [ ] Tasks are visible and editable
- [ ] Calendar events work
- [ ] No console errors in browser

### 6. Monitor Performance
```sql
-- Check for slow queries (run this periodically)
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_time DESC
LIMIT 20;
```

## Rollback Procedure

If issues occur, see `ROLLBACK_GUIDE.md` for detailed rollback instructions.

**Quick Rollback:**
```bash
# Restore from backup
supabase db restore backup_before_fixes_TIMESTAMP.sql
```

## Common Issues & Solutions

### Issue: Migration times out
**Solution:** Run migrations individually with increased timeout

### Issue: Index creation is slow
**Solution:** This is normal for large tables. Wait for completion.

### Issue: RLS blocks application access
**Solution:** Verify policies are correct. May need to adjust policies for your use case.

### Issue: Constraint violations on existing data
**Solution:** This means existing data violates the new constraints. You may need to:
1. Comment out problematic constraints
2. Fix data manually
3. Re-enable constraints

## Support

If you encounter issues:
1. Check logs in Supabase Dashboard → Logs
2. Run verification queries above
3. Consult `ROLLBACK_GUIDE.md` if rollback needed
4. Check Supabase status page: https://status.supabase.com/

## Next Steps After Deployment

1. **Enable Auth Security Features** (Manual in Supabase Dashboard):
   - Enable "Leaked Password Protection" (HaveIBeenPwned)
   - Enable additional MFA options (TOTP, WebAuthn)

2. **Monitor Performance**:
   - Watch slow query logs for 1 week
   - Identify unused indexes (query patterns may have changed)

3. **Consider Additional Improvements** (See audit report):
   - Implement soft deletes for critical data
   - Add audit trail for companies, people, etc.
   - Add full-text search indexes
   - Cleanup unused indexes after verification

## Success Criteria

✅ All 5 migrations applied successfully  
✅ All verification queries pass  
✅ Application functions normally  
✅ No new errors in logs  
✅ Security advisor shows reduced warnings  
✅ Performance advisor shows improvement  

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Notes:** _____________

