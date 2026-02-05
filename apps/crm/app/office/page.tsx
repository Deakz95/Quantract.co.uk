"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PwaInstallPrompt } from "@/components/office/PwaInstallPrompt";
import {
  CalendarDays,
  CheckCircle,
  AlertTriangle,
  BadgeCheck,
  TrendingDown,
  RefreshCcw,
  ArrowRight,
  Clock,
  Receipt,
} from "lucide-react";

type SummaryData = {
  dispatch: {
    todayCount: number;
    entries: Array<{
      id: string;
      startAt: string;
      endAt: string;
      job: { id: string; title: string | null; status: string } | null;
      engineer: { id: string; name: string | null; email: string } | null;
    }>;
  };
  approvals: {
    timesheetsPending: number;
    expensesPending: number;
    total: number;
  };
  compliance: {
    overdueChecks: number;
    upcomingChecks: number;
    upcomingItems: Array<{
      id: string;
      title: string;
      dueAt: string;
      asset: { id: string; name: string; type: string } | null;
    }>;
  };
  profitLeakage: {
    overdueInvoiceCount: number;
    overdueInvoiceTotal: number;
    overdueInvoices: Array<{
      id: string;
      invoiceNumber: string | null;
      clientName: string;
      total: number;
      dueAt: string | null;
    }>;
    unbilledJobCount: number;
    unbilledTotal: number;
    unbilledJobs: Array<{
      id: string;
      title: string | null;
      jobNumber: number | null;
      budgetTotal: number;
    }>;
  };
  problems: {
    overdueChecks: number;
    overdueInvoiceCount: number;
    activeJobCount: number;
  };
};

function formatCurrency(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function OfficeControlRoomPage() {
  const loadedRef = useRef(false);
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/office/summary", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load");
      setData(json.data);
    } catch (e: any) {
      setError(e.message || "Failed to load office summary");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      load();
    }
  }, [load]);

  const problemCount = data
    ? data.problems.overdueChecks + data.problems.overdueInvoiceCount
    : 0;

  return (
    <AppShell role="office" title="Office Control Room" subtitle="Daily operations at a glance">
      <PwaInstallPrompt />
      <div className="space-y-6">
        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-[var(--muted-foreground)]">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loading && !data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <LoadingSkeleton className="h-4 w-32 mb-3" />
                  <LoadingSkeleton className="h-8 w-16 mb-2" />
                  <LoadingSkeleton className="h-3 w-48" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <div className="text-sm font-medium text-[var(--foreground)]">Unable to load office data</div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">{error}</p>
              <Button variant="secondary" size="sm" onClick={load} className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : data ? (
          <>
            {/* Widget Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Dispatch Today */}
              <Card className="col-span-1">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <CalendarDays className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-sm font-semibold text-[var(--foreground)]">Dispatch Today</div>
                    </div>
                    <span className="text-2xl font-bold text-[var(--foreground)]">{data.dispatch.todayCount}</span>
                  </div>
                  {data.dispatch.entries.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {data.dispatch.entries.slice(0, 4).map((e) => (
                        <div key={e.id} className="flex items-center justify-between text-xs">
                          <div className="truncate flex-1">
                            <span className="font-medium text-[var(--foreground)]">
                              {e.engineer?.name || e.engineer?.email || "Unassigned"}
                            </span>
                            <span className="text-[var(--muted-foreground)]"> — {e.job?.title || "Job"}</span>
                          </div>
                          <span className="text-[var(--muted-foreground)] ml-2 shrink-0">{formatTime(e.startAt)}</span>
                        </div>
                      ))}
                      {data.dispatch.entries.length > 4 && (
                        <div className="text-xs text-[var(--muted-foreground)]">
                          +{data.dispatch.entries.length - 4} more
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--muted-foreground)] mb-3">No jobs scheduled today.</p>
                  )}
                  <Link href="/office/dispatch" className="text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1">
                    View Schedule <ArrowRight className="w-3 h-3" />
                  </Link>
                </CardContent>
              </Card>

              {/* Approvals */}
              <Card className="col-span-1">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-sm font-semibold text-[var(--foreground)]">Approvals</div>
                    </div>
                    <span className="text-2xl font-bold text-[var(--foreground)]">{data.approvals.total}</span>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-[var(--foreground)]">
                        <Clock className="w-3 h-3" /> Timesheets
                      </span>
                      <Badge variant={data.approvals.timesheetsPending > 0 ? "warning" : "secondary"}>
                        {data.approvals.timesheetsPending}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-[var(--foreground)]">
                        <Receipt className="w-3 h-3" /> Expenses
                      </span>
                      <Badge variant={data.approvals.expensesPending > 0 ? "warning" : "secondary"}>
                        {data.approvals.expensesPending}
                      </Badge>
                    </div>
                  </div>
                  <Link href="/office/approvals" className="text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1">
                    Review All <ArrowRight className="w-3 h-3" />
                  </Link>
                </CardContent>
              </Card>

              {/* Today's Problems */}
              <Card className="col-span-1">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        problemCount > 0
                          ? "bg-gradient-to-br from-red-500 to-red-600"
                          : "bg-gradient-to-br from-emerald-500 to-emerald-600"
                      }`}>
                        <AlertTriangle className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-sm font-semibold text-[var(--foreground)]">Today&apos;s Problems</div>
                    </div>
                    <span className="text-2xl font-bold text-[var(--foreground)]">{problemCount}</span>
                  </div>
                  <div className="space-y-2 mb-3">
                    {data.problems.overdueChecks > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--foreground)]">Overdue checks</span>
                        <Badge variant="destructive">{data.problems.overdueChecks}</Badge>
                      </div>
                    )}
                    {data.problems.overdueInvoiceCount > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--foreground)]">Overdue invoices</span>
                        <Badge variant="destructive">{data.problems.overdueInvoiceCount}</Badge>
                      </div>
                    )}
                    {problemCount === 0 && (
                      <p className="text-xs text-[var(--muted-foreground)]">No issues detected today.</p>
                    )}
                  </div>
                  <Link href="/office/alerts" className="text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1">
                    View Alerts <ArrowRight className="w-3 h-3" />
                  </Link>
                </CardContent>
              </Card>

              {/* Compliance */}
              <Card className="col-span-1">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        data.compliance.overdueChecks > 0
                          ? "bg-gradient-to-br from-red-500 to-red-600"
                          : "bg-gradient-to-br from-violet-500 to-violet-600"
                      }`}>
                        <BadgeCheck className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-sm font-semibold text-[var(--foreground)]">Compliance</div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--foreground)]">Overdue checks</span>
                      <Badge variant={data.compliance.overdueChecks > 0 ? "destructive" : "secondary"}>
                        {data.compliance.overdueChecks}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--foreground)]">Due within 7 days</span>
                      <Badge variant={data.compliance.upcomingChecks > 0 ? "warning" : "secondary"}>
                        {data.compliance.upcomingChecks}
                      </Badge>
                    </div>
                    {data.compliance.upcomingItems.slice(0, 2).map((c) => (
                      <div key={c.id} className="text-xs text-[var(--muted-foreground)] truncate">
                        {c.title} — due {formatDate(c.dueAt)}
                      </div>
                    ))}
                  </div>
                  <Link href="/office/compliance" className="text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1">
                    View Compliance <ArrowRight className="w-3 h-3" />
                  </Link>
                </CardContent>
              </Card>

              {/* Profit Leakage */}
              <Card className="col-span-1 md:col-span-2">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        data.profitLeakage.overdueInvoiceCount + data.profitLeakage.unbilledJobCount > 0
                          ? "bg-gradient-to-br from-orange-500 to-orange-600"
                          : "bg-gradient-to-br from-emerald-500 to-emerald-600"
                      }`}>
                        <TrendingDown className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-sm font-semibold text-[var(--foreground)]">Profit Leakage</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-medium text-[var(--muted-foreground)] mb-2">Overdue Invoices</div>
                      {data.profitLeakage.overdueInvoices.length > 0 ? (
                        <div className="space-y-1.5">
                          {data.profitLeakage.overdueInvoices.slice(0, 4).map((inv) => (
                            <div key={inv.id} className="flex items-center justify-between text-xs">
                              <span className="truncate text-[var(--foreground)]">{inv.invoiceNumber || "Draft"} — {inv.clientName}</span>
                              <span className="font-medium text-red-600 ml-2 shrink-0">{formatCurrency(inv.total)}</span>
                            </div>
                          ))}
                          <div className="text-xs font-semibold text-red-600 pt-1 border-t border-[var(--border)]">
                            Total: {formatCurrency(data.profitLeakage.overdueInvoiceTotal)}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--muted-foreground)]">No overdue invoices.</p>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-[var(--muted-foreground)] mb-2">Unbilled Completed Jobs</div>
                      {data.profitLeakage.unbilledJobs.length > 0 ? (
                        <div className="space-y-1.5">
                          {data.profitLeakage.unbilledJobs.slice(0, 4).map((job) => (
                            <div key={job.id} className="flex items-center justify-between text-xs">
                              <span className="truncate text-[var(--foreground)]">
                                {job.jobNumber ? `#${job.jobNumber}` : "Job"} — {job.title || "Untitled"}
                              </span>
                              <span className="font-medium text-orange-600 ml-2 shrink-0">{formatCurrency(job.budgetTotal)}</span>
                            </div>
                          ))}
                          <div className="text-xs font-semibold text-orange-600 pt-1 border-t border-[var(--border)]">
                            Total: {formatCurrency(data.profitLeakage.unbilledTotal)}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--muted-foreground)]">All completed jobs billed.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
