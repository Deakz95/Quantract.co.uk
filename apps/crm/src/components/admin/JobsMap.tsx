"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";

export type MapPin = {
  id: string;
  type: "job" | "enquiry";
  status: string;
  label: string;
  lat: number;
  lng: number;
  href: string;
  clientName?: string | null;
  address?: string | null;
  postcode?: string | null;
  scheduledAt?: string | null;
};

const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

const FILTERS = [
  { key: "quoted", label: "Quoted", color: "#9333ea", type: "job" },
  { key: "scheduled", label: "Scheduled", color: "#2563eb", type: "job" },
  { key: "in_progress", label: "In Progress", color: "#ea580c", type: "job" },
  { key: "completed", label: "Completed", color: "#16a34a", type: "job" },
  { key: "enquiry", label: "Enquiries", color: "#eab308", type: "enquiry" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const STATUS_COLORS: Record<string, string> = {
  quoted: "#9333ea",
  scheduled: "#2563eb",
  in_progress: "#ea580c",
  completed: "#16a34a",
  new: "#eab308",
};

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function isToday(iso: string): boolean {
  try {
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  } catch {
    return false;
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* noop */
  }
}

export default function JobsMap({ defaultTodayOnly = false }: { defaultTodayOnly?: boolean } = {}) {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MapPin | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [todayOnly, setTodayOnly] = useState(defaultTodayOnly);
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    quoted: true,
    scheduled: true,
    in_progress: true,
    completed: true,
    enquiry: true,
  });

  useEffect(() => {
    fetch("/api/internal/dashboard/map-pins")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setPins(d.pins); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visiblePins = useMemo(() =>
    pins.filter((p) => {
      if (todayOnly && (!p.scheduledAt || !isToday(p.scheduledAt))) return false;
      if (p.type === "enquiry") return filters.enquiry;
      return filters[p.status as FilterKey] ?? true;
    }),
    [pins, filters, todayOnly]
  );

  function toggle(key: FilterKey) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const handlePinClick = useCallback((pin: MapPin) => {
    setSelected(pin);
    setCopied(null);
  }, []);

  function handleCopy(label: string, text: string) {
    copyText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  if (loading) {
    return <div className="aspect-video bg-[var(--muted)] rounded-xl animate-pulse" />;
  }

  if (pins.length === 0) {
    return (
      <div className="aspect-video bg-[var(--muted)] rounded-xl flex items-center justify-center">
        <div className="text-center text-[var(--muted-foreground)]">
          <p className="text-sm">No jobs with locations yet</p>
          <p className="text-xs mt-1">Add a postcode to a site to see pins here.</p>
        </div>
      </div>
    );
  }

  const statusColor = selected ? (STATUS_COLORS[selected.status] || "#6b7280") : "#6b7280";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
        {FILTERS.map((f) => (
          <label key={f.key} className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filters[f.key]}
              onChange={() => toggle(f.key)}
              className="sr-only"
            />
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0 border border-white/50 transition-colors"
              style={{
                backgroundColor: filters[f.key] ? f.color : "var(--border)",
              }}
            />
            <span
              className="text-xs transition-colors"
              style={{
                color: filters[f.key] ? "var(--foreground)" : "var(--muted-foreground)",
              }}
            >
              {f.label}
            </span>
          </label>
        ))}
        <label className="ml-auto flex items-center gap-1.5 cursor-pointer select-none">
          <span
            className="inline-block w-8 h-4 rounded-full relative transition-colors"
            style={{ backgroundColor: todayOnly ? "var(--primary)" : "var(--border)" }}
          >
            <span
              className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-[left]"
              style={{ left: todayOnly ? 17 : 3 }}
            />
          </span>
          <span className="text-xs" style={{ color: todayOnly ? "var(--foreground)" : "var(--muted-foreground)" }}>
            Today only
          </span>
          <input type="checkbox" checked={todayOnly} onChange={() => setTodayOnly((v) => !v)} className="sr-only" />
        </label>
        <span className="text-xs text-[var(--muted-foreground)]">
          Showing {visiblePins.length} {visiblePins.length === 1 ? "pin" : "pins"}
        </span>
      </div>

      {visiblePins.length === 0 ? (
        <div className="aspect-video bg-[var(--muted)] rounded-xl flex items-center justify-center">
          <p className="text-sm text-[var(--muted-foreground)]">No pins selected.</p>
        </div>
      ) : (
        <div className="relative">
          <LeafletMap pins={visiblePins} onPinClick={handlePinClick} />

          {/* Preview panel */}
          {selected && (
            <>
              {/* Overlay for mobile dismiss */}
              <div
                className="fixed inset-0 z-30 bg-black/20 sm:hidden"
                onClick={() => setSelected(null)}
              />
              {/* Panel: bottom sheet on mobile, side drawer on desktop */}
              <div className="fixed bottom-0 left-0 right-0 z-40 sm:absolute sm:top-0 sm:right-0 sm:bottom-auto sm:left-auto sm:w-72 sm:z-20">
                <div className="rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-lg overflow-hidden">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[var(--foreground)] truncate">{selected.label}</div>
                      {selected.clientName && (
                        <div className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">{selected.clientName}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                  </div>

                  {/* Status badge */}
                  <div className="px-4 pb-3">
                    <span
                      className="inline-block text-xs font-medium px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: statusColor }}
                    >
                      {formatStatus(selected.status)}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="border-t border-[var(--border)] px-4 py-3 space-y-2">
                    {selected.scheduledAt && (
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Scheduled</div>
                        <div className="text-xs text-[var(--foreground)]">{formatDate(selected.scheduledAt)}</div>
                      </div>
                    )}
                    {selected.address && (
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Address</div>
                        <div className="text-xs text-[var(--foreground)]">{selected.address}</div>
                      </div>
                    )}
                    {selected.postcode && (
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Postcode</div>
                        <div className="text-xs text-[var(--foreground)]">{selected.postcode}</div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="border-t border-[var(--border)] px-4 py-3 flex flex-wrap gap-2">
                    <a
                      href={selected.href}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
                    >
                      Open
                    </a>
                    {selected.address && (
                      <button
                        type="button"
                        onClick={() => handleCopy("address", selected.address!)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                      >
                        {copied === "address" ? "Copied" : "Copy address"}
                      </button>
                    )}
                    {selected.postcode && (
                      <button
                        type="button"
                        onClick={() => handleCopy("postcode", selected.postcode!)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                      >
                        {copied === "postcode" ? "Copied" : "Copy postcode"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
