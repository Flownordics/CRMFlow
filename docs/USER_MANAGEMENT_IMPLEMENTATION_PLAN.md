# User Management & User Settings Implementation Plan

## Oversigt

Dette dokument beskriver implementeringsplanen for to nye funktionaliteter:

1. **Admin User Management** - Administrativ håndtering af brugere (deaktivering, rolleændringer, osv.)
2. **User Settings** - Almindelige brugerindstillinger hvor brugere kan ændre navn og andre personlige oplysninger

## Nuværende Status

### Eksisterende Infrastruktur

- ✅ `user_profiles` tabel med felter: `user_id`, `role`, `full_name`, `avatar_url`, `department`, `is_active`
- ✅ `user_settings` tabel med felter: `user_id`, `locale`, `theme`, `calendar_show_google`, `calendar_default_sync`, `timezone`
- ✅ RBAC system med roller: `admin`, `manager`, `sales`, `support`, `viewer`
- ✅ `get_all_users()` database funktion der returnerer alle aktive brugere
- ✅ `UserInvitations` komponent i Settings > Users tab (kun invitations)
- ✅ `Can` komponent til role-based rendering
- ✅ `useRole` hook til at tjekke roller og permissions

### Manglende Funktionalitet

- ❌ Admin kan ikke se liste over alle brugere
- ❌ Admin kan ikke deaktivere/aktivere brugere
- ❌ Admin kan ikke ændre brugerroller
- ❌ Admin kan ikke se brugerdetaljer
- ❌ Brugere kan ikke ændre deres eget navn
- ❌ Brugere kan ikke se/redigere deres personlige oplysninger

## Implementeringsplan

### Fase 1: Database & Backend

#### 1.1 Database Funktioner

**Opret migration:** `supabase/migrations/YYYYMMDD_HHMMSS_user_management_functions.sql`

```sql
-- Function to get all users with profile information (for admin)
CREATE OR REPLACE FUNCTION public.get_all_users_with_profiles()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  role text,
  department text,
  is_active boolean,
  avatar_url text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::text,
    up.full_name,
    up.role::text,
    up.department,
    up.is_active,
    up.avatar_url,
    u.created_at,
    u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN public.user_profiles up ON u.id = up.user_id
  WHERE u.deleted_at IS NULL
  ORDER BY up.is_active DESC, up.full_name NULLS LAST, u.email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users_with_profiles() TO authenticated;

-- Function to update user profile (for admin - can change role and is_active)
CREATE OR REPLACE FUNCTION public.update_user_profile_admin(
  target_user_id uuid,
  new_role text DEFAULT NULL,
  new_full_name text DEFAULT NULL,
  new_department text DEFAULT NULL,
  new_is_active boolean DEFAULT NULL,
  new_avatar_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role
  FROM public.user_profiles
  WHERE user_id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can update user profiles';
  END IF;
  
  -- Update user_profiles
  UPDATE public.user_profiles
  SET 
    role = COALESCE(new_role::user_role, role),
    full_name = COALESCE(new_full_name, full_name),
    department = COALESCE(new_department, department),
    is_active = COALESCE(new_is_active, is_active),
    avatar_url = COALESCE(new_avatar_url, avatar_url),
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- If profile doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO public.user_profiles (
      user_id,
      role,
      full_name,
      department,
      is_active,
      avatar_url
    ) VALUES (
      target_user_id,
      COALESCE(new_role::user_role, 'sales'),
      new_full_name,
      new_department,
      COALESCE(new_is_active, true),
      new_avatar_url
    );
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_profile_admin(uuid, text, text, text, boolean, text) TO authenticated;

-- Function to deactivate user (soft delete by setting is_active = false)
-- This prevents user from logging in but preserves data
CREATE OR REPLACE FUNCTION public.deactivate_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role
  FROM public.user_profiles
  WHERE user_id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can deactivate users';
  END IF;
  
  -- Prevent deactivating yourself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot deactivate your own account';
  END IF;
  
  -- Set is_active to false
  UPDATE public.user_profiles
  SET is_active = false, updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- If profile doesn't exist, create it with is_active = false
  IF NOT FOUND THEN
    INSERT INTO public.user_profiles (user_id, role, is_active)
    VALUES (target_user_id, 'sales', false);
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.deactivate_user(uuid) TO authenticated;
```

#### 1.2 RLS Policy Updates

**Opret migration:** `supabase/migrations/YYYYMMDD_HHMMSS_user_management_rls.sql`

```sql
-- Ensure admins can update any user profile
DROP POLICY IF EXISTS "Admins can update any profile" ON public.user_profiles;
CREATE POLICY "Admins can update any profile"
  ON public.user_profiles FOR UPDATE
  USING (
    -- User can update own profile (existing policy)
    user_id = auth.uid()
    OR
    -- Admin can update any profile
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    -- User can update own profile (but not role)
    (user_id = auth.uid() AND role = (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()))
    OR
    -- Admin can update any profile including role
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### Fase 2: Services & API

#### 2.1 User Management Service

**Opret fil:** `src/services/userManagement.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { qk } from '@/lib/queryKeys';
import { z } from 'zod';
import type { UserRole } from '@/types/rbac';

// Schema for user with profile
export const UserWithProfileSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().nullable(),
  role: z.enum(['admin', 'manager', 'sales', 'support', 'viewer']),
  department: z.string().nullable(),
  is_active: z.boolean(),
  avatar_url: z.string().nullable(),
  created_at: z.string(),
  last_sign_in_at: z.string().nullable(),
});

export type UserWithProfile = z.infer<typeof UserWithProfileSchema>;

/**
 * Fetch all users with their profile information (admin only)
 */
export async function fetchAllUsersWithProfiles(): Promise<UserWithProfile[]> {
  try {
    const { data, error } = await supabase.rpc('get_all_users_with_profiles');

    if (error) {
      logger.error('Error fetching users with profiles:', error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return z.array(UserWithProfileSchema).parse(data || []);
  } catch (error) {
    logger.error('Error in fetchAllUsersWithProfiles:', error);
    throw error;
  }
}

/**
 * React Query hook to fetch all users with profiles
 */
export function useAllUsersWithProfiles() {
  return useQuery({
    queryKey: qk.usersWithProfiles(),
    queryFn: fetchAllUsersWithProfiles,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });
}

/**
 * Update user profile (admin only)
 */
export interface UpdateUserProfilePayload {
  user_id: string;
  role?: UserRole;
  full_name?: string | null;
  department?: string | null;
  is_active?: boolean;
  avatar_url?: string | null;
}

export async function updateUserProfileAdmin(
  payload: UpdateUserProfilePayload
): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_user_profile_admin', {
      target_user_id: payload.user_id,
      new_role: payload.role || null,
      new_full_name: payload.full_name ?? null,
      new_department: payload.department ?? null,
      new_is_active: payload.is_active ?? null,
      new_avatar_url: payload.avatar_url ?? null,
    });

    if (error) {
      logger.error('Error updating user profile:', error);
      throw new Error(`Failed to update user profile: ${error.message}`);
    }
  } catch (error) {
    logger.error('Error in updateUserProfileAdmin:', error);
    throw error;
  }
}

/**
 * React Query mutation to update user profile
 */
export function useUpdateUserProfileAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserProfileAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.usersWithProfiles() });
      queryClient.invalidateQueries({ queryKey: qk.users() });
    },
  });
}

/**
 * Deactivate a user (admin only)
 */
export async function deactivateUser(userId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('deactivate_user', {
      target_user_id: userId,
    });

    if (error) {
      logger.error('Error deactivating user:', error);
      throw new Error(`Failed to deactivate user: ${error.message}`);
    }
  } catch (error) {
    logger.error('Error in deactivateUser:', error);
    throw error;
  }
}

/**
 * React Query mutation to deactivate user
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.usersWithProfiles() });
      queryClient.invalidateQueries({ queryKey: qk.users() });
    },
  });
}

/**
 * Activate a user (admin only) - uses updateUserProfileAdmin
 */
export async function activateUser(userId: string): Promise<void> {
  return updateUserProfileAdmin({ user_id: userId, is_active: true });
}

/**
 * React Query mutation to activate user
 */
export function useActivateUser() {
  return useUpdateUserProfileAdmin();
}
```

#### 2.2 Update User Profile Service (for regular users)

**Opdater fil:** `src/services/userProfile.ts` (ny fil)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { qk } from '@/lib/queryKeys';
import { z } from 'zod';
import type { UserProfile } from '@/types/rbac';

/**
 * Update own user profile (users can update their own name, etc.)
 */
export interface UpdateOwnProfilePayload {
  full_name?: string | null;
  department?: string | null;
  avatar_url?: string | null;
}

export async function updateOwnProfile(
  payload: UpdateOwnProfilePayload
): Promise<UserProfile> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        full_name: payload.full_name ?? null,
        department: payload.department ?? null,
        avatar_url: payload.avatar_url ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating own profile:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    return data;
  } catch (error) {
    logger.error('Error in updateOwnProfile:', error);
    throw error;
  }
}

/**
 * React Query mutation to update own profile
 */
export function useUpdateOwnProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOwnProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_profile'] });
      queryClient.invalidateQueries({ queryKey: qk.users() });
    },
  });
}
```

#### 2.3 Update Query Keys

**Opdater fil:** `src/lib/queryKeys.ts`

```typescript
// Add to existing queryKeys object:
usersWithProfiles: () => ['users', 'with-profiles'] as const,
userProfile: () => ['user_profile'] as const,
```

### Fase 3: UI Komponenter

#### 3.1 Admin User Management Component

**Opret fil:** `src/components/settings/UserManagement.tsx`

```typescript
/**
 * User Management Component
 * 
 * Admin UI for managing all users in the system
 * - View all users with their roles and status
 * - Deactivate/activate users
 * - Change user roles
 * - Edit user details
 */

import { useState } from 'react';
import { useAllUsersWithProfiles, useUpdateUserProfileAdmin, useDeactivateUser, useActivateUser } from '@/services/userManagement';
import { USER_ROLES } from '@/types/rbac';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Edit, UserX, UserCheck, Shield, Mail, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserWithProfile } from '@/services/userManagement';
import type { UserRole } from '@/types/rbac';

export function UserManagement() {
  const { toast } = useToast();
  const { data: users = [], isLoading } = useAllUsersWithProfiles();
  const updateProfile = useUpdateUserProfileAdmin();
  const deactivateUser = useDeactivateUser();
  const activateUser = useActivateUser();

  const [editingUser, setEditingUser] = useState<UserWithProfile | null>(null);
  const [editFormData, setEditFormData] = useState({
    role: 'sales' as UserRole,
    full_name: '',
    department: '',
  });

  const handleEdit = (user: UserWithProfile) => {
    setEditingUser(user);
    setEditFormData({
      role: user.role,
      full_name: user.full_name || '',
      department: user.department || '',
    });
  };

  const handleSave = async () => {
    if (!editingUser) return;

    try {
      await updateProfile.mutateAsync({
        user_id: editingUser.user_id,
        role: editFormData.role,
        full_name: editFormData.full_name || null,
        department: editFormData.department || null,
      });

      toast({
        title: 'User updated',
        description: 'User profile has been updated successfully.',
      });

      setEditingUser(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  const handleDeactivate = async (user: UserWithProfile) => {
    if (!confirm(`Are you sure you want to deactivate ${user.full_name || user.email}?`)) {
      return;
    }

    try {
      await deactivateUser.mutateAsync(user.user_id);
      toast({
        title: 'User deactivated',
        description: 'User has been deactivated and cannot log in.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to deactivate user',
        variant: 'destructive',
      });
    }
  };

  const handleActivate = async (user: UserWithProfile) => {
    try {
      await activateUser.mutateAsync({ user_id: user.user_id, is_active: true });
      toast({
        title: 'User activated',
        description: 'User has been activated and can now log in.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to activate user',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage all users in your CRM. Deactivate users who have left, change roles, and update user information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">
                      {user.full_name || 'No name'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{USER_ROLES[user.role]}</Badge>
                    </TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.is_active ? 'default' : 'secondary'}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.last_sign_in_at ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(user.last_sign_in_at), 'MMM d, yyyy')}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.is_active ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivate(user)}
                            disabled={deactivateUser.isPending}
                          >
                            <UserX className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActivate(user)}
                            disabled={activateUser.isPending}
                          >
                            <UserCheck className="h-4 w-4 text-success" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role. Changes will take effect immediately.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={editingUser.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={editFormData.full_name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, full_name: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={editFormData.department}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, department: e.target.value })
                  }
                  placeholder="Sales, Support, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={editFormData.role}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, role: value as UserRole })
                  }
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(USER_ROLES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingUser(null)}
              disabled={updateProfile.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

#### 3.2 User Profile Settings Component

**Opret fil:** `src/components/settings/UserProfileSettings.tsx`

```typescript
/**
 * User Profile Settings Component
 * 
 * Allows users to update their own profile information
 * - Change full name
 * - Update department
 * - Change avatar URL (future: upload avatar)
 */

import { useState, useEffect } from 'react';
import { useRole } from '@/hooks/useRole';
import { useUpdateOwnProfile } from '@/services/userProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { User, Mail } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

export function UserProfileSettings() {
  const { toast } = useToast();
  const { profile, loading: profileLoading } = useRole();
  const { user } = useAuthStore();
  const updateProfile = useUpdateOwnProfile();

  const [formData, setFormData] = useState({
    full_name: '',
    department: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        department: profile.department || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateProfile.mutateAsync({
        full_name: formData.full_name || null,
        department: formData.department || null,
      });

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      });
    }
  };

  if (profileLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading profile...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Update your personal information. Changes will be visible to other users.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. Contact an administrator if you need to change your email.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="John Doe"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Your name as it appears to other users in the system.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
              placeholder="Sales, Support, Marketing, etc."
            />
            <p className="text-xs text-muted-foreground">
              Optional: Your department or team name.
            </p>
          </div>

          {profile && (
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={profile.role}
                  disabled
                  className="bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Your role cannot be changed. Contact an administrator if you need a role change.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

#### 3.3 Update Settings Page

**Opdater fil:** `src/pages/settings/SettingsPage.tsx`

```typescript
// Add imports
import { UserManagement } from '@/components/settings/UserManagement';
import { UserProfileSettings } from '@/components/settings/UserProfileSettings';

// In the TabsContent for "users" tab, replace UserInvitations with:
<Can role="admin">
  <TabsContent value="users" className="space-y-6">
    <UserManagement />
    <UserInvitations />
  </TabsContent>
</Can>

// Add new "Profile" tab (before "Security" tab):
<TabsTrigger value="profile">Profile</TabsTrigger>

// Add TabsContent for profile:
<TabsContent value="profile" className="space-y-6">
  <UserProfileSettings />
</TabsContent>
```

### Fase 4: Testing & Verifikation

#### 4.1 Test Cases

**Admin User Management:**
- [ ] Admin can view all users
- [ ] Admin can edit user name, department, and role
- [ ] Admin can deactivate a user
- [ ] Admin can activate a deactivated user
- [ ] Admin cannot deactivate themselves
- [ ] Non-admin users cannot access user management
- [ ] Changes reflect immediately in UI

**User Profile Settings:**
- [ ] User can view their own profile
- [ ] User can update their own name
- [ ] User can update their department
- [ ] User cannot change their role
- [ ] User cannot change their email
- [ ] Changes are saved and reflected in UI
- [ ] Other users see updated name in assignee dropdowns

#### 4.2 Edge Cases

- [ ] Handle users without profiles (create profile on first access)
- [ ] Handle users with null/empty names
- [ ] Prevent admin from deactivating last admin
- [ ] Validate role changes don't break permissions
- [ ] Handle concurrent updates gracefully

### Fase 5: Dokumentation

#### 5.1 Update README

**Opdater fil:** `src/components/settings/README.md`

Tilføj dokumentation for de nye komponenter.

#### 5.2 User Guide

Opret en kort guide for admins om hvordan man håndterer brugere der stopper.

## Implementeringsrækkefølge

1. **Fase 1** - Database funktioner og RLS policies (kritisk - skal testes først)
2. **Fase 2** - Services og API hooks
3. **Fase 3** - UI komponenter
4. **Fase 4** - Testing
5. **Fase 5** - Dokumentation

## Noter

- Alle database funktioner bruger `SECURITY DEFINER` for at sikre korrekt adgangskontrol
- RLS policies sikrer at kun admins kan opdatere andre brugere
- Brugere kan kun opdatere deres egen profil (undtagen role)
- Deaktivering er "soft delete" - data bevares, men brugeren kan ikke logge ind
- Alle mutationer invalidater relevante queries for at sikre konsistent UI

## Fremtidige Forbedringer

- Avatar upload funktionalitet
- Bulk user operations
- User activity logging
- Email notifications ved rolleændringer
- Export user list
- Advanced user search and filtering

