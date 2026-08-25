import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { authApi, CheckupUser, MembershipSummary } from '../api/auth';
import { setAccessToken, setLogoutCallback } from '../api/config';

const LAST_ACTIVITY_KEY = 'checkup_last_activity';
const INACTIVITY_FLAG_KEY = 'checkup_inactivity_logout';
const INACTIVITY_LIMIT_MS = 2 * 60 * 60 * 1000; // 2 ore

interface AuthContextType {
  user: CheckupUser | null;
  token: string | null; // kept for legacy consumers that just check truthiness
  loading: boolean;
  /** Appartenenze (contesti) disponibili per l'utente autenticato. */
  memberships: MembershipSummary[];
  /** Id dell'appartenenza attiva (contesto corrente). */
  activeMembershipId: string | null;
  login: (email: string, password: string) => Promise<void>;
  setSession: (
    token: string,
    user: CheckupUser,
    memberships?: MembershipSummary[],
    activeMembershipId?: string | null,
  ) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Cambia il contesto attivo e ricarica la sessione. */
  switchContext: (membershipId: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CheckupUser | null>(null);
  const [memberships, setMemberships] = useState<MembershipSummary[]>([]);
  const [activeMembershipId, setActiveMembershipId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const logoutRef = useRef<() => void>(() => {});
  const inactivityTimerRef = useRef<number | null>(null);

  // ── logout implementation (stable reference via ref) ──────────────────────
  const logout = useCallback(() => {
    authApi.logout(); // fire-and-forget — clears httpOnly cookie server-side
    setToken(null);
    setUser(null);
    setMemberships([]);
    setActiveMembershipId(null);
    setAccessToken(null);
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

  // ── Restore session via httpOnly refresh cookie on page load ──────────────
  useEffect(() => {
    // If previously inactive beyond limit, clear and show login
    const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
    if (lastActivity && Date.now() - lastActivity > INACTIVITY_LIMIT_MS) {
      localStorage.setItem(INACTIVITY_FLAG_KEY, '1');
      setToken(null);
      setUser(null);
      setAccessToken(null);
      setLoading(false);
      return;
    }

    authApi.refresh()
      .then((res) => {
        setToken(res.access_token);
        setAccessToken(res.access_token);
        return authApi.getProfile();
      })
      .then((profile) => {
        setUser(profile);
        setMemberships(profile.memberships ?? []);
        setActiveMembershipId(profile.activeMembershipId ?? null);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : '';
        const isAuthFailure = /credenziali non valide|refresh_token mancante|sessione scaduta/i.test(message);
        if (isAuthFailure) {
          setToken(null);
          setUser(null);
          setAccessToken(null);
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
      setMemberships(res.memberships ?? []);
      setActiveMembershipId(res.activeMembershipId ?? null);
      setAccessToken(res.access_token);
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }
  }, []);

  const setSession = useCallback((
    accessToken: string,
    userData: CheckupUser,
    membershipList?: MembershipSummary[],
    activeId?: string | null,
  ) => {
    setToken(accessToken);
    setUser(userData);
    if (membershipList !== undefined) setMemberships(membershipList);
    if (activeId !== undefined) setActiveMembershipId(activeId);
    setAccessToken(accessToken);
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const res = await authApi.changePassword(currentPassword, newPassword);
    setToken(res.access_token);
    setUser(res.user);
    setMemberships(res.memberships ?? []);
    setActiveMembershipId(res.activeMembershipId ?? null);
    setAccessToken(res.access_token);
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await authApi.getProfile();
    setUser(profile);
    setMemberships(profile.memberships ?? []);
    setActiveMembershipId(profile.activeMembershipId ?? null);
  }, []);

  const switchContext = useCallback(async (membershipId: string) => {
    const res = await authApi.switchContext(membershipId);
    setToken(res.access_token);
    setUser(res.user);
    setMemberships(res.memberships ?? []);
    setActiveMembershipId(res.activeMembershipId ?? null);
    setAccessToken(res.access_token);
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      memberships,
      activeMembershipId,
      login,
      setSession,
      changePassword,
      refreshProfile,
      switchContext,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
