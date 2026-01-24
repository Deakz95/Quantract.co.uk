import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  type?: string;
  value?: string | number | readonly string[];
};

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent",
        "hover:border-[var(--primary)]/50",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition-all duration-200 min-h-[100px] resize-y",
        "focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent",
        "hover:border-[var(--primary)]/50",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "block text-sm font-medium text-[var(--foreground)] mb-1.5",
        className
      )}
      {...props}
    />
  );
}
