"use client";

import { useRef, useEffect, useCallback } from "react";
import { useOnlineStatus } from "./certificateStore";

interface QueueEntry {
  certId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface UseOfflineSaveQueueReturn {
  enqueue(certId: string, data: Record<string, unknown>): void;
  flush(): void;
  clear(certId: string): void;
  getPendingCount(certId: string): number;
  totalPending: number;
}

/**
 * In-memory offline save queue.
 * Deduplicates by certId (last write wins). Auto-flushes on `online` event.
 */
export function useOfflineSaveQueue(
  onSave: (certId: string, data: Record<string, unknown>) => void,
): UseOfflineSaveQueueReturn {
  const queueRef = useRef<QueueEntry[]>([]);
  const isOnline = useOnlineStatus();

  const enqueue = useCallback((certId: string, data: Record<string, unknown>) => {
    const queue = queueRef.current;
    // Deduplicate: replace existing entry for same certId
    const idx = queue.findIndex((e) => e.certId === certId);
    const entry: QueueEntry = { certId, data, timestamp: Date.now() };
    if (idx >= 0) {
      queue[idx] = entry;
    } else {
      queue.push(entry);
    }
  }, []);

  const flush = useCallback(() => {
    const queue = queueRef.current;
    // Process FIFO
    while (queue.length > 0) {
      const entry = queue.shift()!;
      onSave(entry.certId, entry.data);
    }
  }, [onSave]);

  const clear = useCallback((certId: string) => {
    queueRef.current = queueRef.current.filter((e) => e.certId !== certId);
  }, []);

  const getPendingCount = useCallback((certId: string) => {
    return queueRef.current.filter((e) => e.certId === certId).length;
  }, []);

  // Auto-flush when coming back online
  useEffect(() => {
    if (isOnline && queueRef.current.length > 0) {
      flush();
    }
  }, [isOnline, flush]);

  return {
    enqueue,
    flush,
    clear,
    getPendingCount,
    get totalPending() {
      return queueRef.current.length;
    },
  };
}
