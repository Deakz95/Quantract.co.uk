"use client";

// Re-export everything from the new ToastContext for backward compatibility
// and to support both old and new API patterns

export {
  ToastProvider,
  useToast,
  type ToastType,
  type ToastAction,
  type ToastData,
  type ToastInput,
} from "@/components/ui/ToastContext";

// Legacy type aliases for backward compatibility
export type ToastVariant = "default" | "destructive" | "success";

// Legacy provider for backward compatibility
export { ToastProvider as ToastProviderInternal } from "@/components/ui/ToastContext";
