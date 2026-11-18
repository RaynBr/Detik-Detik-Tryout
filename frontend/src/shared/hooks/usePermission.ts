import { useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export type PermissionInput = string | string[] | null | undefined;

/**
 * Normalize permission input supporting single string, pipe/comma separated string, or array.
 * Uses OR logic (user needs at least one of the specified permission keys).
 */
export function normalizePermissions(perm: PermissionInput): string[] {
  if (!perm) return [];
  const rawList = Array.isArray(perm) ? perm : [perm];
  const keys: string[] = [];

  for (const item of rawList) {
    if (!item) continue;
    for (const part of item.split(/[|,]/)) {
      const cleaned = part.trim();
      if (cleaned) {
        keys.push(cleaned);
      }
    }
  }
  return keys;
}

export function usePermission() {
  const { user, roles, permissions, permissionsLoaded, isLoading } = useAuth();

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    return user.role === 'super_admin' || roles.includes('super_admin');
  }, [user, roles]);

  /**
   * Check whether the current user has at least one of the required permissions (OR logic).
   * - Super Admin always returns true.
   * - Safe fallback: while permissions are still loading or empty (shadow/unmigrated state),
   *   returns true so existing UI actions and routes are never unexpectedly broken.
   */
  const hasPermission = useCallback(
    (perm: PermissionInput): boolean => {
      if (!user) return false;
      if (isSuperAdmin) return true;

      const requiredKeys = normalizePermissions(perm);
      if (requiredKeys.length === 0) return true;

      // Safe fallback when permissions haven't been loaded or are empty
      if (isLoading || !permissionsLoaded || permissions.length === 0) {
        return true;
      }

      return requiredKeys.some((key) => permissions.includes(key));
    },
    [user, isSuperAdmin, isLoading, permissionsLoaded, permissions]
  );

  return {
    hasPermission,
    permissions,
    roles,
    isSuperAdmin,
    permissionsLoaded,
  };
}

