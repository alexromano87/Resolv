// apps/frontend/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import { useToast } from '../components/ui/ToastProvider';
import type { User, LoginDto, RegisterDto, AuthResponse, LoginResponse } from '../api/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (loginDto: LoginDto) => Promise<LoginResponse>;
  register: (registerDto: RegisterDto) => Promise<User>;
  setSession: (auth: AuthResponse) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';
const LAST_ACTIVITY_KEY = 'auth_last_activity';
const INACTIVITY_FLAG_KEY = 'auth_inactivity_logout';
const INACTIVITY_LIMIT_MS = 2 * 60 * 60 * 1000;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const logoutTimerRef = React.useRef<number | null>(null);
  const { info } = useToast();

  const clearSession = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    if (logoutTimerRef.current) {
      window.clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  };

  const scheduleInactivityLogout = () => {
    if (logoutTimerRef.current) {
      window.clearTimeout(logoutTimerRef.current);
    }
    const lastActivity =
      Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0) || Date.now();
    const elapsed = Date.now() - lastActivity;
    const remaining = INACTIVITY_LIMIT_MS - elapsed;
    if (remaining <= 0) {
      localStorage.setItem(INACTIVITY_FLAG_KEY, '1');
      info('Sessione terminata per inattività', 'Sei stato disconnesso');
      clearSession();
      return;
    }
    logoutTimerRef.current = window.setTimeout(() => {
      localStorage.setItem(INACTIVITY_FLAG_KEY, '1');
      info('Sessione terminata per inattività', 'Sei stato disconnesso');
      clearSession();
    }, remaining);
  };

  useEffect(() => {
    // Carica token e user da localStorage all'avvio
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    if (savedToken && savedUser) {
      const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
      if (!lastActivity || Date.now() - lastActivity > INACTIVITY_LIMIT_MS) {
        localStorage.setItem(INACTIVITY_FLAG_KEY, '1');
        clearSession();
        setIsLoading(false);
        return;
      }

      setToken(savedToken);
      setUser(JSON.parse(savedUser));

      // Verifica validità del token (opzionale, per aggiornare i dati)
      authApi.getCurrentUser()
        .then(currentUser => {
          setUser(currentUser);
          localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        })
        .catch((error) => {
          console.warn('Token validation failed:', error);
          // Token non valido, pulisci tutto
          clearSession();
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const setSession = (auth: AuthResponse) => {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    setToken(auth.access_token);
    setUser(auth.user);
    localStorage.setItem(TOKEN_KEY, auth.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
    if (auth.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, auth.refresh_token);
    }
  };

  const login = async (loginDto: LoginDto): Promise<LoginResponse> => {
    const response = await authApi.login(loginDto);
    if ('access_token' in response) {
      setSession(response);
    }
    return response;
  };

  const register = async (registerDto: RegisterDto): Promise<User> => {
    const response = await authApi.register(registerDto);
    setSession(response);
    return response.user;
  };

  const logout = () => {
    clearSession();
  };

  useEffect(() => {
    if (!token || !user) return;
    const updateActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      scheduleInactivityLogout();
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, updateActivity, { passive: true }));
    scheduleInactivityLogout();

    return () => {
      events.forEach((event) => window.removeEventListener(event, updateActivity));
      if (logoutTimerRef.current) {
        window.clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    };
  }, [token, user]);

  useEffect(() => {
    const flagged = localStorage.getItem(INACTIVITY_FLAG_KEY);
    if (flagged) {
      localStorage.removeItem(INACTIVITY_FLAG_KEY);
      info('Sessione terminata per inattività', 'Sei stato disconnesso');
    }
  }, [info]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        setSession,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
