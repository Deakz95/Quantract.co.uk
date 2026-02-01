"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type TimelineItem = {
  id: string;
  ts: string;
  type: "job" | "invoice" | "certificate";
  title: string;
  subtitle?: string;
  status: string;
  amountPence?: number;
  href?: string;
  pdfHref?: string;
};

type FilterKey = "all" | "job" | "invoice" | "certificate";

const FILTER_PILLS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "job", label: "Work" },
  { key: "certificate", label: "Certificates" },
  { key: "invoice", label: "Invoices" },
];

const TYPE_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  job: { color: "#f97316", label: "Job", icon: "🔧" },
  invoice: { color: "#8b5cf6", label: "Invoice", icon: "📄" },
  certificate: { color: "#10b981", label: "Certificate", icon: "✅" },
};

const STATUS_COLORS: Record<string, string> = {
  completed: "#16a34a",
  issued: "#16a34a",
  paid: "#16a34a",
  sent: "#2563eb",
  in_progress: "#ea580c",
  scheduled: "#2563eb",
  quoted: "#9333ea",
  overdue: "#dc2626",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isYesterday(iso: string) {
  const d = new Date(iso);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate();
}

function dateLabel(iso: string) {
  if (isToday(iso)) return "Today";
  if (isYesterday(iso)) return "Yesterday";
  return formatDate(iso);
}

export default function TimelinePage() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/client/timeline");
      const data = await res.json();
      if (data.ok) {
        setItems(data.items || []);
      } else if (data.error === "feature_not_available" || data.error === "forbidden") {
        setError("Timeline is not available on your current plan.");
      } else {
        setError(data.error || "Failed to load");
      }
    } catch {
      setError("Failed to load timeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => filter === "all" ? items : items.filter((i) => i.type === filter),
    [items, filter],
  );

  // Group by date
  const grouped = useMemo(() => {
    const map: [string, TimelineItem[]][] = [];
    let lastLabel = "";
    for (const item of filtered) {
      const label = dateLabel(item.ts);
      if (label !== lastLabel) {
        map.push([label, [item]]);
        lastLabel = label;
      } else {
        map[map.length - 1][1].push(item);
      }
    }
    return map;
  }, [filtered]);

  // Counts for pills
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, job: 0, invoice: 0, certificate: 0 };
    for (const i of items) c[i.type] = (c[i.type] || 0) + 1;
    return c;
  }, [items]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Your jobs, invoices and certificates in one place.
          </p>
        </CardHeader>
        <CardContent>
          {/* Filter pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {FILTER_PILLS.map((pill) => {
              const active = filter === pill.key;
              return (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setFilter(pill.key)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors"
                  style={{
                    backgroundColor: active ? "var(--primary)" : "transparent",
                    color: active ? "var(--primary-foreground)" : "var(--foreground)",
                    borderColor: active ? "var(--primary)" : "var(--border)",
                  }}
                >
                  {pill.label}
                  <span
                    className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full"
                    style={{
                      backgroundColor: active ? "rgba(255,255,255,0.2)" : "var(--muted)",
                      color: active ? "var(--primary-foreground)" : "var(--muted-foreground)",
                    }}
                  >
                    {counts[pill.key] || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 w-20 rounded bg-[var(--muted)] mb-3" />
                  <div className="h-20 rounded-xl bg-[var(--muted)]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm font-medium text-[var(--foreground)]">No activity yet.</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Your jobs, invoices and certificates will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(([label, dayItems]) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
                    {label}
                  </p>
                  <div className="relative ml-4 border-l-2 border-[var(--border)] space-y-0">
                    {dayItems.map((item) => {
                      const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.job;
                      const statusColor = STATUS_COLORS[item.status] || "#6b7280";

                      return (
                        <div key={item.id} className="relative pl-7 py-3 first:pt-0 last:pb-0">
                          {/* Timeline dot */}
                          <div
                            className="absolute -left-[9px] top-4 first:top-1 w-4 h-4 rounded-full border-[3px] border-[var(--background)] shadow-sm"
                            style={{ backgroundColor: cfg.color }}
                          />

                          {/* Card */}
                          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                            {/* Top row: type + time */}
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{cfg.icon}</span>
                                <Badge
                                  className="text-[10px] px-1.5 py-0 font-medium"
                                  style={{ backgroundColor: cfg.color, color: "#fff" }}
                                >
                                  {cfg.label}
                                </Badge>
                                <Badge
                                  className="text-[10px] px-1.5 py-0 font-medium"
                                  style={{ backgroundColor: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}40` }}
                                >
                                  {formatStatus(item.status)}
                                </Badge>
                              </div>
                              <span className="text-[11px] text-[var(--muted-foreground)] shrink-0">
                                {formatTime(item.ts)}
                              </span>
                            </div>

                            {/* Title + subtitle */}
                            <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
                            {item.subtitle && (
                              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{item.subtitle}</p>
                            )}

                            {/* Actions */}
                            {(item.href || item.pdfHref) && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {item.href && (
                                  <Link href={item.href}>
                                    <Button variant="secondary" type="button" className="h-7 text-xs px-3">
                                      View
                                    </Button>
                                  </Link>
                                )}
                                {item.pdfHref && (
                                  <a href={item.pdfHref} target="_blank" rel="noreferrer">
                                    <Button variant="secondary" type="button" className="h-7 text-xs px-3">
                                      Download PDF
                                    </Button>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
