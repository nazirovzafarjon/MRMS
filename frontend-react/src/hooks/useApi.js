import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createApiClient } from '../services/apiClient';

export function useApi() {
  const { user, logout } = useAuth();
  return useMemo(
    () => createApiClient(user?.token, logout),
    [user?.token, logout]
  );
}
