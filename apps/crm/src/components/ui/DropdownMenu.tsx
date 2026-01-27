"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type DropdownMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DropdownMenuContext = createContext<DropdownMenuContextValue>({
  open: false,
  setOpen: () => {},
});

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({ children, asChild }: { children: ReactNode; asChild?: boolean }) {
  const { open, setOpen } = useContext(DropdownMenuContext);
  return (
    <div onClick={() => setOpen(!open)}>
      {children}
    </div>
  );
}

export function DropdownMenuContent({
  children,
  align = "start",
  className
}: {
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const { open, setOpen } = useContext(DropdownMenuContext);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={() => setOpen(false)}
      />
      <div
        className={cn(
          "absolute z-50 mt-2 min-w-[8rem] rounded-md border border-[var(--border)] bg-[var(--card)] p-1 shadow-md",
          align === "end" ? "right-0" : "left-0",
          className
        )}
      >
        {children}
      </div>
    </>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  className
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const { setOpen } = useContext(DropdownMenuContext);

  const handleClick = () => {
    onClick?.();
    setOpen(false);
  };

  return (
    <button
      className={cn(
        "w-full text-left px-2 py-1.5 text-sm rounded-sm text-[var(--foreground)] hover:bg-[var(--muted)] cursor-pointer transition-colors",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return (
    <div className={cn("my-1 h-px bg-[var(--border)]", className)} />
  );
}

export function DropdownMenuLabel({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-2 py-1.5 text-sm font-medium text-[var(--muted-foreground)]", className)}>
      {children}
    </div>
  );
}
