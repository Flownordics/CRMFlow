/**
 * Can Component
 * 
 * Conditionally renders children based on user permissions or roles
 * 
 * Usage:
 * ```tsx
 * <Can permission="companies:delete">
 *   <Button>Delete Company</Button>
 * </Can>
 * 
 * <Can role={['admin', 'manager']}>
 *   <AdvancedSettings />
 * </Can>
 * 
 * <Can permission="deals:update_all" fallback={<span>No access</span>}>
 *   <EditForm />
 * </Can>
 * ```
 */

import { PropsWithChildren } from 'react';
import { useRole } from '@/hooks/useRole';
import type { Permission, UserRole } from '@/types/rbac';

export interface CanProps extends PropsWithChildren {
  /**
   * Required permission to view content
   */
  permission?: Permission;
  
  /**
   * Required role(s) to view content
   */
  role?: UserRole | UserRole[];
  
  /**
   * Content to show when permission/role check fails
   */
  fallback?: React.ReactNode;
  
  /**
   * Additional condition that must be true
   */
  condition?: boolean;
}

export function Can({ 
  permission, 
  role, 
  fallback = null, 
  condition = true,
  children 
}: CanProps) {
  const { hasPermission, hasRole } = useRole();

  // Check permission
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // Check role
  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!hasRole(...roles)) {
      return <>{fallback}</>;
    }
  }

  // Check additional condition
  if (!condition) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}


