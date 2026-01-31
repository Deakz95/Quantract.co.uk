"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type TimelineItem = {
  id: string;
  ts: string;
  type: "job" | "quote" | "invoice" | "certificate" | "activity";
  title: string;
  description?: string;
  href?: string;
  meta?: Record<string, unknown>;
};

const TYPE_STYLES: Record<string, { bg: string; label: string }> = {
  job: { bg: "#f97316", label: "Job" },
  quote: { bg: "#3b82f6", label: "Quote" },
  invoice: { bg: "#8b5cf6", label: "Invoice" },
  certificate: { bg: "#10b981", label: "Certificate" },
  activity: { bg: "#6b7280", label: "Activity" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function TimelinePage() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/client/timeline");
      const data = await res.json();
      if (data.ok) {
        setItems(data.items || []);
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

  // Group by date
  const grouped = items.reduce<Record<string, TimelineItem[]>>((acc, item) => {
    const date = formatDate(item.ts);
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 w-24 rounded bg-[var(--muted)] mb-2" />
                <div className="h-16 rounded bg-[var(--muted)]" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-[var(--muted-foreground)]">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No activity yet. Your jobs, quotes, invoices and certificates will appear here.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, dayItems]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">{date}</p>
                <div className="relative border-l-2 border-[var(--border)] ml-3 space-y-0">
                  {dayItems.map((item, i) => {
                    const style = TYPE_STYLES[item.type] ?? TYPE_STYLES.activity;
                    const content = (
                      <div className="relative flex items-start gap-3 pl-6 py-2 group">
                        {/* Dot */}
                        <div
                          className="absolute -left-[7px] top-3 w-3 h-3 rounded-full border-2 border-[var(--background)]"
                          style={{ backgroundColor: style.bg }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge
                              className="text-[10px] px-1.5 py-0"
                              style={{ backgroundColor: style.bg, color: "#fff" }}
                            >
                              {style.label}
                            </Badge>
                            <span className="text-xs text-[var(--muted-foreground)]">{formatTime(item.ts)}</span>
                          </div>
                          <p className="text-sm font-medium mt-0.5">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-[var(--muted-foreground)]">{item.description}</p>
                          )}
                        </div>
                      </div>
                    );

                    return item.href ? (
                      <Link key={item.id} href={item.href} className="block hover:bg-[var(--accent)]/5 rounded">
                        {content}
                      </Link>
                    ) : (
                      <div key={item.id}>{content}</div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
