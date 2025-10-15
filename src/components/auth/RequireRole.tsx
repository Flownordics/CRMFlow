/**
 * RequireRole Component
 * 
 * Similar to ProtectedRoute but also checks for specific role(s)
 * Redirects unauthorized users
 * 
 * Usage:
 * ```tsx
 * <RequireRole role="admin">
 *   <AdminDashboard />
 * </RequireRole>
 * 
 * <RequireRole role={['admin', 'manager']}>
 *   <TeamSettings />
 * </RequireRole>
 * ```
 */

import { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useRole } from '@/hooks/useRole';
import type { UserRole } from '@/types/rbac';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export interface RequireRoleProps extends PropsWithChildren {
  role: UserRole | UserRole[];
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function RequireRole({ 
  role, 
  redirectTo = '/',
  fallback,
  children 
}: RequireRoleProps) {
  const { hasRole, loading, error } = useRole();

  // Loading state
  if (loading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}. Please refresh the page or contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check role
  const roles = Array.isArray(role) ? role : [role];
  if (!hasRole(...roles)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}


