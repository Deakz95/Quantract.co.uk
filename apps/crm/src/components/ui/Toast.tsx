"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { ToastVariant } from "@/components/ui/useToast";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export function ToastProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function ToastViewport() {
  return null;
}

type ToastProps = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  open?: boolean;
  onClose?: () => void;
  children?: ReactNode;
};

const variantStyles = {
  default: {
    container: "bg-[var(--card)] border-[var(--border)]",
    icon: Info,
    iconColor: "text-[var(--primary)]",
  },
  success: {
    container: "bg-[var(--success)]/5 border-[var(--success)]/20",
    icon: CheckCircle2,
    iconColor: "text-[var(--success)]",
  },
  destructive: {
    container: "bg-[var(--error)]/5 border-[var(--error)]/20",
    icon: AlertCircle,
    iconColor: "text-[var(--error)]",
  },
};

export function Toast({ title, description, variant = "default", open = true, onClose, children }: ToastProps) {
  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-sm transition-all duration-300",
        styles.container,
        open ? "opacity-100 translate-x-0" : "translate-x-4 opacity-0"
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex-shrink-0 mt-0.5", styles.iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && <ToastDescription>{description}</ToastDescription>}
          {children}
        </div>
        {onClose && (
          <button
            type="button"
            className="flex-shrink-0 rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function ToastTitle({ children }: { children: ReactNode }) {
  return <div className="text-sm font-semibold text-[var(--foreground)]">{children}</div>;
}

export function ToastDescription({ children }: { children: ReactNode }) {
  return <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">{children}</div>;
}

export function ToastClose() {
  return null;
}
