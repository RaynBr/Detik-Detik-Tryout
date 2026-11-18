import React from 'react';
import { usePermission, PermissionInput } from '../hooks/usePermission';

interface CanProps {
  /** Single key ("guru.create"), pipe/comma OR list ("guru.create|siswa.create"), or string array */
  perm: PermissionInput;
  /** Optional fallback content rendered when permission is denied */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Declarative RBAC permission gate for buttons, sections, and UI actions.
 * - Super Admin always passes.
 * - Supports OR logic across multiple permission keys.
 * - Safe fallback when permissions are not yet loaded (prevents flickering/missing buttons).
 */
export const Can: React.FC<CanProps> = ({ perm, fallback = null, children }) => {
  const { hasPermission } = usePermission();

  if (hasPermission(perm)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

