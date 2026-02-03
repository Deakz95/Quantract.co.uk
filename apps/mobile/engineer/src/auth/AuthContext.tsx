import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  apiPublicFetch,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  setForceLogoutHandler,
  apiFetch,
} from "../api/client";

type AuthState = {
  token: string | null;
  isLoading: boolean;
  isOnline: boolean | null; // null = not checked yet
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  token: null,
  isLoading: true,
  isOnline: null,
  login: async () => ({ ok: false }),
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  // Force logout handler (called by apiFetch when rotate fails)
  const forceLogout = useCallback(() => {
    setToken(null);
  }, []);

  useEffect(() => {
    setForceLogoutHandler(forceLogout);
  }, [forceLogout]);

  // Boot: health check (non-blocking) + token restore
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Health check — fire and forget, don't block auth
      apiPublicFetch("/api/health")
        .then((r) => {
          if (!cancelled) setIsOnline(r.ok);
        })
        .catch(() => {
          if (!cancelled) setIsOnline(false);
        });

      // Restore token
      const stored = await getStoredToken();
      if (!cancelled) {
        setToken(stored);
        setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiPublicFetch("/api/engineer/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        return { ok: false, error: data?.error || "Login failed" };
      }
      await setStoredToken(data.token);
      setToken(data.token);
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }, []);

  const logout = useCallback(async () => {
    const currentToken = await getStoredToken();
    if (currentToken) {
      // Best-effort revoke on server
      apiFetch("/api/engineer/auth/logout", { method: "POST" }).catch(() => {});
    }
    await clearStoredToken();
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isLoading, isOnline, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
