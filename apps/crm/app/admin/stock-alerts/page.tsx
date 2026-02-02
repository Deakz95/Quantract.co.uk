"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface StockAlert {
  id: string;
  type: string;
  entityId: string;
  status: string;
  message: string;
  meta: { stockItemId?: string; userId?: string; qty?: number; minQty?: number } | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export default function StockAlertsPage() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ type: "truck_stock_low", limit: "50" });
    if (filter) params.set("status", filter);

    fetch(`/api/admin/stock-alerts?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setAlerts(d.data);
          setTotal(d.total ?? d.data.length);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  async function resolve(id: string) {
    // Optimistic
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setTotal((t) => Math.max(0, t - 1));

    const res = await fetch(`/api/admin/stock-alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });
    if (!res.ok) {
      // Revert — reload
      setFilter((f) => f);
    }
  }

  function stockLink(alert: StockAlert) {
    const params = new URLSearchParams();
    if (alert.meta?.userId) params.set("engineer", alert.meta.userId);
    const qs = params.toString();
    return `/admin/truck-stock${qs ? `?${qs}` : ""}`;
  }

  return (
    <AppShell role="admin" title="Stock Alerts" subtitle="Low stock notifications across all vehicles">
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { value: "open", label: "Open" },
            { value: "resolved", label: "Resolved" },
            { value: "", label: "All" },
          ].map((s) => (
            <Button
              key={s.value}
              size="sm"
              variant={filter === s.value ? "default" : "secondary"}
              onClick={() => setFilter(s.value)}
            >
              {s.label}
            </Button>
          ))}
          {total > 0 && (
            <span className="text-xs text-[var(--muted-foreground)] ml-2">{total} alert{total !== 1 ? "s" : ""}</span>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-[var(--muted-foreground)]">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading alerts...
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-[var(--muted-foreground)] opacity-50" />
            <p className="text-sm font-medium text-[var(--foreground)] mb-1">No alerts found</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {filter === "open"
                ? "All stock levels are healthy."
                : "No stock alerts match this filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {alert.status === "open" ? (
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[alert.status] || "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}
                      >
                        {alert.status}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {new Date(alert.updatedAt).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{alert.message}</p>
                    {alert.meta && alert.meta.qty != null && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        Current: {alert.meta.qty} / Minimum: {alert.meta.minQty}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Link href={stockLink(alert)}>
                    <Button size="sm" variant="secondary">View Stock</Button>
                  </Link>
                  {alert.status === "open" && (
                    <Button size="sm" variant="ghost" onClick={() => resolve(alert.id)}>
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
