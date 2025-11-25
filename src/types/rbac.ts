/**
 * Role-Based Access Control (RBAC) Types
 * 
 * Defines user roles, permissions, and related types for CRMFlow
 */

// =========================================
// User Roles
// =========================================

export type UserRole = 'admin' | 'manager' | 'sales' | 'support' | 'viewer';

export const USER_ROLES: Record<UserRole, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  sales: 'Sales Representative',
  support: 'Support',
  viewer: 'Viewer'
};

export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Full system access including user management and settings',
  manager: 'Can view all data and manage team resources',
  sales: 'Can manage own deals and create companies/contacts',
  support: 'Can create and manage tasks, view-only for sales data',
  viewer: 'Read-only access to all data'
};

// =========================================
// User Profile
// =========================================

export interface UserProfile {
  user_id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =========================================
// Permissions
// =========================================

/**
 * System permissions mapped to specific actions
 */
export type Permission =
  // Companies
  | 'companies:view'
  | 'companies:create'
  | 'companies:update'
  | 'companies:delete'
  // People
  | 'people:view'
  | 'people:create'
  | 'people:update'
  | 'people:delete'
  // Deals
  | 'deals:view_all'
  | 'deals:view_own'
  | 'deals:create'
  | 'deals:update_all'
  | 'deals:update_own'
  | 'deals:delete'
  // Quotes
  | 'quotes:view'
  | 'quotes:create'
  | 'quotes:update'
  | 'quotes:delete'
  | 'quotes:send'
  // Orders
  | 'orders:view'
  | 'orders:create'
  | 'orders:update'
  | 'orders:delete'
  // Invoices
  | 'invoices:view'
  | 'invoices:create'
  | 'invoices:update'
  | 'invoices:delete'
  | 'invoices:send'
  // Tasks
  | 'tasks:view_all'
  | 'tasks:view_assigned'
  | 'tasks:create'
  | 'tasks:update_all'
  | 'tasks:update_own'
  | 'tasks:delete_all'
  | 'tasks:delete_own'
  // Documents
  | 'documents:view'
  | 'documents:upload'
  | 'documents:delete_all'
  | 'documents:delete_own'
  // System
  | 'settings:view'
  | 'settings:update'
  | 'pipelines:view'
  | 'pipelines:manage'
  | 'stages:view'
  | 'stages:manage'
  | 'users:view'
  | 'users:manage'
  // Reports
  | 'reports:view'
  | 'reports:export';

/**
 * Permissions per role
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Companies
    'companies:view',
    'companies:create',
    'companies:update',
    'companies:delete',
    // People
    'people:view',
    'people:create',
    'people:update',
    'people:delete',
    // Deals
    'deals:view_all',
    'deals:create',
    'deals:update_all',
    'deals:delete',
    // Quotes
    'quotes:view',
    'quotes:create',
    'quotes:update',
    'quotes:delete',
    'quotes:send',
    // Orders
    'orders:view',
    'orders:create',
    'orders:update',
    'orders:delete',
    // Invoices
    'invoices:view',
    'invoices:create',
    'invoices:update',
    'invoices:delete',
    'invoices:send',
    // Tasks
    'tasks:view_all',
    'tasks:create',
    'tasks:update_all',
    'tasks:delete_all',
    // Documents
    'documents:view',
    'documents:upload',
    'documents:delete_all',
    // System
    'settings:view',
    'settings:update',
    'pipelines:view',
    'pipelines:manage',
    'stages:view',
    'stages:manage',
    'users:view',
    'users:manage',
    // Reports
    'reports:view',
    'reports:export'
  ],
  manager: [
    // Companies
    'companies:view',
    'companies:create',
    'companies:update',
    'companies:delete',
    // People
    'people:view',
    'people:create',
    'people:update',
    'people:delete',
    // Deals
    'deals:view_all',
    'deals:create',
    'deals:update_all',
    'deals:delete',
    // Quotes
    'quotes:view',
    'quotes:create',
    'quotes:update',
    'quotes:delete',
    'quotes:send',
    // Orders
    'orders:view',
    'orders:create',
    'orders:update',
    'orders:delete',
    // Invoices
    'invoices:view',
    'invoices:create',
    'invoices:update',
    'invoices:delete',
    'invoices:send',
    // Tasks
    'tasks:view_all',
    'tasks:create',
    'tasks:update_all',
    'tasks:delete_all',
    // Documents
    'documents:view',
    'documents:upload',
    'documents:delete_all',
    // System
    'settings:view',
    'pipelines:view',
    'pipelines:manage',
    'stages:view',
    'stages:manage',
    'users:view',
    // Reports
    'reports:view',
    'reports:export'
  ],
  sales: [
    // Companies
    'companies:view',
    'companies:create',
    'companies:update',
    // People
    'people:view',
    'people:create',
    'people:update',
    // Deals
    'deals:view_own', // Only see own deals
    'deals:create',
    'deals:update_own', // Only update own deals
    // Quotes
    'quotes:view',
    'quotes:create',
    'quotes:update',
    'quotes:send',
    // Orders
    'orders:view',
    'orders:create',
    'orders:update',
    // Invoices
    'invoices:view',
    'invoices:create',
    'invoices:update',
    'invoices:send',
    // Tasks
    'tasks:view_assigned',
    'tasks:create',
    'tasks:update_own',
    'tasks:delete_own',
    // Documents
    'documents:view',
    'documents:upload',
    'documents:delete_own',
    // System
    'settings:view',
    'pipelines:view',
    'stages:view',
    'users:view',
    // Reports
    'reports:view'
  ],
  support: [
    // Companies
    'companies:view',
    // People
    'people:view',
    // Deals
    'deals:view_all',
    // Quotes
    'quotes:view',
    // Orders
    'orders:view',
    // Invoices
    'invoices:view',
    // Tasks
    'tasks:view_assigned',
    'tasks:create',
    'tasks:update_own',
    'tasks:delete_own',
    // Documents
    'documents:view',
    'documents:upload',
    // System
    'settings:view',
    'pipelines:view',
    'stages:view',
    'users:view',
    // Reports
    'reports:view'
  ],
  viewer: [
    // Companies
    'companies:view',
    // People
    'people:view',
    // Deals
    'deals:view_all',
    // Quotes
    'quotes:view',
    // Orders
    'orders:view',
    // Invoices
    'invoices:view',
    // Tasks
    'tasks:view_all',
    // Documents
    'documents:view',
    // System
    'settings:view',
    'pipelines:view',
    'stages:view',
    'users:view',
    // Reports
    'reports:view'
  ]
};

// =========================================
// Helper Functions
// =========================================

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}

/**
 * Check if user role is admin or manager (commonly used check)
 */
export function isAdminOrManager(role: UserRole | null): boolean {
  return role === 'admin' || role === 'manager';
}

/**
 * Check if user can modify entity (admin/manager)
 */
export function canModify(role: UserRole | null): boolean {
  return role === 'admin' || role === 'manager';
}

/**
 * Check if user can delete entity (admin/manager)
 */
export function canDelete(role: UserRole | null): boolean {
  return role === 'admin' || role === 'manager';
}

// =========================================
// Database Types (for Supabase)
// =========================================

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProfile, 'user_id'>>;
      };
    };
    Enums: {
      user_role: UserRole;
    };
  };
}


