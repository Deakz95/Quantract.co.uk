"use client";

import { Toast } from "@/components/ui/Toast";
import { ToastProviderInternal, useToast } from "@/components/ui/useToast";

function ToasterInner() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed right-4 top-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} variant={t.variant} open={t.open} onClose={() => dismiss(t.id)} title={t.title} description={t.description} />
      ))}
    </div>
  );
}

export function Toaster() {
  return (
    <ToastProviderInternal>
      <ToasterInner />
    </ToastProviderInternal>
  );
}
