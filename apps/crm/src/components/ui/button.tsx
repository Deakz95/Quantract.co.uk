import * as React from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "default" | "secondary" | "destructive" | "ghost" | "outline" | "gradient" | "glass";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  default: "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-[var(--primary-foreground)] shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
  secondary: "bg-[var(--secondary)] text-[var(--secondary-foreground)] border border-[var(--border)] hover:bg-[var(--muted)] hover:border-[var(--primary)] shadow-sm",
  destructive: "bg-gradient-to-r from-[var(--error)] to-[var(--error-light)] text-[var(--error-foreground)] shadow-md hover:shadow-lg hover:scale-[1.02]",
  ghost: "bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]",
  outline: "bg-transparent text-[var(--primary)] border-2 border-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]",
  gradient: "bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-[var(--primary-dark)] text-[var(--primary-foreground)] shadow-lg hover:shadow-xl hover:scale-[1.02] bg-[length:200%_auto] hover:bg-right-top transition-all duration-500",
  glass: "glass text-[var(--foreground)] hover:bg-[var(--muted)]/40 shadow-lg",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "px-5 py-2.5 text-sm",
  sm: "px-3 py-1.5 text-xs",
  lg: "px-8 py-3.5 text-base",
  icon: "p-2.5",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
