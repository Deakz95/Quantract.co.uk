"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Alert {
  id: string;
  status: string;
  dueAt: string;
  message: string | null;
  asset?: { id: string; name: string; type: string | null };
  rule?: { id: string; name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  ack: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  dismissed: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

export default function MaintenanceAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("open");

  useEffect(() => {
    setLoading(true);
    const params = filter ? `?status=${filter}` : "";
    fetch(`/api/admin/maintenance/alerts${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setAlerts(d.data); })
      .finally(() => setLoading(false));
  }, [filter]);

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/maintenance/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }
  }

  return (
    <AppShell role="admin" title="Maintenance Alerts" subtitle="Track upcoming and overdue maintenance tasks">
      <div className="space-y-4">
        {/* Filter buttons */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "open", label: "Open" },
            { value: "ack", label: "Acknowledged" },
            { value: "dismissed", label: "Dismissed" },
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
        </div>

        {/* Content */}
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
              {filter ? `No ${filter} alerts. Try a different filter or check back later.` : "No maintenance alerts have been generated yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[alert.status] || "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
                      {alert.status}
                    </span>
                    <span className="text-sm text-[var(--muted-foreground)]">
                      Due {new Date(alert.dueAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{alert.message}</p>
                  {alert.asset && (
                    <span className="text-xs text-[var(--primary)]">
                      {alert.asset.name}{alert.asset.type ? ` (${alert.asset.type})` : ""}
                    </span>
                  )}
                  {alert.rule && (
                    <span className="text-xs text-[var(--muted-foreground)] ml-2">Rule: {alert.rule.name}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  {alert.status === "open" && (
                    <Button size="sm" variant="secondary" onClick={() => updateStatus(alert.id, "ack")}>
                      Acknowledge
                    </Button>
                  )}
                  {(alert.status === "open" || alert.status === "ack") && (
                    <Button size="sm" variant="ghost" onClick={() => updateStatus(alert.id, "dismissed")}>
                      Dismiss
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
