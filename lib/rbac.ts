/**
 * Role-Based Access Control (RBAC) utilities
 */

export type UserRole = 'VIEWER' | 'EDITOR' | 'ADMIN';

export const rolePermissions = {
  VIEWER: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canManageUsers: false,
    canManageSettings: false,
  },
  EDITOR: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canManageUsers: false,
    canManageSettings: false,
  },
  ADMIN: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canManageUsers: true,
    canManageSettings: true,
  },
} as const;

export function hasPermission(role: UserRole | string | undefined, permission: keyof typeof rolePermissions.ADMIN): boolean {
  if (!role) return false;
  const userRole = role as UserRole;
  return rolePermissions[userRole]?.[permission] ?? false;
}

export function canAccess(userRole: UserRole | string | undefined, requiredRole: UserRole): boolean {
  if (!userRole) return false;
  
  const roleHierarchy: Record<UserRole, number> = {
    VIEWER: 1,
    EDITOR: 2,
    ADMIN: 3,
  };

  return (roleHierarchy[userRole as UserRole] ?? 0) >= (roleHierarchy[requiredRole] ?? 0);
}

