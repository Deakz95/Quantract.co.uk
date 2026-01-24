import * as React from "react";
import { cn } from "@/lib/cn";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const checkboxId = id || React.useId();

    return (
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className={cn(
            "w-4 h-4 rounded cursor-pointer transition-all",
            "border-2 border-[var(--border)] bg-[var(--background)]",
            "checked:bg-[var(--primary)] checked:border-[var(--primary)]",
            "hover:border-[var(--primary)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
          {...props}
        />
        {label && (
          <label
            htmlFor={checkboxId}
            className="text-sm text-[var(--foreground)] cursor-pointer select-none"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
