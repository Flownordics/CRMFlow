# RBAC Implementation Plan - CRMFlow

## 📋 Executive Summary

Implementering af Role-Based Access Control (RBAC) for CRMFlow med 5 roller og granulær adgangskontrol.

**Estimeret tid**: 14-28 timer  
**Risiko**: Lav  
**Kompleksitet**: Mellem

---

## 🎯 Roller og Permissions

### Rolle-hierarki

```
admin (Fuld adgang)
  ↓
manager (Se alt, redigere det meste)
  ↓
sales (Egne deals + fælles data)
  ↓
support (Kun læseadgang + tasks)
  ↓
viewer (Kun læseadgang)
```

### Detaljerede Permissions

| Operation | admin | manager | sales | support | viewer |
|-----------|-------|---------|-------|---------|--------|
| **Companies** |
| - View all | ✅ | ✅ | ✅ | ✅ | ✅ |
| - Create | ✅ | ✅ | ✅ | ❌ | ❌ |
| - Update | ✅ | ✅ | ✅ | ❌ | ❌ |
| - Delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Deals** |
| - View all | ✅ | ✅ | Own only | ✅ | ✅ |
| - Create | ✅ | ✅ | ✅ | ❌ | ❌ |
| - Update all | ✅ | ✅ | Own only | ❌ | ❌ |
| - Delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Quotes/Orders/Invoices** |
| - View all | ✅ | ✅ | ✅ | ✅ | ✅ |
| - Create | ✅ | ✅ | ✅ | ❌ | ❌ |
| - Update | ✅ | ✅ | ✅ | ❌ | ❌ |
| - Delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| - Send emails | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Tasks** |
| - View all | ✅ | ✅ | Assigned only | Assigned only | ✅ |
| - Create | ✅ | ✅ | ✅ | ✅ | ❌ |
| - Update own | ✅ | ✅ | ✅ | ✅ | ❌ |
| - Delete | ✅ | ✅ | Own only | Own only | ❌ |
| **System Settings** |
| - View workspace settings | ✅ | ✅ | ✅ | ✅ | ✅ |
| - Update workspace settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| - Manage pipelines/stages | ✅ | ✅ | ❌ | ❌ | ❌ |
| - Manage users | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Documents** |
| - View all | ✅ | ✅ | ✅ | ✅ | ✅ |
| - Upload | ✅ | ✅ | ✅ | ✅ | ❌ |
| - Delete | ✅ | ✅ | Own only | ❌ | ❌ |

---

## 🗄️ Database Design

### 1. user_profiles Table

```sql
CREATE TYPE user_role AS ENUM (
  'admin',
  'manager',
  'sales',
  'support',
  'viewer'
);

CREATE TABLE public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'sales',
  full_name TEXT,
  avatar_url TEXT,
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast role lookups
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view all profiles
CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() 
    AND role = (SELECT role FROM user_profiles WHERE user_id = auth.uid())
  );

-- Only admins can insert/delete profiles
CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can delete profiles"
  ON user_profiles FOR DELETE
  USING (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin'
  );

-- Trigger for updated_at
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Function to get user role (for use in RLS policies)
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN (SELECT role FROM public.user_profiles WHERE user_id = auth.uid());
END;
$$;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION auth.has_permission(required_roles user_role[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = ANY(required_roles);
END;
$$;
```

### 2. Opdaterede RLS Policies

#### Companies

```sql
-- View: All can view
DROP POLICY IF EXISTS "Allow authenticated users to manage companies" ON companies;

CREATE POLICY "All authenticated can view companies"
  ON companies FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- Create: Sales and above
CREATE POLICY "Sales and above can create companies"
  ON companies FOR INSERT
  WITH CHECK (auth.has_permission(ARRAY['admin', 'manager', 'sales']::user_role[]));

-- Update: Sales and above
CREATE POLICY "Sales and above can update companies"
  ON companies FOR UPDATE
  USING (auth.has_permission(ARRAY['admin', 'manager', 'sales']::user_role[]))
  WITH CHECK (auth.has_permission(ARRAY['admin', 'manager', 'sales']::user_role[]));

-- Delete: Admins and managers only
CREATE POLICY "Admins and managers can delete companies"
  ON companies FOR DELETE
  USING (auth.has_permission(ARRAY['admin', 'manager']::user_role[]));
```

#### Deals

```sql
DROP POLICY IF EXISTS "Allow authenticated users to manage deals" ON deals;

-- View: Admins/managers see all, sales see own
CREATE POLICY "View deals based on role"
  ON deals FOR SELECT
  USING (
    auth.has_permission(ARRAY['admin', 'manager', 'support', 'viewer']::user_role[])
    OR (
      auth.user_role() = 'sales' 
      AND owner_user_id = auth.uid()
    )
  );

-- Create: Sales and above
CREATE POLICY "Sales and above can create deals"
  ON deals FOR INSERT
  WITH CHECK (auth.has_permission(ARRAY['admin', 'manager', 'sales']::user_role[]));

-- Update: Admins/managers can update all, sales can update own
CREATE POLICY "Update deals based on role"
  ON deals FOR UPDATE
  USING (
    auth.has_permission(ARRAY['admin', 'manager']::user_role[])
    OR (
      auth.user_role() = 'sales' 
      AND owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.has_permission(ARRAY['admin', 'manager']::user_role[])
    OR (
      auth.user_role() = 'sales' 
      AND owner_user_id = auth.uid()
    )
  );

-- Delete: Admins and managers only
CREATE POLICY "Admins and managers can delete deals"
  ON deals FOR DELETE
  USING (auth.has_permission(ARRAY['admin', 'manager']::user_role[]));
```

#### Tasks

```sql
DROP POLICY IF EXISTS "Allow authenticated users to manage tasks" ON tasks;

-- View: Admins/managers see all, others see assigned tasks
CREATE POLICY "View tasks based on role"
  ON tasks FOR SELECT
  USING (
    auth.has_permission(ARRAY['admin', 'manager', 'viewer']::user_role[])
    OR user_id = auth.uid()
    OR assigned_to = auth.uid()
  );

-- Create: All except viewers
CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.has_permission(ARRAY['admin', 'manager', 'sales', 'support']::user_role[]));

-- Update: Admins/managers can update all, others can update own
CREATE POLICY "Update tasks based on role"
  ON tasks FOR UPDATE
  USING (
    auth.has_permission(ARRAY['admin', 'manager']::user_role[])
    OR user_id = auth.uid()
    OR assigned_to = auth.uid()
  );

-- Delete: Admins/managers can delete all, others can delete own
CREATE POLICY "Delete tasks based on role"
  ON tasks FOR DELETE
  USING (
    auth.has_permission(ARRAY['admin', 'manager']::user_role[])
    OR user_id = auth.uid()
  );
```

#### Workspace Settings

```sql
DROP POLICY IF EXISTS "Allow authenticated users to manage workspace_settings" ON workspace_settings;

-- View: All can view
CREATE POLICY "All can view workspace settings"
  ON workspace_settings FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- Update: Only admins
CREATE POLICY "Only admins can update workspace settings"
  ON workspace_settings FOR UPDATE
  USING (auth.user_role() = 'admin')
  WITH CHECK (auth.user_role() = 'admin');
```

#### Pipelines & Stages

```sql
-- View: All can view
CREATE POLICY "All can view pipelines"
  ON pipelines FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- Manage: Admins and managers only
CREATE POLICY "Admins and managers can manage pipelines"
  ON pipelines FOR ALL
  USING (auth.has_permission(ARRAY['admin', 'manager']::user_role[]))
  WITH CHECK (auth.has_permission(ARRAY['admin', 'manager']::user_role[]));

-- Same for stages
CREATE POLICY "All can view stages"
  ON stages FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "Admins and managers can manage stages"
  ON stages FOR ALL
  USING (auth.has_permission(ARRAY['admin', 'manager']::user_role[]))
  WITH CHECK (auth.has_permission(ARRAY['admin', 'manager']::user_role[]));
```

---

## 💻 Frontend Implementation

### 1. TypeScript Types

```typescript
// src/types/rbac.ts
export type UserRole = 'admin' | 'manager' | 'sales' | 'support' | 'viewer';

export interface UserProfile {
  user_id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type Permission =
  | 'companies:create'
  | 'companies:update'
  | 'companies:delete'
  | 'deals:view_all'
  | 'deals:create'
  | 'deals:update_all'
  | 'deals:delete'
  | 'quotes:create'
  | 'quotes:update'
  | 'quotes:delete'
  | 'tasks:view_all'
  | 'tasks:create'
  | 'tasks:delete_all'
  | 'settings:update'
  | 'pipelines:manage'
  | 'users:manage';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'companies:create', 'companies:update', 'companies:delete',
    'deals:view_all', 'deals:create', 'deals:update_all', 'deals:delete',
    'quotes:create', 'quotes:update', 'quotes:delete',
    'tasks:view_all', 'tasks:create', 'tasks:delete_all',
    'settings:update', 'pipelines:manage', 'users:manage'
  ],
  manager: [
    'companies:create', 'companies:update', 'companies:delete',
    'deals:view_all', 'deals:create', 'deals:update_all', 'deals:delete',
    'quotes:create', 'quotes:update', 'quotes:delete',
    'tasks:view_all', 'tasks:create', 'tasks:delete_all',
    'pipelines:manage'
  ],
  sales: [
    'companies:create', 'companies:update',
    'deals:create', 
    'quotes:create', 'quotes:update',
    'tasks:create'
  ],
  support: [
    'tasks:create'
  ],
  viewer: []
};
```

### 2. useRole Hook

```typescript
// src/hooks/useRole.ts
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/integrations/supabase/client';
import type { UserProfile, UserRole, Permission } from '@/types/rbac';
import { ROLE_PERMISSIONS } from '@/types/rbac';

export function useRole() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        setProfile(null);
      } else {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user?.id]);

  const role: UserRole | null = profile?.role ?? null;

  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    return ROLE_PERMISSIONS[role].includes(permission);
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!role) return false;
    return roles.includes(role);
  };

  const isAdmin = hasRole('admin');
  const isManager = hasRole('manager');
  const isSales = hasRole('sales');
  const isSupport = hasRole('support');
  const isViewer = hasRole('viewer');

  return {
    profile,
    role,
    loading,
    hasPermission,
    hasRole,
    isAdmin,
    isManager,
    isSales,
    isSupport,
    isViewer
  };
}
```

### 3. Permission Components

```typescript
// src/components/auth/Can.tsx
import { PropsWithChildren } from 'react';
import { useRole } from '@/hooks/useRole';
import type { Permission, UserRole } from '@/types/rbac';

interface CanProps extends PropsWithChildren {
  permission?: Permission;
  role?: UserRole | UserRole[];
  fallback?: React.ReactNode;
}

export function Can({ permission, role, fallback = null, children }: CanProps) {
  const { hasPermission, hasRole } = useRole();

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!hasRole(...roles)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
```

### 4. Usage Examples

```typescript
// In components:
import { Can } from '@/components/auth/Can';
import { useRole } from '@/hooks/useRole';

function CompanyDetail() {
  const { hasPermission } = useRole();

  return (
    <div>
      <h1>Company Details</h1>
      
      {/* Conditional rendering */}
      <Can permission="companies:delete">
        <Button onClick={handleDelete} variant="destructive">
          Delete Company
        </Button>
      </Can>

      {/* Multiple roles */}
      <Can role={['admin', 'manager']}>
        <Button onClick={handleAdvancedSettings}>
          Advanced Settings
        </Button>
      </Can>

      {/* Programmatic check */}
      <Button 
        onClick={handleEdit}
        disabled={!hasPermission('companies:update')}
      >
        Edit
      </Button>
    </div>
  );
}
```

---

## 🚀 Implementation Steps

### Phase 1: Database Migrations (2-4 timer)

1. Create user_role enum
2. Create user_profiles table
3. Create auth.user_role() function
4. Create auth.has_permission() function
5. Add RLS to user_profiles
6. Create seed data (first user as admin)

### Phase 2: Fix Critical Security Issues (2-4 timer)

1. Enable RLS on missing tables (company_tags, company_tag_assignments, company_notes)
2. Fix remaining functions without search_path
3. Verify all views with SECURITY DEFINER

### Phase 3: Update RLS Policies (4-8 timer)

1. Update companies policies
2. Update deals policies
3. Update tasks policies
4. Update quotes/orders/invoices policies
5. Update workspace_settings policies
6. Update pipelines/stages policies

### Phase 4: Frontend Implementation (4-8 timer)

1. Create RBAC types
2. Create useRole hook
3. Create Can component
4. Update useAuthStore to include profile
5. Add permission checks to key components

### Phase 5: Testing & Verification (2-4 timer)

1. Test all roles with different permissions
2. Verify RLS policies work correctly
3. Test frontend permission checks
4. Run linter and fix errors

---

## ✅ Verification Checklist

### Database
- [ ] user_profiles table created with RLS
- [ ] All tables have RLS enabled
- [ ] All functions have search_path set
- [ ] auth.user_role() function works
- [ ] auth.has_permission() function works
- [ ] At least one admin user exists

### Frontend
- [ ] useRole hook returns correct role
- [ ] hasPermission() works for all permissions
- [ ] Can component hides content based on permissions
- [ ] Delete buttons only visible to admins/managers
- [ ] Sales users can only edit own deals

### Security
- [ ] Viewers cannot modify any data
- [ ] Support can only create tasks
- [ ] Sales cannot delete companies
- [ ] Only admins can manage pipelines/stages
- [ ] Only admins can update workspace settings

---

## 🎯 Success Criteria

1. ✅ All 5 roller implementeret og fungerer
2. ✅ Alle kritiske sikkerhedsproblemer løst
3. ✅ Granulær adgangskontrol på alle core entiteter
4. ✅ Frontend respekterer backend permissions
5. ✅ Ingen breaking changes for eksisterende brugere
6. ✅ Comprehensive documentation

---

*Plan oprettet af: Sovereign Architect*  
*Dato: 15. oktober 2025*


