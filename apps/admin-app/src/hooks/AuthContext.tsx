import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

interface AuthState {
  authenticated: boolean;
  username: string | null;
  /** true when auth is not configured server-side (dev mode) */
  unconfigured: boolean;
  loading: boolean;
}

interface UseAuthResult extends AuthState {
  logout: () => Promise<void>;
  refetch: () => void;
}

const AuthContext = createContext<UseAuthResult | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    username: null,
    unconfigured: false,
    loading: true,
  });

  const fetchMe = useCallback(() => {
    setState(s => ({ ...s, loading: true }));
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async res => {
        if (res.status === 501) {
          setState({ authenticated: true, username: null, unconfigured: true, loading: false });
        } else if (res.ok) {
          const data = await res.json() as { username?: string };
          setState({ authenticated: true, username: data.username ?? null, unconfigured: false, loading: false });
        } else {
          setState({ authenticated: false, username: null, unconfigured: false, loading: false });
        }
      })
      .catch(() => {
        setState({ authenticated: false, username: null, unconfigured: false, loading: false });
      });
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setState({ authenticated: false, username: null, unconfigured: false, loading: false });
  }, []);

  const value: UseAuthResult = { ...state, logout, refetch: fetchMe };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): UseAuthResult {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
