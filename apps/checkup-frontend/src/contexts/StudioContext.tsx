import { createContext, useCallback, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { studiosApi } from '../api/studios';
import { useAuth } from './AuthContext';

interface StudioBranding {
  logoUrl: string | null;
  nome: string | null;
  refresh: () => void;
}

const StudioContext = createContext<StudioBranding>({ logoUrl: null, nome: null, refresh: () => {} });

export function StudioProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [branding, setBranding] = useState<StudioBranding & { refresh: () => void }>({
    logoUrl: null,
    nome: null,
    refresh: () => {},
  });
  const refreshKeyRef = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    refreshKeyRef.current += 1;
    setRefreshKey(refreshKeyRef.current);
  }, []);

  useEffect(() => {
    // Wait for auth bootstrap to complete before making API calls.
    // This prevents race conditions where StudioProvider fires before
    // AuthProvider has finished restoring the session.
    if (loading) return;

    if (!user) {
      setBranding((p) => ({ ...p, logoUrl: null, nome: null, refresh }));
      return;
    }
    if (user.ruolo !== 'cliente') {
      studiosApi.getMyStudio()
        .then((res) => {
          setBranding((p) => ({ ...p, logoUrl: res.studio.logoUrl ?? null, nome: res.studio.nome ?? null, refresh }));
        })
        .catch(() => {});
    } else {
      setBranding((p) => ({
        ...p,
        logoUrl: user.client?.logoUrl ?? null,
        nome: user.client?.ragioneSociale ?? user.azienda ?? user.clientNome ?? user.client?.nome ?? null,
        refresh,
      }));
    }
  }, [user, refreshKey, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Attach refresh to context value (stable ref)
  const value: StudioBranding = { logoUrl: branding.logoUrl, nome: branding.nome, refresh };

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  return useContext(StudioContext);
}
