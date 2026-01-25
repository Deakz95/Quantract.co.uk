"use client";

import * as React from "react";
import { cn } from "./cn";

type SelectContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
};

const SelectContext = React.createContext<SelectContextValue>({});

type SelectProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
};

export function Select({ value, onValueChange, disabled, children }: SelectProps) {
  return (
    <SelectContext.Provider value={{ value, onValueChange, disabled }}>
      {children}
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--foreground)]",
        className
      )}
      {...props}
    />
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = React.useContext(SelectContext);
  return <span>{ctx.value || placeholder}</span>;
}

export function SelectContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(SelectContext);
  return (
    <div className={cn("mt-2", className)}>
      <select
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        value={ctx.value || ""}
        onChange={(e) => ctx.onValueChange?.(e.target.value)}
        disabled={ctx.disabled}
      >
        {props.children}
      </select>
    </div>
  );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option>;
}

// Simple native select wrapper for easier usage
export function NativeSelect({
  className,
  value,
  onChange,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--foreground)] transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent",
        "hover:border-[var(--primary)]/50",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      value={value}
      onChange={onChange}
      {...props}
    >
      {children}
    </select>
  );
}
