"use client";

import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/components/ui/ToastContext";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col-reverse gap-2 pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          title={toast.title}
          description={toast.description}
          action={toast.action}
          open={toast.open}
          onDismiss={dismiss}
        />
      ))}
    </div>
  );
}
