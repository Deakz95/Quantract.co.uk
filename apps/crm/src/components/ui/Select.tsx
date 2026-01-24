"use client";

import type { HTMLAttributes } from "react";
import { createContext, useContext } from "react";
import { cn } from "@/lib/cn";

type SelectContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
};

const SelectContext = createContext<SelectContextValue>({});

type SelectProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: any;
};

export function Select({ value, onValueChange, disabled, children }: SelectProps) {
  return (
    <SelectContext.Provider value={{ value, onValueChange, disabled }}>
      {children}
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm", className)} {...props} />;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = useContext(SelectContext);
  return <span>{ctx.value || placeholder}</span>;
}

export function SelectContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const ctx = useContext(SelectContext);
  return (
    <div className={cn("mt-2", className)}>
      <select
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        value={ctx.value || ""}
        onChange={(e) => ctx.onValueChange?.(e.target.value)}
        disabled={ctx.disabled}
      >
        {props.children}
      </select>
    </div>
  );
}

export function SelectItem({ value, children }: { value: string; children: any; key?: string }) {
  return <option value={value}>{children}</option>;
}
