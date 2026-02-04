"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiRequest, getApiErrorMessage } from "@/lib/apiClient";
import { RefreshCcw, AlertTriangle, ClipboardCheck, Clock, CheckCircle, Download } from "lucide-react";

type ScheduledCheckItem = {
  id: string;
  title: string;
  isRequired: boolean;
  status: string;
  completedAt: string | null;
};

type AssetInfo = {
  id: string;
  type: string;
  name: string;
  identifier: string | null;
};

type ScheduledCheck = {
  id: string;
  title: string;
  status: string;
  dueAt: string;
  completedAt: string | null;
  documentId: string | null;
  engineerId: string | null;
  notes: string | null;
  items: ScheduledCheckItem[];
  asset: AssetInfo | null;
};

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "overdue", label: "Overdue" },
] as const;

function getStatusVariant(status: string) {
  switch (status) {
    case "completed": return "success" as const;
    case "overdue": return "destructive" as const;
    case "pending": return "warning" as const;
    default: return "secondary" as const;
  }
}

function isOverdue(check: ScheduledCheck): boolean {
  return check.status === "pending" && new Date(check.dueAt) < new Date();
}

export default function AdminScheduledChecksPage() {
  const loadedRef = useRef(false);

  const [items, setItems] = useState<ScheduledCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const load = useCallback(async (status?: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const qs = status ? `?status=${status}` : "";
      const data = await apiRequest<{ ok: boolean; data?: ScheduledCheck[] }>(
        `/api/admin/scheduled-checks${qs}`,
        { cache: "no-store" },
      );
      setItems(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to load scheduled checks");
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadedRef.current) loadedRef.current = true;
    load(statusFilter);
  }, [load, statusFilter]);

  const pendingCount = items.filter((c) => c.status === "pending").length;
  const overdueCount = items.filter(isOverdue).length;
  const completedCount = items.filter((c) => c.status === "completed").length;

  return (
    <AppShell role="admin" title="Scheduled Checks" subtitle="Van, ladder, and scaffold inspections">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === tab.key
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={() => load(statusFilter)} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold text-[var(--foreground)]">{pendingCount}</div>
                  <div className="text-sm font-medium text-[var(--muted-foreground)] mt-1">Pending</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold text-[var(--foreground)]">{overdueCount}</div>
                  <div className="text-sm font-medium text-[var(--muted-foreground)] mt-1">Overdue</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold text-[var(--foreground)]">{completedCount}</div>
                  <div className="text-sm font-medium text-[var(--muted-foreground)] mt-1">Completed</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Checks Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {statusFilter
                ? `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Checks`
                : "All Scheduled Checks"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                    <LoadingSkeleton className="h-4 w-40" />
                    <LoadingSkeleton className="mt-2 h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div className="error-state">
                <AlertTriangle className="error-state-icon" />
                <div className="error-state-title">Unable to load checks</div>
                <p className="error-state-description">{loadError}</p>
                <Button variant="secondary" onClick={() => load(statusFilter)} className="mt-4">
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No scheduled checks"
                description={statusFilter ? `No ${statusFilter} checks found.` : "Create checks from checklist templates to get started."}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--foreground)]">Check</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--foreground)]">Asset</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--foreground)]">Due</th>
                      <th className="py-3 px-4 text-center text-xs font-semibold text-[var(--foreground)]">Items</th>
                      <th className="py-3 px-4 text-center text-xs font-semibold text-[var(--foreground)]">Status</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((check, index) => {
                      const overdue = isOverdue(check);
                      const doneCount = check.items?.filter((i) => i.status === "completed").length ?? 0;
                      const totalCount = check.items?.length ?? 0;
                      return (
                        <tr
                          key={check.id}
                          className={`border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${
                            index % 2 === 0 ? "bg-[var(--card)]" : "bg-[var(--muted)]/50"
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[var(--foreground)]">{check.title}</div>
                            {check.notes && (
                              <div className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-1">{check.notes}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {check.asset ? (
                              <div>
                                <div className="text-sm text-[var(--foreground)]">{check.asset.name}</div>
                                <div className="text-xs text-[var(--muted-foreground)]">
                                  {check.asset.type}{check.asset.identifier ? ` — ${check.asset.identifier}` : ""}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-[var(--muted-foreground)]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-sm ${overdue ? "text-red-600 font-semibold" : "text-[var(--foreground)]"}`}>
                              {new Date(check.dueAt).toLocaleDateString("en-GB")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-sm text-[var(--foreground)]">
                              {doneCount}/{totalCount}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={overdue ? "destructive" : getStatusVariant(check.status)}>
                              {overdue ? "Overdue" : check.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {check.status === "completed" && check.documentId && (
                              <a
                                href={`/api/admin/scheduled-checks/${check.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                              >
                                <Download className="w-3.5 h-3.5" />
                                PDF
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
