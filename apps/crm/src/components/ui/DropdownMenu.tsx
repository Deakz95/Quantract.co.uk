"use client";

import { createContext, useContext, useState, useEffect, useRef, type ReactNode, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

type DropdownMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerId: string;
  menuId: string;
};

const DropdownMenuContext = createContext<DropdownMenuContextValue>({
  open: false,
  setOpen: () => {},
  triggerId: "",
  menuId: "",
});

let dropdownIdCounter = 0;

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [ids] = useState(() => {
    const id = ++dropdownIdCounter;
    return { triggerId: `dropdown-trigger-${id}`, menuId: `dropdown-menu-${id}` };
  });

  // Handle Escape key to close dropdown
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, ...ids }}>
      <div className="relative">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({ children, asChild }: { children: ReactNode; asChild?: boolean }) {
  const { open, setOpen, triggerId, menuId } = useContext(DropdownMenuContext);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(!open);
    }
  };

  return (
    <div
      id={triggerId}
      onClick={() => setOpen(!open)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 rounded-md"
    >
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
  const { open, setOpen, menuId, triggerId } = useContext(DropdownMenuContext);
  const menuRef = useRef<HTMLDivElement>(null);

  // Focus first item when menu opens
  useEffect(() => {
    if (open && menuRef.current) {
      const firstItem = menuRef.current.querySelector<HTMLButtonElement>('[role="menuitem"]');
      firstItem?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-labelledby={triggerId}
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

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      role="menuitem"
      className={cn(
        "w-full text-left px-2 py-1.5 text-sm rounded-sm text-[var(--foreground)] hover:bg-[var(--muted)] cursor-pointer transition-colors focus-visible:outline-none focus-visible:bg-[var(--muted)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]",
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
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
