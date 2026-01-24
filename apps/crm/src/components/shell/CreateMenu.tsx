"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type CreateAction = {
  label: string;
  description: string;
  href: string;
  /** Material Design Icons font class, e.g. "mdi-account-plus-outline" */
  icon: string;
  /** UI-only permission gate. If false, the action won't be shown. */
  allowed?: boolean;
};

export function CreateMenu({
  actions,
  onClose,
  title = "Create new",
  subtitle = "Quick actions to keep things moving.",
}: {
  actions: CreateAction[];
  onClose: () => void;
  title?: string;
  subtitle?: string;
}) {
  const visibleActions = useMemo(
    () => actions.filter((a) => a.allowed !== false),
    [actions]
  );
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [animateIn, setAnimateIn] = useState(false);
  const [cols, setCols] = useState(2);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimateIn(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const compute = () => {
      if (typeof window === "undefined") return;
      setCols(window.innerWidth >= 640 ? 3 : 2);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  useEffect(() => {
    const first = itemRefs.current[0];
    if (first) first.focus();
  }, [visibleActions.length]);

  const clampIndex = (i: number) => {
    if (visibleActions.length === 0) return 0;
    return Math.max(0, Math.min(visibleActions.length - 1, i));
  };

  const move = (nextIndex: number) => {
    const i = clampIndex(nextIndex);
    setActiveIndex(i);
    itemRefs.current[i]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (visibleActions.length === 0) return;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      move(activeIndex + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      move(activeIndex - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(activeIndex + cols);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(activeIndex - cols);
    } else if (e.key === "Home") {
      e.preventDefault();
      move(0);
    } else if (e.key === "End") {
      e.preventDefault();
      move(visibleActions.length - 1);
    }
  };

  return (
    <div
      className={cn(
        "transition-all duration-150",
        animateIn ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]"
      )}
      onKeyDown={onKeyDown}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-bold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          Close
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visibleActions.map((action, idx) => (
          <Link
            key={action.href}
            href={action.href}
            ref={(el: HTMLAnchorElement | null) => {
              itemRefs.current[idx] = el;
            }}
            onClick={onClose}
            onFocus={() => setActiveIndex(idx)}
            className={cn(
              "group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm outline-none transition",
              "hover:-translate-y-0.5 hover:shadow-md",
              "focus-visible:ring-2 focus-visible:ring-slate-400",
              idx === activeIndex ? "ring-1 ring-slate-300" : ""
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mdi text-xl leading-none text-slate-800",
                  action.icon,
                  "transition-transform duration-150 group-hover:scale-110"
                )}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900">
                  {action.label}
                </div>
                <div className="mt-0.5 text-xs text-slate-600">
                  {action.description}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {visibleActions.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          No create actions available for your account.
        </div>
      ) : null}

      <div className="mt-4 text-xs text-slate-500">
        Tip: use arrow keys to move, Enter to open, Esc to close.
      </div>
    </div>
  );
}
