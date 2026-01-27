"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ToastType, ToastAction } from "@/components/ui/ToastContext";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastProps = {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  description?: string;
  action?: ToastAction;
  open: boolean;
  onDismiss: (id: string) => void;
};

const typeStyles: Record<
  ToastType,
  {
    container: string;
    icon: typeof CheckCircle2;
    iconColor: string;
  }
> = {
  success: {
    container: "bg-[var(--success)]/10 border-[var(--success)]/30",
    icon: CheckCircle2,
    iconColor: "text-[var(--success)]",
  },
  error: {
    container: "bg-[var(--error)]/10 border-[var(--error)]/30",
    icon: AlertCircle,
    iconColor: "text-[var(--error)]",
  },
  warning: {
    container: "bg-[var(--warning)]/10 border-[var(--warning)]/30",
    icon: AlertTriangle,
    iconColor: "text-[var(--warning)]",
  },
  info: {
    container: "bg-[var(--primary)]/10 border-[var(--primary)]/30",
    icon: Info,
    iconColor: "text-[var(--primary)]",
  },
};

export function Toast({
  id,
  type,
  message,
  title,
  description,
  action,
  open,
  onDismiss,
}: ToastProps) {
  const styles = typeStyles[type];
  const Icon = styles.icon;

  // Support both new API (message only) and legacy API (title + description)
  const hasLegacyFormat = title || description;
  const displayTitle = title || message;
  const displayDescription = description;

  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm",
        "transition-all duration-300 ease-out",
        styles.container,
        open
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0"
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn("flex-shrink-0 mt-0.5", styles.iconColor)}>
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {hasLegacyFormat ? (
            <>
              {displayTitle && (
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {displayTitle}
                </p>
              )}
              {displayDescription && (
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  {displayDescription}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm font-medium text-[var(--foreground)]">
              {message}
            </p>
          )}

          {/* Action Link */}
          {action && (
            <Link
              href={action.href}
              className="mt-1.5 inline-flex text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-dark)] underline underline-offset-2 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
              onClick={() => onDismiss(id)}
            >
              {action.label}
            </Link>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          className={cn(
            "flex-shrink-0 rounded-lg p-1.5",
            "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
            "hover:bg-[var(--muted)]",
            "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
          )}
          onClick={() => onDismiss(id)}
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Legacy exports for backward compatibility with existing code
export function ToastProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function ToastViewport() {
  return null;
}

export function ToastTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-sm font-semibold text-[var(--foreground)]">
      {children}
    </div>
  );
}

export function ToastDescription({ children }: { children: ReactNode }) {
  return (
    <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
      {children}
    </div>
  );
}

export function ToastClose() {
  return null;
}
