import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { apiFetch } from "../api/client";
import { enqueue } from "./outbox";
import { useOutbox } from "./OutboxContext";
import {
  saveDraft,
  loadDraft,
  deleteDraft,
  markSynced,
  type CertDraft,
} from "./certDraftStore";

export type SyncStatus = "synced" | "pending" | "conflict" | "error";

type CertDraftState = {
  draft: CertDraft | null;
  syncStatus: SyncStatus;
  loading: boolean;
  /** Load certificate: local draft first, then server. Returns the draft. */
  loadCertificate: (certificateId: string) => Promise<CertDraft | null>;
  /** Update draft fields locally (debounced autosave to AsyncStorage) */
  updateDraft: (patch: Partial<Pick<CertDraft, "data" | "type" | "testResults">>) => void;
  /** Enqueue draft to outbox for server sync */
  saveDraftToServer: () => Promise<void>;
  /** Clear draft after successful completion */
  clearDraft: () => Promise<void>;
};

const CertDraftCtx = createContext<CertDraftState>({
  draft: null,
  syncStatus: "synced",
  loading: false,
  loadCertificate: async () => null,
  updateDraft: () => {},
  saveDraftToServer: async () => {},
  clearDraft: async () => {},
});

export function useCertDraft() {
  return useContext(CertDraftCtx);
}

export function CertDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<CertDraft | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [loading, setLoading] = useState(false);
  const draftRef = useRef<CertDraft | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { flush } = useOutbox();

  const loadCertificate = useCallback(async (certificateId: string): Promise<CertDraft | null> => {
    setLoading(true);
    try {
      // 1. Try local draft first
      const local = await loadDraft(certificateId);
      if (local) {
        setDraft(local);
        draftRef.current = local;
        setSyncStatus(local.dirty ? "pending" : "synced");
      }

      // 2. Fetch from server
      try {
        const res = await apiFetch(`/api/engineer/certificates/${certificateId}`);
        if (res.ok) {
          const json = await res.json();
          const serverCert = json.certificate;
          const serverResults = json.testResults || [];

          if (local && local.dirty) {
            // Local has unsaved changes — check for conflict
            if (local.serverUpdatedAt && serverCert.updatedAtISO !== local.serverUpdatedAt) {
              setSyncStatus("conflict");
            }
            // Keep local draft (has user changes), but user can see conflict banner
            return local;
          }

          // No local dirty changes — use server data
          const serverDraft: CertDraft = {
            certificateId,
            type: serverCert.type,
            data: serverCert.data || {},
            testResults: serverResults.map((r: any) => ({
              circuitRef: r.circuitRef,
              data: r.data || {},
            })),
            serverUpdatedAt: serverCert.updatedAtISO,
            savedAt: new Date().toISOString(),
            dirty: false,
          };
          await saveDraft(serverDraft);
          setDraft(serverDraft);
          draftRef.current = serverDraft;
          setSyncStatus("synced");
          return serverDraft;
        }
      } catch {
        // Network error — use local draft if available
        if (local) return local;
      }

      // 3. No local, no server
      if (!local) {
        setDraft(null);
        draftRef.current = null;
      }
      return local;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDraft = useCallback((patch: Partial<Pick<CertDraft, "data" | "type" | "testResults">>) => {
    const current = draftRef.current;
    if (!current) return;

    const updated: CertDraft = {
      ...current,
      ...(patch.data !== undefined ? { data: { ...current.data, ...patch.data } } : {}),
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.testResults !== undefined ? { testResults: patch.testResults } : {}),
      dirty: true,
      savedAt: new Date().toISOString(),
    };

    setDraft(updated);
    draftRef.current = updated;
    setSyncStatus("pending");

    // Debounced autosave to AsyncStorage (500ms)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDraft(updated);
    }, 500);
  }, []);

  const saveDraftToServer = useCallback(async () => {
    const current = draftRef.current;
    if (!current || !current.dirty) return;

    // Flush pending autosave immediately
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await saveDraft(current);

    const itemId = `cert_draft_${current.certificateId}_${Date.now()}`;
    await enqueue({
      id: itemId,
      type: "certificate_draft_save",
      payload: {
        certificateId: current.certificateId,
        data: current.data,
        type: current.type,
        testResults: current.testResults,
        expectedUpdatedAt: current.serverUpdatedAt,
      },
    });

    // Attempt immediate flush
    flush();
  }, [flush]);

  const clearDraft = useCallback(async () => {
    if (draftRef.current) {
      await deleteDraft(draftRef.current.certificateId);
    }
    setDraft(null);
    draftRef.current = null;
    setSyncStatus("synced");
  }, []);

  return (
    <CertDraftCtx.Provider
      value={{ draft, syncStatus, loading, loadCertificate, updateDraft, saveDraftToServer, clearDraft }}
    >
      {children}
    </CertDraftCtx.Provider>
  );
}
