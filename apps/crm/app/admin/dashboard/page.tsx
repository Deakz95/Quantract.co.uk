'use client';

import { useEffect, useState } from 'react';
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, FileText, Receipt, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(r => r.json())
      .then(j => { setData(j.data); setLoading(false); });
  }, []);

  const sum = (obj: any): number => {
    if (!obj) return 0;
    return Object.values(obj).reduce((a: number, b: any) => a + (b ? b._count || b : 0), 0) as number;
  };

  return (
    <AppShell role="admin" title="Dashboard" subtitle="Overview of your business performance">
      {loading ? (
        <div className="p-8 text-center text-[var(--muted-foreground)]">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          Loading dashboard...
        </div>
      ) : !data ? (
        <div className="p-8 text-center text-[var(--muted-foreground)]">
          Unable to load dashboard data
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/admin/jobs">
              <Card variant="interactive" className="h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-bold text-[var(--foreground)]">{sum(data.counts?.jobs)}</div>
                    <div className="text-sm font-medium text-[var(--foreground)] mt-1">Active Jobs</div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/quotes">
              <Card variant="interactive" className="h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-bold text-[var(--foreground)]">{data.quotes?.pendingCount || 0}</div>
                    <div className="text-sm font-medium text-[var(--foreground)] mt-1">Quotes Pending</div>
                    {data.quotes?.pendingValue > 0 && (
                      <div className="text-xs text-[var(--muted-foreground)] mt-1">
                        £{(data.quotes.pendingValue / 100).toFixed(2)} value
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/invoices">
              <Card variant="interactive" className="h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                      <Receipt className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-bold text-[var(--foreground)]">{data.invoices?.overdueCount || 0}</div>
                    <div className="text-sm font-medium text-[var(--foreground)] mt-1">Overdue Invoices</div>
                    {data.invoices?.unpaidTotal > 0 && (
                      <div className="text-xs text-[var(--muted-foreground)] mt-1">
                        £{(data.invoices.unpaidTotal / 100).toFixed(2)} unpaid
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/timesheets">
              <Card variant="interactive" className="h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-bold text-[var(--foreground)]">{data.counts?.timesheetsPendingApproval || 0}</div>
                    <div className="text-sm font-medium text-[var(--foreground)] mt-1">Timesheets Pending</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Alerts Section */}
          {(data.invoices?.unpaidTotal > 0 || data.counts?.timesheetsPendingApproval > 0) && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />
                  <CardTitle>Alerts</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.invoices?.unpaidTotal > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--warning)]/10 border border-[var(--warning)]/20">
                      <div className="flex items-center gap-3">
                        <Receipt className="w-5 h-5 text-[var(--warning)]" />
                        <span className="text-sm text-[var(--foreground)]">Overdue invoices total</span>
                      </div>
                      <Badge variant="warning">£{(data.invoices.unpaidTotal / 100).toFixed(2)}</Badge>
                    </div>
                  )}
                  {data.counts?.timesheetsPendingApproval > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-[var(--primary)]" />
                        <span className="text-sm text-[var(--foreground)]">Timesheets awaiting approval</span>
                      </div>
                      <Badge variant="secondary">{data.counts.timesheetsPendingApproval}</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}
