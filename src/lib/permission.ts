import { getCurrentUser, User } from './session';

export interface PermissionCheckResult {
  isLoggedIn: boolean;
  hasPermission: boolean;
  user: User | null;
}

export async function checkPermission(requiredRoles?: string[]): Promise<PermissionCheckResult> {
  const user = await getCurrentUser();
  
  if (!user) {
    return {
      isLoggedIn: false,
      hasPermission: false,
      user: null
    };
  }

  if (!requiredRoles || requiredRoles.length === 0) {
    return {
      isLoggedIn: true,
      hasPermission: true,
      user
    };
  }

  const userRoleTypes = user.roles.map(role => role.type);
  const hasPermission = requiredRoles.some(role => userRoleTypes.includes(role));

  return {
    isLoggedIn: true,
    hasPermission,
    user
  };
}

export function requireAdmin(): Promise<PermissionCheckResult> {
  return checkPermission(['admin', 'superadmin']);
}

export function requireSuperadmin(): Promise<PermissionCheckResult> {
  return checkPermission(['superadmin']);
}
