import type { DynamicMenuNode, User } from '../context/AuthContext';

/**
 * Recursively find the first accessible menu path from a dynamic menu tree.
 * Avoids returning '/admin/dashboard' when the user lacks 'dashboard_sekolah.view'
 * to strictly prevent redirect loops with PermissionRoute.
 */
function findFirstAccessibleMenuPath(
  nodes: DynamicMenuNode[] | null | undefined,
  permSet: Set<string>,
  disallowDashboard: boolean
): string | null {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return null;
  }

  for (const node of nodes) {
    if (!node) continue;

    const rawPath = typeof node.path === 'string' ? node.path.trim() : '';
    const cleanPath = rawPath.split('?')[0];
    const hasValidPath =
      rawPath.startsWith('/') &&
      cleanPath !== '/unauthorized' &&
      cleanPath !== '/login' &&
      (!disallowDashboard || cleanPath !== '/admin/dashboard');

    const permAllowed =
      !node.permission_key || permSet.has(node.permission_key);

    if (hasValidPath && permAllowed) {
      return rawPath;
    }

    // Even if parent node itself is not directly selectable, inspect children
    if (Array.isArray(node.children) && node.children.length > 0) {
      const childPath = findFirstAccessibleMenuPath(
        node.children,
        permSet,
        disallowDashboard
      );
      if (childPath) {
        return childPath;
      }
    }
  }

  return null;
}

/**
 * Determine the safe default landing route for an authenticated user based on
 * their role, dynamic menus, and permissions.
 *
 * - Guru & Siswa: always return their standard dashboards (unchanged).
 * - Super Admin: always returns '/super-admin/dashboard'.
 * - Admin Instansi: returns '/admin/dashboard' if user has 'dashboard_sekolah.view';
 *   otherwise returns the first accessible menu path (e.g. '/admin/exams' for Operator Ujian);
 *   if no accessible menu exists at all, returns '/unauthorized' (no redirect loop).
 */
export function getDefaultRouteForUser(
  user: Pick<User, 'role' | 'permissions' | 'roles'> | null | undefined,
  menus: DynamicMenuNode[] | null | undefined = [],
  permissions?: string[] | null
): string {
  if (!user) {
    return '/login';
  }

  // Guru & Siswa dashboards are strictly unchanged
  if (user.role === 'guru') {
    return '/teacher/dashboard';
  }
  if (user.role === 'siswa') {
    return '/student/dashboard';
  }
  if (user.role === 'super_admin' || user.roles?.includes('super_admin')) {
    return '/super-admin/dashboard';
  }
  if (user.role === 'pengawas') {
    return '/admin/proctoring';
  }

  if (user.role === 'admin') {
    const resolvedPerms = Array.isArray(permissions)
      ? permissions
      : Array.isArray(user.permissions)
      ? user.permissions
      : [];
    const permSet = new Set(resolvedPerms);

    // 1. Standard Admin Instansi dashboard if permitted
    if (permSet.has('dashboard_sekolah.view')) {
      return '/admin/dashboard';
    }

    // 2. First accessible dynamic menu (e.g., Operator Ujian -> /admin/exams)
    const firstMenuPath = findFirstAccessibleMenuPath(menus, permSet, true);
    if (firstMenuPath) {
      return firstMenuPath;
    }

    // 3. No accessible menu at all -> land on /unauthorized cleanly without loop
    return '/unauthorized';
  }

  return '/unauthorized';
}

