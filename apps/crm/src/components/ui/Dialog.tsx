"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 cursor-default bg-black/40"
        onClick={() => onOpenChange?.(false)}
      />
      <div
        className="relative w-full max-w-[560px]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

export function DialogTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("text-lg font-bold text-[var(--foreground)]", className)}>{children}</div>;
}

export function DialogDescription({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mt-1.5 text-sm text-[var(--muted-foreground)]", className)}>{children}</div>;
}

export function DialogBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mt-4", className)}>{children}</div>;
}

export function DialogFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mt-6 flex justify-end gap-2", className)}>{children}</div>;
}
