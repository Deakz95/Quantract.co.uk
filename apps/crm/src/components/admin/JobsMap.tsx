"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";

export type MapPin = {
  id: string;
  type: "job" | "enquiry" | "quote";
  status: string;
  label: string;
  ref?: string | null;
  lat: number;
  lng: number;
  href: string;
  clientName?: string | null;
  address?: string | null;
  postcode?: string | null;
  scheduledAt?: string | null;
  engineerName?: string | null;
  totalValue?: number | null;
  invoiceCount?: number;
  paidCount?: number;
  invoiceTotal?: number;
  linkedQuoteId?: string | null;
  linkedQuoteHref?: string | null;
  linkedJobId?: string | null;
  linkedJobHref?: string | null;
};

const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

const FILTERS = [
  { key: "new", label: "New", color: "#6b7280", type: "job" },
  { key: "quoted", label: "Quoted", color: "#9333ea", type: "job" },
  { key: "scheduled", label: "Scheduled", color: "#2563eb", type: "job" },
  { key: "in_progress", label: "In Progress", color: "#ea580c", type: "job" },
  { key: "completed", label: "Completed", color: "#16a34a", type: "job" },
  { key: "enquiry", label: "Enquiries", color: "#eab308", type: "enquiry" },
  { key: "quote", label: "Quotes", color: "#a855f7", type: "quote" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const STORAGE_KEY = "quantract_map_filters";

const STATUS_COLORS: Record<string, string> = {
  quoted: "#9333ea",
  scheduled: "#2563eb",
  in_progress: "#ea580c",
  completed: "#16a34a",
  new: "#6b7280",
  sent: "#2563eb",
  accepted: "#16a34a",
  quote: "#a855f7",
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
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

function googleMapsUrl(address: string | null | undefined, postcode: string | null | undefined): string {
  const query = [address, postcode].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

// --- Icons as inline SVGs to avoid extra imports ---

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function NavigationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3,11 22,2 13,21 11,13 3,11" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// --- Detail row component ---

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">{label}</div>
      <div className="text-xs text-[var(--foreground)]">{children}</div>
    </div>
  );
}

// --- Pin detail panel ---

function PinDetailPanel({
  pin,
  onClose,
  onCopy,
  copied,
}: {
  pin: MapPin;
  onClose: () => void;
  onCopy: (label: string, text: string) => void;
  copied: string | null;
}) {
  const statusColor = STATUS_COLORS[pin.status] || "#6b7280";
  const isJob = pin.type === "job";
  const TypeIcon = isJob ? BriefcaseIcon : FileTextIcon;
  const typeLabel = isJob ? "Job" : "Quote";

  // Invoice status summary
  let invoiceStatus: string | null = null;
  if (isJob && typeof pin.invoiceCount === "number" && pin.invoiceCount > 0) {
    if (pin.paidCount === pin.invoiceCount) {
      invoiceStatus = `Paid (${pin.invoiceCount} invoice${pin.invoiceCount !== 1 ? "s" : ""})`;
    } else if (pin.paidCount && pin.paidCount > 0) {
      invoiceStatus = `${pin.paidCount}/${pin.invoiceCount} paid`;
    } else {
      invoiceStatus = `Unpaid (${pin.invoiceCount} invoice${pin.invoiceCount !== 1 ? "s" : ""})`;
    }
  }

  return (
    <>
      {/* Overlay for mobile dismiss */}
      <div
        className="fixed inset-0 z-30 bg-black/20 sm:hidden"
        onClick={onClose}
      />
      {/* Panel: bottom sheet on mobile, side drawer on desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:absolute sm:top-0 sm:right-0 sm:bottom-auto sm:left-auto sm:w-80 sm:z-20">
        <div className="rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-lg overflow-hidden max-h-[70vh] sm:max-h-[calc(100%-1rem)] overflow-y-auto">

          {/* Header */}
          <div className="flex items-start gap-2 px-4 pt-4 pb-2">
            <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: statusColor + "20" }}>
              <TypeIcon className="text-[var(--foreground)]" />
            </div>
            <div className="min-w-0 flex-1">
              {pin.ref ? (
                <a
                  href={pin.href}
                  className="text-sm font-semibold text-[var(--primary)] hover:underline"
                >
                  {pin.ref}
                </a>
              ) : (
                <span className="text-sm font-semibold text-[var(--foreground)]">{typeLabel}</span>
              )}
              {pin.clientName && (
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">{pin.clientName}</div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Status badge */}
          <div className="px-4 pb-3">
            <span
              className="inline-block text-xs font-medium px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: statusColor }}
            >
              {formatStatus(pin.status)}
            </span>
          </div>

          {/* Description */}
          {pin.label && (
            <div className="border-t border-[var(--border)] px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Description</div>
              <div className="text-xs text-[var(--foreground)] mt-0.5 line-clamp-3">{pin.label}</div>
            </div>
          )}

          {/* Key details */}
          <div className="border-t border-[var(--border)] px-4 py-3 space-y-2">
            {isJob && (
              <DetailRow label="Engineer">
                {pin.engineerName || "Unassigned"}
              </DetailRow>
            )}

            <DetailRow label="Scheduled">
              {pin.scheduledAt ? formatDate(pin.scheduledAt) : "Not scheduled"}
            </DetailRow>

            {pin.totalValue != null && pin.totalValue > 0 && (
              <DetailRow label={isJob ? "Budget" : "Quote Value"}>
                {formatCurrency(pin.totalValue)}
              </DetailRow>
            )}

            {invoiceStatus && (
              <DetailRow label="Invoices">
                <span className="flex items-center gap-1.5">
                  {invoiceStatus}
                  {typeof pin.invoiceTotal === "number" && pin.invoiceTotal > 0 && (
                    <span className="text-[var(--muted-foreground)]">({formatCurrency(pin.invoiceTotal)})</span>
                  )}
                </span>
              </DetailRow>
            )}
          </div>

          {/* Address */}
          {(pin.address || pin.postcode) && (
            <div className="border-t border-[var(--border)] px-4 py-3 space-y-2">
              {pin.address && (
                <DetailRow label="Address">{pin.address}</DetailRow>
              )}
              {pin.postcode && (
                <DetailRow label="Postcode">{pin.postcode}</DetailRow>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-[var(--border)] px-4 py-3 flex flex-wrap gap-2">
            <a
              href={pin.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
            >
              <TypeIcon className="w-3 h-3" />
              View {typeLabel}
            </a>

            {(pin.address || pin.postcode) && (
              <a
                href={googleMapsUrl(pin.address, pin.postcode)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                <NavigationIcon />
                Navigate
              </a>
            )}

            {/* Linked quote/job */}
            {isJob && pin.linkedQuoteHref && (
              <a
                href={pin.linkedQuoteHref}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                <FileTextIcon className="w-3 h-3" />
                View Quote
              </a>
            )}
            {!isJob && pin.linkedJobHref && (
              <a
                href={pin.linkedJobHref}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                <BriefcaseIcon className="w-3 h-3" />
                View Job
              </a>
            )}
          </div>

          {/* Copy buttons */}
          {(pin.address || pin.postcode) && (
            <div className="border-t border-[var(--border)] px-4 py-2.5 flex flex-wrap gap-2">
              {pin.address && (
                <button
                  type="button"
                  onClick={() => onCopy("address", pin.address!)}
                  className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  {copied === "address" ? "Copied!" : "Copy address"}
                </button>
              )}
              {pin.address && pin.postcode && (
                <span className="text-[var(--border)]">|</span>
              )}
              {pin.postcode && (
                <button
                  type="button"
                  onClick={() => onCopy("postcode", pin.postcode!)}
                  className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  {copied === "postcode" ? "Copied!" : "Copy postcode"}
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// --- Main component ---

export default function JobsMap({ defaultTodayOnly = false }: { defaultTodayOnly?: boolean } = {}) {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MapPin | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [todayOnly, setTodayOnly] = useState(defaultTodayOnly);
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>(() => {
    const defaults: Record<FilterKey, boolean> = {
      new: true,
      quoted: true,
      scheduled: true,
      in_progress: true,
      completed: true,
      enquiry: true,
      quote: true,
    };
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch {}
    return defaults;
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
      if (p.type === "quote") return filters.quote;
      return filters[p.status as FilterKey] ?? true;
    }),
    [pins, filters, todayOnly]
  );

  const pinOverload = visiblePins.length > 200;

  function toggle(key: FilterKey) {
    setFilters((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
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

  return (
    <div>
      {process.env.NODE_ENV !== "production" && (
        <div className="mb-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          DEV: JobsMap mounted — {pins.length} total pins, {visiblePins.length} visible
        </div>
      )}
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
          <p className="text-sm text-[var(--muted-foreground)]">No pins match the current filters.</p>
        </div>
      ) : (
        <div className="relative">
          {pinOverload && (
            <div className="mb-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              Showing {visiblePins.length} pins — use filters to narrow down for best performance.
            </div>
          )}
          <LeafletMap pins={visiblePins} onPinClick={handlePinClick} />

          {selected && (
            <PinDetailPanel
              pin={selected}
              onClose={() => setSelected(null)}
              onCopy={handleCopy}
              copied={copied}
            />
          )}
        </div>
      )}
    </div>
  );
}
