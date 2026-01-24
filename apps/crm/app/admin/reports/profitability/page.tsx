"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { apiRequest, getApiErrorMessage } from "@/lib/apiClient";
import { ArrowLeft, RefreshCcw, AlertTriangle, TrendingUp, Receipt } from "lucide-react";

type JobStatus = "new" | "scheduled" | "in_progress" | "completed";

type Job = {
  id: string;
  quoteId: string;
  clientName: string;
  clientEmail: string;
  siteAddress?: string;
  status: JobStatus;
  engineerEmail?: string;
  scheduledAtISO?: string;
  notes?: string;
  title?: string;
};

type JobCostingSummary = {
  jobId: string;
  budgetSubtotal: number;
  actualCost: number;
  forecastCost: number;
  actualMargin: number;
  forecastMargin: number;
  actualMarginPct: number;
  forecastMarginPct: number;
};

type ProfitRow = {
  job: Job;
  summary: JobCostingSummary;
};

function pounds(value: number) {
  return `£${Number(value || 0).toFixed(2)}`;
}

export default function ProfitabilityReportPage() {
  const loadedRef = useRef(false);
  const [rows, setRows] = useState<ProfitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<JobStatus | "">("");
  const [riskOnly, setRiskOnly] = useState(false);
  const [riskThreshold, setRiskThreshold] = useState(0.1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (status) params.set("status", status);
      if (riskOnly) params.set("risk", "1");
      params.set("riskThreshold", String(riskThreshold));
      const data = await apiRequest<{ ok: boolean; rows: ProfitRow[]; riskThreshold: number; error?: string }>(
        `/api/admin/reports/profitability?${params.toString()}`,
        { cache: "no-store" }
      );
      if (!data.ok) throw new Error(data.error || "Failed to load");
      setRows(Array.isArray(data.rows) ? data.rows : []);
      if (typeof data.riskThreshold === "number") setRiskThreshold(data.riskThreshold);
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to load profitability report");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [query, status, riskOnly, riskThreshold]);

  // Initial load only
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, []);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.budget += row.summary.budgetSubtotal;
        acc.actual += row.summary.actualCost;
        acc.forecast += row.summary.forecastCost;
        acc.forecastMargin += row.summary.forecastMargin;
        return acc;
      },
      { budget: 0, actual: 0, forecast: 0, forecastMargin: 0 }
    );
  }, [rows]);

  return (
    <AppShell role="admin" title="Profitability Report" subtitle="Track job margins and identify at-risk projects">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/admin/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {/* Filter Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[var(--foreground)]">Search</span>
                <input
                  placeholder="Job, client, engineer..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[var(--foreground)]">Status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value as JobStatus | "")}>
                  <option value="">All</option>
                  <option value="new">New</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[var(--foreground)] flex items-center gap-1">
                  Risk threshold
                  <span className="text-xs text-[var(--muted-foreground)]" title="Jobs below this margin % are flagged as at-risk">(margin %)</span>
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={riskThreshold}
                  onChange={(event) => setRiskThreshold(Number(event.target.value || 0))}
                />
              </label>
              <div className="flex flex-col gap-2 justify-end">
                <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                  <input type="checkbox" checked={riskOnly} onChange={(event) => setRiskOnly(event.target.checked)} />
                  Show risk only
                </label>
                <Button type="button" onClick={load} disabled={loading} className="w-full">
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-[var(--foreground)]">{pounds(totals.budget)}</div>
                <div className="text-sm font-medium text-[var(--muted-foreground)] mt-1">Budget</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-[var(--foreground)]">{pounds(totals.actual)}</div>
                <div className="text-sm font-medium text-[var(--muted-foreground)] mt-1">Actual Cost</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-[var(--foreground)]">{pounds(totals.forecast)}</div>
                <div className="text-sm font-medium text-[var(--muted-foreground)] mt-1">Forecast Cost</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-[var(--foreground)]">{pounds(totals.forecastMargin)}</div>
                <div className="text-sm font-medium text-[var(--muted-foreground)] mt-1">Forecast Margin</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Jobs</CardTitle>
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
            ) : error ? (
              <ErrorState
                title="Unable to load report"
                description={error}
                onRetry={load}
              />
            ) : rows.length === 0 ? (
              <EmptyState
                title="No matching jobs"
                description="Try adjusting your filters to see more results."
                icon="inbox"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--foreground)]">Job</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">Budget</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">Actual</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">Forecast</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">Margin</th>
                      <th className="py-3 px-4 text-center text-xs font-semibold text-[var(--foreground)]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const risk = row.summary.forecastMarginPct < riskThreshold;
                      return (
                        <tr
                          key={row.job.id}
                          className={`border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${
                            index % 2 === 0 ? 'bg-[var(--card)]' : 'bg-[var(--muted)]/50'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <Link href={`/admin/jobs/${row.job.id}`} className="font-semibold text-[var(--primary)] hover:underline">
                              {row.job.title || row.job.id}
                            </Link>
                            <div className="text-xs text-[var(--muted-foreground)] mt-1">
                              {row.job.clientName} • {row.job.clientEmail}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-[var(--foreground)]">{pounds(row.summary.budgetSubtotal)}</td>
                          <td className="py-3 px-4 text-right text-[var(--foreground)]">{pounds(row.summary.actualCost)}</td>
                          <td className="py-3 px-4 text-right text-[var(--foreground)]">{pounds(row.summary.forecastCost)}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-semibold text-[var(--foreground)]">{pounds(row.summary.forecastMargin)}</div>
                            <div className="text-xs text-[var(--muted-foreground)]">{Math.round(row.summary.forecastMarginPct * 100)}%</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <Badge variant="secondary">{row.job.status.replace('_', ' ')}</Badge>
                              {risk && (
                                <Badge variant="warning" className="flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Risk
                                </Badge>
                              )}
                            </div>
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
