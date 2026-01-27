"use client";

import * as React from "react";

export type ToastType = "success" | "error" | "warning" | "info";

// Legacy variant type for backward compatibility
export type ToastVariant = "default" | "destructive" | "success";

export type ToastAction = {
  label: string;
  href: string;
};

export type ToastData = {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  description?: string;
  action?: ToastAction;
  open: boolean;
  createdAt: number;
};

// New API input type
export type ToastInput = {
  type?: ToastType;
  message?: string;
  action?: ToastAction;
  // Legacy properties for backward compatibility
  title?: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  toasts: ToastData[];
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const TOAST_LIMIT = 3;
const TOAST_DURATION = 5000; // 5 seconds
const TOAST_REMOVE_DELAY = 300; // Animation duration

// Map legacy variant to new type
function variantToType(variant?: ToastVariant): ToastType {
  switch (variant) {
    case "destructive":
      return "error";
    case "success":
      return "success";
    case "default":
    default:
      return "info";
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);
  const timersRef = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismiss = React.useCallback((id: string) => {
    // Clear any existing timer for this toast
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }

    // Mark toast as closing (triggers exit animation)
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, open: false } : t))
    );

    // Remove from DOM after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_REMOVE_DELAY);
  }, []);

  const dismissAll = React.useCallback(() => {
    // Clear all timers
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();

    // Mark all toasts as closing
    setToasts((prev) => prev.map((t) => ({ ...t, open: false })));

    // Remove all from DOM after animation
    setTimeout(() => {
      setToasts([]);
    }, TOAST_REMOVE_DELAY);
  }, []);

  const toast = React.useCallback(
    (input: ToastInput): string => {
      const id = crypto.randomUUID();

      // Support both new API (type + message) and legacy API (variant + title/description)
      const type = input.type ?? variantToType(input.variant);
      const message =
        input.message ||
        input.title ||
        input.description ||
        "";

      const newToast: ToastData = {
        id,
        type,
        message,
        title: input.title,
        description: input.description,
        action: input.action,
        open: true,
        createdAt: Date.now(),
      };

      setToasts((prev) => {
        // Add new toast and keep only the latest TOAST_LIMIT toasts
        const updated = [newToast, ...prev];

        // If we exceed the limit, mark excess toasts for removal
        if (updated.length > TOAST_LIMIT) {
          const excess = updated.slice(TOAST_LIMIT);
          excess.forEach((t) => {
            const timer = timersRef.current.get(t.id);
            if (timer) {
              clearTimeout(timer);
              timersRef.current.delete(t.id);
            }
          });
          return updated.slice(0, TOAST_LIMIT);
        }

        return updated;
      });

      // Set auto-dismiss timer
      const timer = setTimeout(() => {
        dismiss(id);
      }, TOAST_DURATION);

      timersRef.current.set(id, timer);

      return id;
    },
    [dismiss]
  );

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const value = React.useMemo(
    () => ({ toasts, toast, dismiss, dismissAll }),
    [toasts, toast, dismiss, dismissAll]
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

// Stable no-op fallback to prevent infinite loops if used outside provider
const noopToast = (_input: ToastInput) => "";
const noopDismiss = (_id: string) => {};
const noopDismissAll = () => {};
const noopFallback = {
  toasts: [] as ToastData[],
  toast: noopToast,
  dismiss: noopDismiss,
  dismissAll: noopDismissAll,
};

export function useToast() {
  const context = React.useContext(ToastContext);

  if (!context) {
    // Return a stable no-op version if used outside provider (for safety)
    return noopFallback;
  }

  return context;
}
