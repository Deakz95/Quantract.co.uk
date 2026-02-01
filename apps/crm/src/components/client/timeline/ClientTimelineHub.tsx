"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import TimelineList from "./TimelineList";
import type { TimelineItem } from "./types";

/* ── Filter pills ────────────────────────────────────────────── */

type FilterKey = "all" | "job" | "certificate" | "invoice";

const PILLS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "job", label: "Work" },
  { key: "certificate", label: "Certificates" },
  { key: "invoice", label: "Invoices" },
];

/* ── Skeleton loaders ────────────────────────────────────────── */

function PillSkeleton() {
  return (
    <div className="flex gap-2">
      {[56, 48, 72, 56].map((w, i) => (
        <div
          key={i}
          className="h-8 rounded-full bg-[var(--muted)] animate-pulse"
          style={{ width: w }}
        />
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="flex gap-3.5 animate-pulse">
      <div className="shrink-0 w-9 h-9 rounded-xl bg-[var(--muted)]" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="h-4 w-3/5 rounded bg-[var(--muted)]" />
        <div className="h-3 w-2/5 rounded bg-[var(--muted)]" />
        <div className="h-3 w-1/4 rounded bg-[var(--muted)]" />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <PillSkeleton />
      <div>
        <div className="h-3 w-16 rounded bg-[var(--muted)] animate-pulse mb-4" />
        <div className="space-y-6 pl-5 ml-[3px]">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */

export default function ClientTimelineHub() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/client/timeline");
      const data = await res.json();
      if (data.ok) {
        setItems(data.items || []);
      } else {
        setError("We couldn\u2019t load your activity right now.");
      }
    } catch {
      setError("We couldn\u2019t load your activity right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Client-side filter — instant, no refetch */
  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.type === filter)),
    [items, filter],
  );

  /* Counts for badge on each pill */
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, job: 0, invoice: 0, certificate: 0 };
    for (const i of items) c[i.type] = (c[i.type] || 0) + 1;
    return c;
  }, [items]);

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <header>
        <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          Your Activity
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Jobs, invoices, and certificates in one place.
        </p>
      </header>

      {/* ── Content area ──────────────────────────────────────── */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        /* ── Error state ──────────────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[var(--muted)] flex items-center justify-center mb-4">
            <RefreshCw size={20} className="text-[var(--muted-foreground)]" />
          </div>
          <p className="text-sm font-medium text-[var(--foreground)]">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* ── Filter pills (sticky on scroll) ───────────────── */}
          <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-[var(--background)]/95 backdrop-blur-sm sm:-mx-6 sm:px-6">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {PILLS.map((pill) => {
                const active = filter === pill.key;
                const count = counts[pill.key] || 0;
                return (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => setFilter(pill.key)}
                    className={
                      "shrink-0 inline-flex items-center gap-1.5 h-8 px-3.5 text-[13px] font-medium rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 " +
                      (active
                        ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]"
                        : "bg-transparent text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--muted)]")
                    }
                  >
                    {pill.label}
                    <span
                      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full"
                      style={{
                        backgroundColor: active
                          ? "rgba(255,255,255,0.18)"
                          : "var(--muted)",
                        color: active
                          ? "var(--background)"
                          : "var(--muted-foreground)",
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Timeline or empty state ───────────────────────── */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--muted)] flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted-foreground)]">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {items.length === 0 ? "No activity yet" : "Nothing here"}
              </p>
              <p className="text-[13px] text-[var(--muted-foreground)] mt-1 max-w-[260px]">
                {items.length === 0
                  ? "Once work begins, you\u2019ll see jobs, invoices, and certificates appear here."
                  : "Try a different filter to see more."}
              </p>
            </div>
          ) : (
            <TimelineList items={filtered} />
          )}
        </>
      )}
    </div>
  );
}
