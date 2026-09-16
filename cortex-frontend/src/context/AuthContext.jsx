import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem('cortex_access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.me();
      setUser(data.data);
    } catch {
      localStorage.removeItem('cortex_access_token');
      localStorage.removeItem('cortex_refresh_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem('cortex_access_token', data.data.accessToken);
    localStorage.setItem('cortex_refresh_token', data.data.refreshToken);
    await loadMe();
    return data.data;
  };

  const register = async (payload) => {
    const { data } = await authApi.register(payload);
    localStorage.setItem('cortex_access_token', data.data.accessToken);
    localStorage.setItem('cortex_refresh_token', data.data.refreshToken);
    await loadMe();
    return data.data;
  };

  const logout = () => {
    localStorage.removeItem('cortex_access_token');
    localStorage.removeItem('cortex_refresh_token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refetchUser: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
