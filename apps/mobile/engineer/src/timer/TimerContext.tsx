import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { apiFetch } from "../api/client";
import { enqueue, flushOutbox } from "../offline/outbox";
import { useAuth } from "../auth/AuthContext";

type ActiveTimer = {
  id: string;
  jobId: string;
  startedAtISO: string;
} | null;

type TimerState = {
  activeTimer: ActiveTimer;
  isPending: boolean; // true if timer state came from outbox (not confirmed by server)
  refreshTimer: () => Promise<void>;
  startTimer: (jobId: string) => Promise<boolean>;
  stopTimer: () => Promise<boolean>;
};

const TimerContext = createContext<TimerState>({
  activeTimer: null,
  isPending: false,
  refreshTimer: async () => {},
  startTimer: async () => false,
  stopTimer: async () => false,
});

export function useTimer() {
  return useContext(TimerContext);
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [activeTimer, setActiveTimer] = useState<ActiveTimer>(null);
  const [isPending, setIsPending] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const refreshTimer = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch("/api/engineer/timer/active");
      const data = await res.json();
      if (data?.ok) {
        setActiveTimer(data.active || null);
        setIsPending(false);
      }
    } catch {
      // Offline — keep current state
    }
  }, [token]);

  // Fetch on mount + foreground
  useEffect(() => {
    if (!token) { setActiveTimer(null); return; }

    refreshTimer();

    const sub = AppState.addEventListener("change", (next) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        refreshTimer();
        flushOutbox().catch(() => {});
      }
      appState.current = next;
    });

    return () => sub.remove();
  }, [token, refreshTimer]);

  // Flush outbox on network restore
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        flushOutbox().then(() => refreshTimer()).catch(() => {});
      }
    });
    return () => unsub();
  }, [refreshTimer]);

  const startTimer = useCallback(async (jobId: string): Promise<boolean> => {
    const netState = await NetInfo.fetch();

    if (netState.isConnected) {
      try {
        const res = await apiFetch("/api/engineer/timer/start", {
          method: "POST",
          body: JSON.stringify({ jobId }),
        });
        const data = await res.json();
        if (res.ok && data?.ok) {
          setActiveTimer(data.active || { id: "pending", jobId, startedAtISO: new Date().toISOString() });
          setIsPending(false);
          return true;
        }
        return false;
      } catch {
        // Fall through to offline path
      }
    }

    // Offline — optimistic
    const id = `local_${Date.now()}`;
    setActiveTimer({ id, jobId, startedAtISO: new Date().toISOString() });
    setIsPending(true);
    await enqueue({ id: `outbox_start_${id}`, type: "timer_start", jobId, payload: {} });
    return true;
  }, []);

  const stopTimer = useCallback(async (): Promise<boolean> => {
    const netState = await NetInfo.fetch();

    if (netState.isConnected) {
      try {
        const res = await apiFetch("/api/engineer/timer/stop", { method: "POST" });
        const data = await res.json();
        if (res.ok && data?.ok) {
          setActiveTimer(null);
          setIsPending(false);
          return true;
        }
        return false;
      } catch {
        // Fall through to offline path
      }
    }

    // Offline — optimistic
    setActiveTimer(null);
    setIsPending(true);
    await enqueue({ id: `outbox_stop_${Date.now()}`, type: "timer_stop", payload: {} });
    return true;
  }, []);

  return (
    <TimerContext.Provider value={{ activeTimer, isPending, refreshTimer, startTimer, stopTimer }}>
      {children}
    </TimerContext.Provider>
  );
}
