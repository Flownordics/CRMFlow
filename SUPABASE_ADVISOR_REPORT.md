# 🔍 Supabase Database Advisor Report

**Date:** October 10, 2025  
**Source:** Supabase MCP Advisors (Security & Performance)  
**Status:** 🔴 ACTION REQUIRED

---

## 📊 Executive Summary

Supabase Database Advisors har identificeret **97 potentielle issues** i databasen:

### **Security Issues:**
- 🔴 **13 ERROR:** SECURITY DEFINER views
- ⚠️ **1 WARN:** Function search path mutable
- ⚠️ **2 WARN:** Auth configuration issues

### **Performance Issues:**
- ⚠️ **24 WARN:** RLS policies re-evaluating auth.uid() per row
- ⚠️ **8 WARN:** Multiple permissive policies (duplicate RLS)
- ℹ️ **51 INFO:** Unused indexes (potential cleanup)

**Total:** 99 advisor notifications

---

## 🚨 SECURITY ISSUES (16 total)

### 1. SECURITY DEFINER Views (13 ERROR)

**Severity:** 🔴 ERROR  
**Impact:** Security risk - views bypass RLS

**Affected Views:**
1. `public.active_documents`
2. `public.deleted_deals`
3. `public.active_invoices`
4. `public.active_quotes`
5. `public.active_tasks`
6. `public.deleted_orders`
7. `public.deleted_quotes`
8. `public.active_people`
9. `public.active_deals`
10. `public.deleted_invoices`
11. `public.deleted_companies`
12. `public.active_companies`
13. `public.active_orders`

**Problem:**
Views with `SECURITY DEFINER` enforce permissions of view creator, not the querying user. This can bypass Row Level Security policies.

**Recommendation:**
Review each view and either:
1. Remove `SECURITY DEFINER` if not needed
2. Document why it's required
3. Ensure proper security checks within view definition

**Remediation:** [See Supabase Docs](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)

---

### 2. Function Search Path Mutable (1 WARN)

**Severity:** ⚠️ WARN  
**Impact:** Potential security vulnerability

**Affected Function:**
- `public.update_company_activity_status`

**Problem:**
Function has role-mutable search_path, which can be exploited.

**Solution:**
```sql
ALTER FUNCTION public.update_company_activity_status
SET search_path = '';
```

**Remediation:** [See Supabase Docs](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)

---

### 3. Auth Configuration (2 WARN)

#### A. Leaked Password Protection Disabled
**Severity:** ⚠️ WARN  
**Impact:** Users can use compromised passwords

**Problem:**
Supabase Auth's HaveIBeenPwned integration is disabled.

**Solution:**
Enable in Supabase Dashboard:
- Auth → Settings → Password Protection → Enable

**Remediation:** [See Supabase Docs](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

#### B. Insufficient MFA Options
**Severity:** ⚠️ WARN  
**Impact:** Weaker account security

**Problem:**
Too few MFA options enabled.

**Solution:**
Enable additional MFA methods in Supabase Dashboard:
- Auth → Settings → Multi-Factor Authentication

**Remediation:** [See Supabase Docs](https://supabase.com/docs/guides/auth/auth-mfa)

---

## ⚡ PERFORMANCE ISSUES (83 total)

### 1. RLS Auth Functions Re-evaluation (24 WARN)

**Severity:** ⚠️ WARN (HIGH PRIORITY)  
**Impact:** Suboptimal query performance at scale

**Problem:**
RLS policies calling `auth.uid()` are re-evaluated for **every row**, causing performance degradation.

**Affected Tables (24 policies):**
1. `companies` - 1 policy
2. `people` - 1 policy
3. `deals` - 1 policy
4. `documents` - 1 policy
5. `activities` - 1 policy
6. `quotes` - 1 policy
7. `orders` - 1 policy
8. `invoices` - 1 policy
9. `payments` - 1 policy
10. `workspace_settings` - 1 policy
11. `idempotency_keys` - 1 policy
12. `email_logs` - 1 policy
13. `user_integrations` - 1 policy
14. `user_settings` - 1 policy
15. `tasks` - 4 policies (view, insert, update, delete)
16. `task_comments` - 2 policies
17. `events` - 1 policy
18. `task_activities` - 2 policies
19. `line_items` - 1 policy
20. `activity_log` - 2 policies
21. `call_lists` - 4 policies
22. `call_list_items` - 1 policy

**Solution:**
Replace `auth.uid()` with `(select auth.uid())` in ALL RLS policies.

**Example:**
```sql
-- BEFORE (BAD - re-evaluated per row)
CREATE POLICY "Allow authenticated users to manage companies"
ON public.companies
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL);

-- AFTER (GOOD - evaluated once)
CREATE POLICY "Allow authenticated users to manage companies"
ON public.companies
FOR ALL
TO authenticated
USING ((select auth.uid()) IS NOT NULL);
```

**Estimated Impact:**
- 10-100x performance improvement on large tables
- Critical for production scale

**Priority:** 🔴 HIGH - Should be fixed in Phase 2.5

**Remediation:** [See Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select)

---

### 2. Multiple Permissive Policies (8 WARN)

**Severity:** ⚠️ WARN  
**Impact:** Suboptimal performance (each policy executed)

**Problem:**
Some tables have duplicate RLS policies for same role/action.

**Affected Tables:**
- `numbering_counters` - 4 duplicate SELECT policies
- `pipelines` - 4 duplicate SELECT policies  
- `stage_probabilities` - 4 duplicate SELECT policies
- `stages` - 4 duplicate SELECT policies

**Solution:**
Consolidate policies into single policy per role/action combination.

**Example:**
```sql
-- INSTEAD OF:
-- Policy 1: "Allow authenticated users to manage X"
-- Policy 2: "Allow authenticated users to view X"

-- USE:
-- Policy: "Allow authenticated users to access X" (covers both)
```

**Priority:** 🟡 MEDIUM

**Remediation:** [See Supabase Docs](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies)

---

### 3. Unused Indexes (51 INFO)

**Severity:** ℹ️ INFO  
**Impact:** Storage waste, maintenance overhead

**Categories:**

#### **A. Likely Unused (Early in development):**
Many indexes are marked "unused" because:
- Application is new
- Limited production usage
- Indexes are preventive for future scale

**Examples:**
- `idx_companies_name` - Will be used for search
- `idx_deals_stage` - Will be used for Kanban queries  
- `idx_invoices_due` - Will be used for overdue queries

**Recommendation:** **KEEP THESE** - They're for future scale

#### **B. Potentially Removable:**
Some indexes may genuinely not be needed:
- `idx_companies_deleted_at_desc` - Descending index (asc might be enough)
- `idx_quotes_deleted_at` - If soft delete not used heavily
- Multiple deleted_at indexes

**Action:**
1. Monitor index usage over 1-2 months of production
2. Remove genuinely unused indexes
3. Keep indexes for expected queries

**Priority:** 🟢 LOW - Monitor first, don't remove prematurely

---

## 🎯 RECOMMENDED ACTION PLAN

### **Phase 2.5: Database Optimization (HIGH PRIORITY)**

**Estimated Time:** 4-6 hours

#### **Task 1: Fix RLS Performance Issues** (3 hours)
**Priority:** 🔴 HIGH

```sql
-- Create migration to fix all RLS policies
-- Replace auth.uid() with (select auth.uid()) in 24 policies
-- Affects: companies, people, deals, documents, activities, quotes, 
--          orders, invoices, payments, workspace_settings, idempotency_keys,
--          email_logs, user_integrations, user_settings, tasks, 
--          task_comments, events, task_activities, line_items, activity_log,
--          call_lists, call_list_items
```

**Impact:** 10-100x query performance improvement on large tables

#### **Task 2: Review SECURITY DEFINER Views** (2 hours)
**Priority:** 🔴 HIGH

Audit each of 13 views to ensure they don't bypass necessary security checks.

#### **Task 3: Fix Function Search Path** (15 minutes)
**Priority:** 🟡 MEDIUM

```sql
ALTER FUNCTION public.update_company_activity_status
SET search_path = '';
```

#### **Task 4: Enable Auth Security Features** (15 minutes)
**Priority:** 🟡 MEDIUM

1. Enable leaked password protection in Supabase Dashboard
2. Enable additional MFA options

#### **Task 5: Consolidate Duplicate RLS Policies** (1 hour)
**Priority:** 🟡 MEDIUM

Merge duplicate policies on:
- numbering_counters
- pipelines
- stage_probabilities
- stages

---

## 📊 Risk Assessment

### **Current State:**

| Issue Type | Count | Severity | Risk Level |
|------------|-------|----------|------------|
| SECURITY DEFINER views | 13 | ERROR | 🔴 HIGH |
| RLS Performance | 24 | WARN | 🔴 HIGH |
| Function Security | 1 | WARN | 🟡 MEDIUM |
| Auth Config | 2 | WARN | 🟡 MEDIUM |
| Duplicate RLS | 8 | WARN | 🟢 LOW |
| Unused Indexes | 51 | INFO | 🟢 LOW |

### **Priority Order:**

1. **IMMEDIATE (This Week):**
   - Fix RLS performance (24 policies)
   - Review SECURITY DEFINER views

2. **HIGH (Next Week):**
   - Fix function search path
   - Enable auth security features

3. **MEDIUM (When Time Allows):**
   - Consolidate duplicate RLS policies
   
4. **LOW (Monitor & Decide):**
   - Evaluate unused indexes after production usage

---

## 💡 Benefits of Fixing These Issues

### **Performance:**
- 🚀 10-100x faster queries on tables with many rows
- ⚡ Reduced database load
- 📉 Lower latency for users

### **Security:**
- 🔒 Proper security definer usage
- 🛡️ Prevented SQL injection via search_path
- 🔐 Better auth security (password check, MFA)

### **Maintainability:**
- 🧹 Cleaner RLS policy structure
- 📚 Better documented security model
- 🎯 Optimized index strategy

---

## 🔧 Quick Fix Script

Create this migration to fix RLS performance issues:

```sql
-- Migration: optimize_rls_policies_for_performance
-- Purpose: Replace auth.uid() with (select auth.uid()) in RLS policies

-- This migration will drop and recreate all RLS policies with optimized auth function calls
-- Impact: 10-100x performance improvement on queries

-- Companies
DROP POLICY IF EXISTS "Allow authenticated users to manage companies" ON public.companies;
CREATE POLICY "Allow authenticated users to manage companies"
ON public.companies
FOR ALL
TO authenticated
USING ((select auth.uid()) IS NOT NULL);

-- Repeat for all 24 affected tables...
-- (Full script to be generated)
```

---

## 📝 Next Steps

1. **Review this report** and prioritize fixes
2. **Create Phase 2.5 plan** for database optimization
3. **Test migrations** on development branch
4. **Apply to production** after verification
5. **Monitor performance** improvements

---

**Impact:** Fixing these issues will significantly improve database performance and security! 🚀

---

*Report completed: October 10, 2025*  
*Source: Supabase MCP Advisors*  
*Priority: HIGH - Address in Phase 2.5*

