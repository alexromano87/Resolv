import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi, CheckupUser } from '../api/auth';

interface AuthContextType {
  user: CheckupUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  setSession: (token: string, user: CheckupUser) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CheckupUser | null>(() => {
    const stored = localStorage.getItem('checkup_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('checkup_token'),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && !user) {
      setLoading(true);
      authApi.getProfile()
        .then((profile) => {
          setUser(profile);
          localStorage.setItem('checkup_user', JSON.stringify(profile));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    if ('access_token' in res) {
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem('checkup_token', res.access_token);
      localStorage.setItem('checkup_user', JSON.stringify(res.user));
    }
  }, []);

  const setSession = useCallback((accessToken: string, userData: CheckupUser) => {
    setToken(accessToken);
    setUser(userData);
    localStorage.setItem('checkup_token', accessToken);
    localStorage.setItem('checkup_user', JSON.stringify(userData));
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const res = await authApi.changePassword(currentPassword, newPassword);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('checkup_token', res.access_token);
    localStorage.setItem('checkup_user', JSON.stringify(res.user));
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await authApi.getProfile();
    setUser(profile);
    localStorage.setItem('checkup_user', JSON.stringify(profile));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('checkup_token');
    localStorage.removeItem('checkup_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, setSession, changePassword, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
