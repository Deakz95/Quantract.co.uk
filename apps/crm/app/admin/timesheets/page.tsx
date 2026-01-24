"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { FeatureGate } from "@/components/billing/FeatureGate";
import { useBillingStatus } from "@/components/billing/useBillingStatus";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

import { apiRequest, getApiErrorMessage } from "@/lib/apiClient";
import { isTimesheetsEnabled } from "@/lib/billing/plans";
import { RefreshCcw, AlertTriangle, Clock, CheckCircle } from "lucide-react";

type TimesheetSummary = {
  id: string;
  engineerEmail?: string;
  engineerId?: string;
  weekStartISO: string;
  status: string;
};

export default function AdminTimesheetsPage() {
  const loadedRef = useRef(false);

  const [items, setItems] = useState<TimesheetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { status: billingStatus } = useBillingStatus();
  const timesheetsEnabled = billingStatus ? isTimesheetsEnabled(billingStatus.plan) : true;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiRequest<{ items?: TimesheetSummary[] }>(
        "/api/admin/timesheets?status=submitted",
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
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, [load]);

  const submittedCount = items.filter(t => t.status === 'submitted').length;
  const approvedCount = items.filter(t => t.status === 'approved').length;

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
          <div className="flex flex-wrap items-center justify-end gap-4">
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
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
              <CardTitle>Submitted Timesheets</CardTitle>
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
                  <Button variant="secondary" onClick={load} className="mt-4">
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <div className="empty-state">
                  <Clock className="empty-state-icon" />
                  <div className="empty-state-title">No submitted timesheets</div>
                  <p className="empty-state-description">Check back once engineers submit their week.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--foreground)]">Engineer</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--foreground)]">Week Starting</th>
                        <th className="py-3 px-4 text-center text-xs font-semibold text-[var(--foreground)]">Status</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((t, index) => (
                        <tr
                          key={t.id}
                          className={`border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${
                            index % 2 === 0 ? 'bg-[var(--card)]' : 'bg-[var(--muted)]/50'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[var(--foreground)]">{t.engineerEmail || t.engineerId || "Engineer"}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-[var(--foreground)]">
                              {new Date(t.weekStartISO).toLocaleDateString("en-GB")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={t.status === 'submitted' ? 'warning' : 'default'}>{t.status}</Badge>
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
