"use client";

import * as React from "react";

export type ToastVariant = "default" | "destructive" | "success";

export type ToastData = {
  id: string;
  title?: string;
  description?: string;
  variant: ToastVariant;
  open: boolean;
};

export type ToastInput = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastCtx = {
  toasts: ToastData[];
  toast: (t: ToastInput) => void;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastCtx | null>(null);

export function ToastProviderInternal({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const toast = React.useCallback(
    (t: ToastInput) => {
      const id = crypto.randomUUID();
      const next: ToastData = {
        id,
        open: true,
        title: t.title,
        description: t.description,
        variant: t.variant ?? "default",
      };
      setToasts((prev) => [next, ...prev].slice(0, 5));
      window.setTimeout(() => dismiss(id), 3500);
    },
    [dismiss]
  );

  return <ToastContext.Provider value={{ toasts, toast, dismiss }}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return {
      toasts: [] as ToastData[],
      toast: (_t: ToastInput) => {},
      dismiss: (_id: string) => {},
    };
  }
  return ctx;
}
