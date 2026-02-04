"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { FeatureGate } from "@/components/billing/FeatureGate";
import { useBillingStatus } from "@/components/billing/useBillingStatus";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useToast } from "@/components/ui/useToast";

import { apiRequest, getApiErrorMessage } from "@/lib/apiClient";
import { isTimesheetsEnabled } from "@/lib/billing/plans";
import { EmptyState } from "@/components/ui/EmptyState";
import { RefreshCcw, AlertTriangle, Clock, CheckCircle, XCircle } from "lucide-react";

type TimesheetSummary = {
  id: string;
  engineerEmail?: string;
  engineerId?: string;
  engineer?: { id: string; name?: string; email: string };
  weekStartISO?: string;
  weekStart?: string;
  status: string;
  timeEntries?: { startedAt: string; endedAt?: string; breakMinutes: number }[];
};

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "submitted", label: "Submitted" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
] as const;

function computeTotalHours(entries?: { startedAt: string; endedAt?: string; breakMinutes: number }[]): string {
  if (!entries || entries.length === 0) return "—";
  let total = 0;
  for (const e of entries) {
    if (!e.endedAt) continue;
    const ms = new Date(e.endedAt).getTime() - new Date(e.startedAt).getTime();
    total += ms / 3600000 - (e.breakMinutes || 0) / 60;
  }
  return total > 0 ? total.toFixed(1) + "h" : "—";
}

export default function AdminTimesheetsPage() {
  const loadedRef = useRef(false);
  const { toast } = useToast();

  const [items, setItems] = useState<TimesheetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("submitted");
  const [bulkBusy, setBulkBusy] = useState(false);

  const { status: billingStatus } = useBillingStatus();
  const timesheetsEnabled = billingStatus ? isTimesheetsEnabled(billingStatus.plan) : true;

  const load = useCallback(async (status?: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const qs = status ? `?status=${status}` : "";
      const data = await apiRequest<{ ok: boolean; items?: TimesheetSummary[] }>(
        `/api/admin/timesheets${qs}`,
        { cache: "no-store" }
      );
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to load timesheets");
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadedRef.current) {
      load(statusFilter);
    } else {
      loadedRef.current = true;
      load(statusFilter);
    }
  }, [load, statusFilter]);

  const submittedCount = items.filter(t => t.status === "submitted").length;
  const approvedCount = items.filter(t => t.status === "approved").length;

  const submittedIds = useMemo(
    () => items.filter(t => t.status === "submitted").map(t => t.id),
    [items]
  );

  async function bulkApprove() {
    if (submittedIds.length === 0) return;
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    for (const id of submittedIds) {
      try {
        await apiRequest(`/api/admin/timesheets/${id}/approve`, { method: "POST" });
        ok++;
      } catch {
        fail++;
      }
    }
    setBulkBusy(false);
    toast({
      title: "Bulk approve",
      description: `${ok} approved${fail ? `, ${fail} failed` : ""}`,
      variant: fail ? "destructive" : "success",
    });
    load(statusFilter);
  }

  function getEngineerDisplay(t: TimesheetSummary): string {
    if (t.engineer?.name) return t.engineer.name;
    if (t.engineer?.email) return t.engineer.email;
    return t.engineerEmail || t.engineerId || "Engineer";
  }

  function getWeekDate(t: TimesheetSummary): string {
    const raw = t.weekStartISO || t.weekStart;
    if (!raw) return "—";
    return new Date(raw).toLocaleDateString("en-GB");
  }

  return (
    <AppShell role="admin" title="Timesheets" subtitle="Approve time entries and monitor labour cost">
      <div className="space-y-6">
        <FeatureGate
          enabled={timesheetsEnabled}
          title="Timesheets are on Team and Pro plans"
          description="Upgrade to unlock engineer timesheets and approvals."
          ctaLabel="Upgrade to Team"
        >
          {/* Header Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {STATUS_TABS.map(tab => (
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

            <div className="flex flex-wrap items-center gap-2">
              {submittedIds.length > 0 && (
                <Button variant="default" size="sm" onClick={bulkApprove} disabled={bulkBusy}>
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  {bulkBusy ? "Approving..." : `Approve All (${submittedIds.length})`}
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => load(statusFilter)} disabled={loading}>
                <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-bold text-[var(--foreground)]">{submittedCount}</div>
                    <div className="text-sm font-medium text-[var(--muted-foreground)] mt-1">Pending Approval</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-bold text-[var(--foreground)]">{approvedCount}</div>
                    <div className="text-sm font-medium text-[var(--muted-foreground)] mt-1">Approved This Period</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Timesheets Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                {statusFilter ? `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Timesheets` : "All Timesheets"}
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
                  <div className="error-state-title">Unable to load timesheets</div>
                  <p className="error-state-description">{loadError}</p>
                  <Button variant="secondary" onClick={() => load(statusFilter)} className="mt-4">
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="No timesheets found"
                  description={statusFilter ? `No ${statusFilter} timesheets.` : "Check back once engineers submit their week."}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--foreground)]">Engineer</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--foreground)]">Week Starting</th>
                        <th className="py-3 px-4 text-center text-xs font-semibold text-[var(--foreground)]">Hours</th>
                        <th className="py-3 px-4 text-center text-xs font-semibold text-[var(--foreground)]">Status</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((t, index) => (
                        <tr
                          key={t.id}
                          className={`border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${
                            index % 2 === 0 ? "bg-[var(--card)]" : "bg-[var(--muted)]/50"
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[var(--foreground)]">{getEngineerDisplay(t)}</div>
                            {t.engineer?.email && t.engineer.name && (
                              <div className="text-xs text-[var(--muted-foreground)]">{t.engineer.email}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-[var(--foreground)]">{getWeekDate(t)}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-sm font-medium text-[var(--foreground)]">
                              {computeTotalHours(t.timeEntries)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              variant={
                                t.status === "submitted" ? "warning" :
                                t.status === "approved" ? "success" :
                                t.status === "rejected" ? "destructive" :
                                "default"
                              }
                            >
                              {t.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link href={`/admin/timesheets/${t.id}`}>
                              <Button type="button" variant="secondary" size="sm">
                                Review
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </FeatureGate>
      </div>
    </AppShell>
  );
}
