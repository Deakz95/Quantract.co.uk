import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import { loadOutbox, flushOutbox, type OutboxItem } from "./outbox";

type OutboxState = {
  pendingCount: number;
  failedItems: OutboxItem[];
  flushing: boolean;
  flush: () => Promise<void>;
};

const OutboxContext = createContext<OutboxState>({
  pendingCount: 0,
  failedItems: [],
  flushing: false,
  flush: async () => {},
});

export function useOutbox() {
  return useContext(OutboxContext);
}

export function OutboxProvider({ children }: { children: React.ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [failedItems, setFailedItems] = useState<OutboxItem[]>([]);
  const [flushing, setFlushing] = useState(false);
  const flushingRef = useRef(false);

  const refresh = useCallback(async () => {
    const items = await loadOutbox();
    setPendingCount(items.length);
    setFailedItems(items.filter((i) => i.attempts >= 5));
  }, []);

  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    setFlushing(true);
    try {
      await flushOutbox();
    } finally {
      flushingRef.current = false;
      setFlushing(false);
      await refresh();
    }
  }, [refresh]);

  // Refresh counts on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-flush when connectivity changes to online
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        flush();
      }
    });
    return () => unsub();
  }, [flush]);

  // Periodic flush every 60s when connected
  useEffect(() => {
    const iv = setInterval(() => {
      flush();
    }, 60_000);
    return () => clearInterval(iv);
  }, [flush]);

  return (
    <OutboxContext.Provider value={{ pendingCount, failedItems, flushing, flush }}>
      {children}
    </OutboxContext.Provider>
  );
}
