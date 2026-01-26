import * as React from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "default" | "secondary" | "destructive" | "success" | "warning" | "outline" | "gradient" | "glass";

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & { variant?: BadgeVariant };

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[var(--primary)] text-[var(--primary-foreground)]",
  secondary: "bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)]",
  destructive: "bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/20",
  success: "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20",
  warning: "bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/20",
  outline: "bg-transparent text-[var(--primary)] border-2 border-[var(--primary)]",
  gradient: "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--primary-foreground)]",
  glass: "glass text-[var(--foreground)]",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
