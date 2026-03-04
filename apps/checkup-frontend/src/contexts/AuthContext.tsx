import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { authApi, CheckupUser } from '../api/auth';
import { setAccessToken, setLogoutCallback } from '../api/config';

const LAST_ACTIVITY_KEY = 'checkup_last_activity';
const INACTIVITY_FLAG_KEY = 'checkup_inactivity_logout';
const INACTIVITY_LIMIT_MS = 2 * 60 * 60 * 1000; // 2 ore

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
  // Access token is cached in memory and localStorage for refresh resilience
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem('checkup_access_token');
    return stored || null;
  });
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
  const inactivityTimerRef = useRef<number | null>(null);

  // ── logout implementation (stable reference via ref) ──────────────────────
  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem('checkup_refresh_token');
    if (refreshToken) {
      authApi.logout(refreshToken); // fire-and-forget — server blacklists the token
    }
    setToken(null);
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('checkup_access_token');
    localStorage.removeItem('checkup_refresh_token');
    localStorage.removeItem('checkup_user');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
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

  // ── Inactivity auto-logout ─────────────────────────────────────────────────
  const scheduleInactivityLogout = useCallback(() => {
    if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
    const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0) || Date.now();
    const elapsed = Date.now() - lastActivity;
    const remaining = INACTIVITY_LIMIT_MS - elapsed;
    if (remaining <= 0) {
      localStorage.setItem(INACTIVITY_FLAG_KEY, '1');
      logoutRef.current();
      return;
    }
    inactivityTimerRef.current = window.setTimeout(() => {
      localStorage.setItem(INACTIVITY_FLAG_KEY, '1');
      logoutRef.current();
    }, remaining);
  }, []);

  useEffect(() => {
    if (!token || !user) return;
    const updateActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      scheduleInactivityLogout();
    };
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));
    scheduleInactivityLogout();
    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity));
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [token, user, scheduleInactivityLogout]);

  // ── Restore session from refresh token on page load ───────────────────────
  useEffect(() => {
    const refreshToken = localStorage.getItem('checkup_refresh_token');
    if (!refreshToken) {
      setLoading(false);
      return;
    }

    // Se c'è un refresh token ma l'utente era inattivo da troppo tempo → non ripristinare
    const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
    if (lastActivity && Date.now() - lastActivity > INACTIVITY_LIMIT_MS) {
      localStorage.setItem(INACTIVITY_FLAG_KEY, '1');
      localStorage.removeItem('checkup_access_token');
      localStorage.removeItem('checkup_refresh_token');
      localStorage.removeItem('checkup_user');
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      setToken(null);
      setUser(null);
      setAccessToken(null);
      setLoading(false);
      return;
    }

    authApi.refresh(refreshToken)
      .then((res) => {
        setToken(res.access_token);
        setAccessToken(res.access_token);
        localStorage.setItem('checkup_access_token', res.access_token);
        localStorage.setItem('checkup_refresh_token', res.refresh_token);
        // Refresh profile in background (user data from localStorage may be stale)
        return authApi.getProfile();
      })
      .then((profile) => {
        setUser(profile);
        localStorage.setItem('checkup_user', JSON.stringify(profile));
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : '';
        const isAuthFailure = /credenziali non valide|refresh_token mancante|sessione scaduta/i.test(message);
        if (isAuthFailure) {
          // Refresh token invalid or expired → clear and show login
          setToken(null);
          setUser(null);
          setAccessToken(null);
          localStorage.removeItem('checkup_access_token');
          localStorage.removeItem('checkup_refresh_token');
          localStorage.removeItem('checkup_user');
        }
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
      localStorage.setItem('checkup_access_token', res.access_token);
      localStorage.setItem('checkup_refresh_token', res.refresh_token);
      localStorage.setItem('checkup_user', JSON.stringify(res.user));
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }
  }, []);

  const setSession = useCallback((accessToken: string, refreshToken: string, userData: CheckupUser) => {
    setToken(accessToken);
    setUser(userData);
    setAccessToken(accessToken);
    localStorage.setItem('checkup_access_token', accessToken);
    localStorage.setItem('checkup_refresh_token', refreshToken);
    localStorage.setItem('checkup_user', JSON.stringify(userData));
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const res = await authApi.changePassword(currentPassword, newPassword);
    setToken(res.access_token);
    setUser(res.user);
    setAccessToken(res.access_token);
    localStorage.setItem('checkup_access_token', res.access_token);
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
