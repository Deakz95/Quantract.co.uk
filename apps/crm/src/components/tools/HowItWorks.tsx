"use client";

import { useState } from "react";

export function HowItWorks({
  title = "How it works",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        aria-expanded={open}
      >
        <span>{title}</span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-[var(--muted-foreground)] space-y-2 border-t border-[var(--border)] pt-3">
          {children}
        </div>
      )}
    </div>
  );
}
