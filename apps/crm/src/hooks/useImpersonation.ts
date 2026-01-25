// app/hooks/useImpersonation.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

interface ImpersonationStatus {
  isBeingImpersonated: boolean;
  impersonatedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  isImpersonating: boolean;
  impersonatingUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  impersonationId: string | null;
  startedAt?: string;
}

interface UseImpersonationReturn {
  status: ImpersonationStatus | null;
  loading: boolean;
  error: string | null;
  startImpersonation: (targetUserId: string, reason?: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export function useImpersonation(): UseImpersonationReturn {
  const [status, setStatus] = useState<ImpersonationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/impersonate/status');
      const contentType = response.headers.get('content-type') || '';

      if (!response.ok || !contentType.includes('application/json')) {
        // Not authenticated or non-JSON response - treat as not impersonating
        setStatus({
          isBeingImpersonated: false,
          impersonatedBy: null,
          isImpersonating: false,
          impersonatingUser: null,
          impersonationId: null,
        });
        return;
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      // On any error, assume not impersonating rather than throwing
      setStatus({
        isBeingImpersonated: false,
        impersonatedBy: null,
        isImpersonating: false,
        impersonatingUser: null,
        impersonationId: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const startImpersonation = useCallback(async (targetUserId: string, reason?: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/impersonate/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId,
          reason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start impersonation');
      }

      // Refresh status after starting
      await refreshStatus();
      
      // Reload page to reflect new user context
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
      throw err;
    }
  }, [refreshStatus]);

  const stopImpersonation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/impersonate/stop', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to stop impersonation');
      }

      // Refresh status after stopping
      await refreshStatus();
      
      // Reload page to reflect original user context
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
      throw err;
    }
  }, [refreshStatus]);

  // Load initial status
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return {
    status,
    loading,
    error,
    startImpersonation,
    stopImpersonation,
    refreshStatus,
  };
}
