"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { BadgeCheck, AlertTriangle, RefreshCcw, ArrowRight, Clock } from "lucide-react";

type Check = {
  id: string;
  title: string;
  status: string;
  dueAt: string;
  asset: { id: string; name: string; type: string; identifier: string | null } | null;
  template: { id: string; title: string } | null;
};

type AssetWithChecks = {
  id: string;
  name: string;
  type: string;
  identifier: string | null;
  scheduledChecks: Array<{
    id: string;
    title: string;
    status: string;
    dueAt: string;
  }>;
};

type ComplianceData = {
  overdueChecks: Check[];
  upcomingChecks: Check[];
  unresolvedObservations: number;
  assetsDue: AssetWithChecks[];
  summary: {
    overdueCount: number;
    upcomingCount: number;
    unresolvedObservations: number;
    assetsWithIssues: number;
  };
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export default function OfficeCompliancePage() {
  const loadedRef = useRef(false);
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/office/compliance", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load");
      setData(json.data);
    } catch (e: any) {
      setError(e.message || "Failed to load compliance data");
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

  return (
    <AppShell role="office" title="Compliance" subtitle="Asset checks, certificate observations, and due items">
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loading && !data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <LoadingSkeleton className="h-4 w-32 mb-3" />
                  <LoadingSkeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <p className="text-sm text-[var(--foreground)]">{error}</p>
              <Button variant="secondary" size="sm" onClick={load} className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${data.summary.overdueCount > 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[var(--foreground)]">{data.summary.overdueCount}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Overdue Checks</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[var(--foreground)]">{data.summary.upcomingCount}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Due in 30 Days</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                      <BadgeCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[var(--foreground)]">{data.summary.unresolvedObservations}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Unresolved Observations</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <BadgeCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[var(--foreground)]">{data.summary.assetsWithIssues}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Assets with Issues</div>
                </CardContent>
              </Card>
            </div>

            {/* Overdue Checks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Overdue Checks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.overdueChecks.length === 0 ? (
                  <EmptyState icon={BadgeCheck} title="No overdue checks" description="All checks are up to date." />
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {data.overdueChecks.map((check) => (
                      <div key={check.id} className="flex items-center justify-between py-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[var(--foreground)]">{check.title}</div>
                          <div className="text-xs text-[var(--muted-foreground)]">
                            {check.asset?.name || "No asset"} — Due {formatDate(check.dueAt)}
                          </div>
                        </div>
                        <Badge variant="destructive">Overdue</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Checks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Upcoming Checks (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.upcomingChecks.length === 0 ? (
                  <EmptyState icon={Clock} title="No upcoming checks" description="Nothing due in the next 30 days." />
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {data.upcomingChecks.map((check) => {
                      const days = daysUntil(check.dueAt);
                      return (
                        <div key={check.id} className="flex items-center justify-between py-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[var(--foreground)]">{check.title}</div>
                            <div className="text-xs text-[var(--muted-foreground)]">
                              {check.asset?.name || "No asset"} — Due {formatDate(check.dueAt)}
                            </div>
                          </div>
                          <Badge variant={days <= 7 ? "warning" : "secondary"}>
                            {days} day{days !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assets with Issues */}
            {data.assetsDue.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Assets Requiring Attention</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-[var(--border)]">
                    {data.assetsDue.map((asset) => (
                      <div key={asset.id} className="py-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-sm font-medium text-[var(--foreground)]">
                            {asset.name}
                            {asset.identifier && <span className="text-[var(--muted-foreground)] ml-1">({asset.identifier})</span>}
                          </div>
                          <Badge variant="secondary">{asset.type}</Badge>
                        </div>
                        <div className="space-y-1">
                          {asset.scheduledChecks.map((sc) => (
                            <div key={sc.id} className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                              <Badge variant={sc.status === "overdue" ? "destructive" : "warning"} className="text-[10px]">
                                {sc.status}
                              </Badge>
                              {sc.title} — {formatDate(sc.dueAt)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
