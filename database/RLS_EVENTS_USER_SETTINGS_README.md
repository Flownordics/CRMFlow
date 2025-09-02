# RLS Policies for Events & User Settings

## Overview

This document describes the Row Level Security (RLS) implementation for the `events` and `user_settings` tables in CRMFlow.

## Tables Protected

### 1. `public.events`
- **Purpose**: Calendar events for users
- **Key Column**: `created_by uuid not null default auth.uid()`
- **Security Model**: Users can only access events they created

### 2. `public.user_settings`
- **Purpose**: User preferences and settings
- **Key Column**: `user_id uuid unique not null`
- **Security Model**: Users can only access their own settings (one row per user)

## Migration File

**File**: `database/patches/2025-rls-events-user_settings.sql`

### Features
- ✅ **Idempotent**: Safe to run multiple times
- ✅ **Column Safety**: Ensures required columns exist before enabling RLS
- ✅ **Policy Cleanup**: Drops existing policies to ensure clean state
- ✅ **Comprehensive Coverage**: All CRUD operations protected

## RLS Policies

### Events Table Policies

| Policy Name | Operation | Condition |
|-------------|-----------|-----------|
| `events_select_own` | SELECT | `created_by = auth.uid()` |
| `events_insert_own` | INSERT | `created_by = auth.uid()` |
| `events_update_own` | UPDATE | `created_by = auth.uid()` |
| `events_delete_own` | DELETE | `created_by = auth.uid()` |

### User Settings Table Policies

| Policy Name | Operation | Condition |
|-------------|-----------|-----------|
| `user_settings_select_own` | SELECT | `user_id = auth.uid()` |
| `user_settings_insert_own` | INSERT | `user_id = auth.uid()` |
| `user_settings_update_own` | UPDATE | `user_id = auth.uid()` |
| `user_settings_delete_own` | DELETE | `user_id = auth.uid()` |

## Deployment

### Option 1: Supabase CLI
```bash
# For development
supabase db reset

# For production (only new patches)
supabase db push
```

### Option 2: SQL Editor
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run the migration file: `database/patches/2025-rls-events-user_settings.sql`

## Verification

### Quick Test Script
Run `database/verify_rls_events_user_settings.sql` as an authenticated user to verify:

1. ✅ RLS is enabled on both tables
2. ✅ Policies are created correctly
3. ✅ Users can only access their own data
4. ✅ Cross-user access is blocked
5. ✅ CRUD operations work for own data

### Manual Verification

#### Events Table
```sql
-- Should only return events created by current user
select * from public.events;

-- Insert should auto-set created_by = auth.uid()
insert into public.events (title, start_at, end_at) 
values ('Test', now(), now() + interval '1 hour');

-- Should return 0 rows (other users' events)
select count(*) from public.events where created_by != auth.uid();
```

#### User Settings Table
```sql
-- Should only return current user's settings
select * from public.user_settings;

-- Upsert should work for own settings
insert into public.user_settings (user_id, calendar_show_google)
values (auth.uid(), true)
on conflict (user_id) do update set calendar_show_google = excluded.calendar_show_google;

-- Should return 0 rows (other users' settings)
select count(*) from public.user_settings where user_id != auth.uid();
```

## Frontend Integration

### No Code Changes Required
The frontend doesn't need any changes because:
- ✅ RLS automatically filters data by user
- ✅ `created_by` and `user_id` are auto-set by database defaults
- ✅ Existing API calls will work as expected

### Expected Behavior
- **Calendar**: Users only see their own events
- **Settings**: Users only see/modify their own settings
- **No 401/403 errors** for legitimate operations
- **403 errors** for cross-user access attempts

## Security Benefits

1. **Data Isolation**: Users cannot access other users' data
2. **Automatic Filtering**: No need for WHERE clauses in queries
3. **Database-Level Security**: Protection at the database layer
4. **Audit Trail**: `created_by` tracks event ownership
5. **User-Specific Settings**: One settings row per user

## Troubleshooting

### Common Issues

1. **"No rows returned" for legitimate queries**
   - Check if user is authenticated (`auth.uid()` is not null)
   - Verify RLS policies are active

2. **"Permission denied" errors**
   - Ensure user has proper authentication
   - Check if policies are correctly applied

3. **Cross-user data visible**
   - Verify RLS is enabled: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'events';`
   - Check policy existence: `SELECT * FROM pg_policies WHERE tablename = 'events';`

### Debug Commands
```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('events', 'user_settings');

-- List all policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('events', 'user_settings');

-- Check current user
SELECT auth.uid() as current_user;
```

## Migration History

- **2025-01-XX**: Initial RLS implementation
- **Previous**: Basic RLS enabled in various migration files
- **Current**: Comprehensive, granular policies with cleanup

## Related Files

- `database/patches/2025-rls-events-user_settings.sql` - Main migration
- `database/verify_rls_events_user_settings.sql` - Verification script
- `database/schema.sql` - Table definitions
- `fix_missing_tables.sql` - Previous RLS implementation
