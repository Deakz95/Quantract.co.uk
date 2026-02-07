"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { SaveStatus, ConflictState } from "./saveTypes";
import {
  useCertificateStore,
  useOnlineStatus,
  isCertificateEditable,
  createNewCertificate,
  generateCertificateNumber,
  type CertificateType,
} from "./certificateStore";
import { useOfflineSaveQueue } from "./useOfflineSaveQueue";

export interface UseAutosaveOptions {
  certId: string | null;
  certType: CertificateType;
  data: Record<string, unknown>;
  onSaveToStore: (id: string, data: Record<string, unknown>) => void;
  onCreateCert: () => string; // returns new cert ID
  debounceMs?: number; // default 600
}

export interface UseAutosaveReturn {
  saveStatus: SaveStatus;
  isSaving: boolean;
  lastSaved: Date | null;
  triggerSave: () => void;
  conflict: ConflictState | null;
  dismissConflict: () => void;
}

/**
 * Shared autosave hook for EICR, EIC, and MWC certificate pages.
 *
 * - 600ms debounce (safe because saves are synchronous to Zustand/localStorage)
 * - Automatic dirty detection via data reference changes
 * - Lifecycle guard: skips saving for completed/locked certs
 * - Offline awareness: enqueues to offline queue when offline
 * - Conflict hook point: stores lastKnownUpdatedAt for future CRM sync
 * - Unmount flush: saves pending dirty data on unmount
 * - Race prevention: triggerSave clears debounce timer before executing
 */
export function useAutosave({
  certId,
  certType,
  data,
  onSaveToStore,
  onCreateCert,
  debounceMs = 600,
}: UseAutosaveOptions): UseAutosaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);

  const isOnline = useOnlineStatus();
  const { getCertificate } = useCertificateStore();

  const dataRef = useRef(data);
  dataRef.current = data;

  const certIdRef = useRef(certId);
  certIdRef.current = certId;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);
  const lastKnownUpdatedAtRef = useRef<string | null>(null);

  // Offline queue — saves to store when flushed
  const offlineQueue = useOfflineSaveQueue((id, d) => {
    onSaveToStore(id, d);
  });

  // ── Core save logic ──
  const performSave = useCallback(() => {
    const id = certIdRef.current;
    if (!id) {
      // No cert yet — create one
      const newId = onCreateCert();
      certIdRef.current = newId;
      isDirtyRef.current = false;
      setLastSaved(new Date());
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      return;
    }

    // Lifecycle guard: don't save completed/locked certs
    const existing = getCertificate(id);
    if (existing && !isCertificateEditable(existing)) {
      isDirtyRef.current = false;
      return;
    }

    // Offline path
    if (!isOnline) {
      offlineQueue.enqueue(id, dataRef.current);
      isDirtyRef.current = false;
      setSaveStatus("offline");
      return;
    }

    // Save to store
    setSaveStatus("saving");
    try {
      onSaveToStore(id, dataRef.current);

      // Track updated_at for future conflict detection
      const updated = getCertificate(id);
      if (updated) {
        lastKnownUpdatedAtRef.current = updated.updated_at;
      }

      isDirtyRef.current = false;
      setLastSaved(new Date());
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  }, [getCertificate, isOnline, offlineQueue, onCreateCert, onSaveToStore]);

  // ── Dirty detection: data reference change triggers dirty ──
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    isDirtyRef.current = true;
    if (saveStatus !== "saving") {
      setSaveStatus("dirty");
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced auto-save ──
  useEffect(() => {
    if (!certIdRef.current || saveStatus !== "dirty") return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(performSave, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [saveStatus, debounceMs, performSave]);

  // ── Online/offline status change ──
  useEffect(() => {
    if (!isOnline) {
      if (saveStatus !== "saving") {
        setSaveStatus("offline");
      }
    } else if (saveStatus === "offline") {
      // Back online — if there's dirty data, trigger save
      if (isDirtyRef.current) {
        setSaveStatus("dirty");
      } else {
        setSaveStatus("idle");
      }
    }
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Manual save (Ctrl+S) — clears debounce timer first ──
  const triggerSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    performSave();
  }, [performSave]);

  // ── Unmount flush: save any pending dirty data ──
  useEffect(() => {
    return () => {
      if (isDirtyRef.current && certIdRef.current) {
        try {
          onSaveToStore(certIdRef.current, dataRef.current);
        } catch {
          // Best effort on unmount
        }
      }
    };
  }, [onSaveToStore]);

  // ── Restore lastSaved from existing cert on mount ──
  useEffect(() => {
    if (certId) {
      const existing = getCertificate(certId);
      if (existing) {
        setLastSaved(new Date(existing.updated_at));
        lastKnownUpdatedAtRef.current = existing.updated_at;
      }
    }
  }, [certId, getCertificate]);

  const dismissConflict = useCallback(() => setConflict(null), []);

  return {
    saveStatus,
    isSaving: saveStatus === "saving",
    lastSaved,
    triggerSave,
    conflict,
    dismissConflict,
  };
}
