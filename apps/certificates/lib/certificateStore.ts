import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useState, useEffect } from 'react';
import {
  deriveLifecycleState,
  toOfflineStatus,
  getStateInfo,
  isEditable,
  type LifecycleState,
  type LifecycleStateInfo,
} from '@quantract/shared/certificate-types';

export type CertificateStatus = 'draft' | 'in_progress' | 'complete' | 'issued';
export type CertificateType = 'EIC' | 'EICR' | 'MWC' | 'FIRE' | 'EML';

export interface StoredCertificate {
  id: string;
  certificate_number: string;
  certificate_type: CertificateType;
  status: CertificateStatus;
  client_name?: string;
  client_address?: string;
  installation_address?: string;
  created_at: string;
  updated_at: string;
  data: Record<string, unknown>;
}

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  certificateId: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

interface CertificateStore {
  certificates: StoredCertificate[];
  syncQueue: SyncQueueItem[];
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  addCertificate: (cert: StoredCertificate) => void;
  updateCertificate: (id: string, data: Partial<StoredCertificate>) => void;
  deleteCertificate: (id: string) => void;
  getCertificate: (id: string) => StoredCertificate | undefined;
  pushToSync: (certificateId: string, action: 'create' | 'update' | 'delete') => void;
  clearSyncItem: (id: string) => void;
  getSyncQueueLength: () => number;
}

export const useCertificateStore = create<CertificateStore>()(
  persist(
    (set, get) => ({
      certificates: [],
      syncQueue: [],
      _hasHydrated: false,

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      addCertificate: (cert) =>
        set((state) => ({
          certificates: [cert, ...state.certificates],
          syncQueue: [
            ...state.syncQueue,
            {
              id: crypto.randomUUID(),
              action: 'create' as const,
              certificateId: cert.id,
              data: cert.data,
              timestamp: new Date().toISOString(),
            },
          ],
        })),

      updateCertificate: (id, data) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === id
              ? { ...c, ...data, updated_at: new Date().toISOString() }
              : c
          ),
          syncQueue: [
            ...state.syncQueue,
            {
              id: crypto.randomUUID(),
              action: 'update' as const,
              certificateId: id,
              data: data as Record<string, unknown>,
              timestamp: new Date().toISOString(),
            },
          ],
        })),

      deleteCertificate: (id) =>
        set((state) => ({
          certificates: state.certificates.filter((c) => c.id !== id),
          syncQueue: [
            ...state.syncQueue,
            {
              id: crypto.randomUUID(),
              action: 'delete' as const,
              certificateId: id,
              timestamp: new Date().toISOString(),
            },
          ],
        })),

      getCertificate: (id) => get().certificates.find((c) => c.id === id),

      pushToSync: (certificateId, action) =>
        set((state) => ({
          syncQueue: [
            ...state.syncQueue,
            {
              id: crypto.randomUUID(),
              action,
              certificateId,
              timestamp: new Date().toISOString(),
            },
          ],
        })),

      clearSyncItem: (id) =>
        set((state) => ({
          syncQueue: state.syncQueue.filter((item) => item.id !== id),
        })),

      getSyncQueueLength: () => get().syncQueue.length,
    }),
    {
      name: 'quantract-certificates-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Hook to check if the store has hydrated
export const useStoreHydration = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Check if already hydrated
    const hasHydrated = useCertificateStore.getState()._hasHydrated;
    if (hasHydrated) {
      setHydrated(true);
    } else {
      // Wait for hydration
      const unsubscribe = useCertificateStore.subscribe(
        (state) => {
          if (state._hasHydrated) {
            setHydrated(true);
            unsubscribe();
          }
        }
      );
      return unsubscribe;
    }
  }, []);

  return hydrated;
};

// Hook to track online/offline status
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}

// Helper to generate certificate number using {TYPE}-{YEAR}-{SEQ} format
export function generateCertificateNumber(type: CertificateType): string {
  const fullYear = new Date().getFullYear();
  const existingOfType = useCertificateStore
    .getState()
    .certificates.filter((c) => c.certificate_type === type);
  const seq = (existingOfType.length + 1).toString().padStart(3, '0');
  return `${type}-${fullYear}-${seq}`;
}

// Helper to create a new certificate
export function createNewCertificate(
  type: CertificateType,
  initialData: Record<string, unknown> = {}
): StoredCertificate {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    certificate_number: generateCertificateNumber(type),
    certificate_type: type,
    status: 'draft',
    created_at: now,
    updated_at: now,
    data: initialData,
  };
}

// Status labels
export const STATUS_LABELS: Record<CertificateStatus, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  complete: 'Complete',
  issued: 'Issued',
};

// Type labels
export const TYPE_LABELS: Record<CertificateType, string> = {
  EIC: 'Electrical Installation Certificate',
  EICR: 'Electrical Installation Condition Report',
  MWC: 'Minor Works Certificate',
  FIRE: 'Fire Alarm Certificate',
  EML: 'Emergency Lighting Certificate',
};

// ── Lifecycle helpers (CERT-A16) ──

/**
 * Derive the lifecycle state for a stored certificate.
 * Combines the persisted status with workflow progress to compute
 * the full 5-state lifecycle (draft → in_progress → ready_for_review → completed → locked).
 */
export function getCertificateLifecycleState(cert: StoredCertificate): LifecycleState {
  return deriveLifecycleState(cert.status, cert.certificate_type, cert.data);
}

/**
 * Get display metadata for a certificate's lifecycle state.
 */
export function getCertificateStateInfo(cert: StoredCertificate): LifecycleStateInfo {
  return getStateInfo(getCertificateLifecycleState(cert));
}

/**
 * Check whether a certificate's data can be edited.
 */
export function isCertificateEditable(cert: StoredCertificate): boolean {
  return isEditable(getCertificateLifecycleState(cert));
}

/**
 * Update the stored status to match a lifecycle state transition.
 * Converts lifecycle state → offline app status format.
 */
export function lifecycleToStoredStatus(state: LifecycleState): CertificateStatus {
  return toOfflineStatus(state);
}

// Re-export lifecycle types for convenience
export type { LifecycleState, LifecycleStateInfo };
