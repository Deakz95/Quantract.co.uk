"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

interface Alert {
  id: string;
  status: string;
  dueAt: string;
  message: string | null;
  asset?: { id: string; name: string; type: string | null };
  rule?: { id: string; name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-red-100 text-red-800",
  ack: "bg-yellow-100 text-yellow-800",
  dismissed: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-800",
};

export default function MaintenanceAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("open");

  useEffect(() => {
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
    <AppShell role="admin" title="Maintenance Alerts">
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Maintenance Alerts</h1>
        <div className="flex gap-2">
          {["open", "ack", "dismissed", ""].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded text-sm ${filter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : alerts.length === 0 ? (
        <p className="text-gray-500">No alerts found.</p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="border rounded-lg p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[alert.status] || "bg-gray-100"}`}>
                    {alert.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    Due {new Date(alert.dueAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm font-medium">{alert.message}</p>
                {alert.asset && (
                  <Link href={`/admin/maintenance/alerts`} className="text-xs text-blue-600 hover:underline">
                    {alert.asset.name}{alert.asset.type ? ` (${alert.asset.type})` : ""}
                  </Link>
                )}
                {alert.rule && (
                  <span className="text-xs text-gray-400 ml-2">Rule: {alert.rule.name}</span>
                )}
              </div>
              <div className="flex gap-1">
                {alert.status === "open" && (
                  <button onClick={() => updateStatus(alert.id, "ack")} className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200">
                    Acknowledge
                  </button>
                )}
                {(alert.status === "open" || alert.status === "ack") && (
                  <button onClick={() => updateStatus(alert.id, "dismissed")} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                    Dismiss
                  </button>
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
