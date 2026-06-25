import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { can as checkPermission } from '../utils/permissions';

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role || 'Admin';

  const can = useCallback(
    (module, action) => checkPermission(module, action, role),
    [role]
  );

  return { can, role };
}
