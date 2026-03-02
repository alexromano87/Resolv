import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { authApi, CheckupUser } from '../api/auth';
import { setAccessToken, setLogoutCallback } from '../api/config';

interface AuthContextType {
  user: CheckupUser | null;
  token: string | null; // kept for legacy consumers that just check truthiness
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  setSession: (token: string, refreshToken: string, user: CheckupUser) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Access token lives ONLY in React state + api/config.ts memory (never localStorage)
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CheckupUser | null>(() => {
    try {
      const stored = localStorage.getItem('checkup_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const logoutRef = useRef<() => void>(() => {});

  // ── logout implementation (stable reference via ref) ──────────────────────
  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem('checkup_refresh_token');
    if (refreshToken) {
      authApi.logout(refreshToken); // fire-and-forget — server blacklists the token
    }
    setToken(null);
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('checkup_refresh_token');
    localStorage.removeItem('checkup_user');
    window.location.href = '/checkup/login';
  }, []);

  // Keep ref in sync so config.ts can call it on 401 without stale closure
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  // Register logout callback in config module once on mount
  useEffect(() => {
    setLogoutCallback(() => logoutRef.current());
  }, []);

  // ── Restore session from refresh token on page load ───────────────────────
  useEffect(() => {
    const refreshToken = localStorage.getItem('checkup_refresh_token');
    if (!refreshToken) {
      setLoading(false);
      return;
    }

    authApi.refresh(refreshToken)
      .then((res) => {
        setToken(res.access_token);
        setAccessToken(res.access_token);
        localStorage.setItem('checkup_refresh_token', res.refresh_token);
        // Refresh profile in background (user data from localStorage may be stale)
        return authApi.getProfile();
      })
      .then((profile) => {
        setUser(profile);
        localStorage.setItem('checkup_user', JSON.stringify(profile));
      })
      .catch(() => {
        // Refresh token invalid or expired → clear and show login
        setToken(null);
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem('checkup_refresh_token');
        localStorage.removeItem('checkup_user');
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth actions ──────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    if ('access_token' in res) {
      setToken(res.access_token);
      setUser(res.user);
      setAccessToken(res.access_token);
      localStorage.setItem('checkup_refresh_token', res.refresh_token);
      localStorage.setItem('checkup_user', JSON.stringify(res.user));
    }
  }, []);

  const setSession = useCallback((accessToken: string, refreshToken: string, userData: CheckupUser) => {
    setToken(accessToken);
    setUser(userData);
    setAccessToken(accessToken);
    localStorage.setItem('checkup_refresh_token', refreshToken);
    localStorage.setItem('checkup_user', JSON.stringify(userData));
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const res = await authApi.changePassword(currentPassword, newPassword);
    setToken(res.access_token);
    setUser(res.user);
    setAccessToken(res.access_token);
    localStorage.setItem('checkup_refresh_token', res.refresh_token);
    localStorage.setItem('checkup_user', JSON.stringify(res.user));
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await authApi.getProfile();
    setUser(profile);
    localStorage.setItem('checkup_user', JSON.stringify(profile));
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
