import { createContext, useCallback, useContext, useState } from 'react';
import { ROLE_MAP } from '../utils/permissions';

const AuthContext = createContext(null);

function readStoredUser() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  return {
    token,
    role:     localStorage.getItem('userRole') || 'Admin',
    username: localStorage.getItem('username') || 'User',
    doctorId: localStorage.getItem('doctorId') || null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const login = useCallback((data) => {
    const role = ROLE_MAP[data.role] || 'Admin';
    localStorage.setItem('token',    data.token);
    localStorage.setItem('userRole', role);
    localStorage.setItem('username', data.username);
    if (data.doctorId) localStorage.setItem('doctorId', data.doctorId);
    else               localStorage.removeItem('doctorId');
    setUser({ token: data.token, role, username: data.username, doctorId: data.doctorId || null });
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
