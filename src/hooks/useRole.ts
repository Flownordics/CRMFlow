/**
 * useRole Hook
 * 
 * Provides access to the current user's role and permissions
 * 
 * Usage:
 * ```tsx
 * const { role, hasPermission, isAdmin } = useRole();
 * 
 * if (hasPermission('companies:delete')) {
 *   // Show delete button
 * }
 * ```
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/integrations/supabase/client';
import type { UserProfile, UserRole, Permission } from '@/types/rbac';
import { ROLE_PERMISSIONS } from '@/types/rbac';
import { logger } from '@/lib/logger';

export interface UseRoleReturn {
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isSales: boolean;
  isSupport: boolean;
  isViewer: boolean;
  canModify: boolean;
  canDelete: boolean;
  refetch: () => Promise<void>;
}

export function useRole(): UseRoleReturn {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        logger.error('Error fetching user profile:', fetchError);
        setError('Failed to load user profile');
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (err) {
      logger.error('Unexpected error fetching user profile:', err);
      setError('An unexpected error occurred');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isSales = role === 'sales';
  const isSupport = role === 'support';
  const isViewer = role === 'viewer';

  // Commonly used permission checks
  const canModify = isAdmin || isManager;
  const canDelete = isAdmin || isManager;

  return {
    profile,
    role,
    loading,
    error,
    hasPermission,
    hasRole,
    isAdmin,
    isManager,
    isSales,
    isSupport,
    isViewer,
    canModify,
    canDelete,
    refetch: fetchProfile
  };
}


