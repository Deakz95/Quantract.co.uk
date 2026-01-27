'use client';

import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OnboardingChecklist } from "@/components/admin/OnboardingChecklist";
import { FileText, Receipt, Briefcase, TrendingUp, Clock, ArrowUpRight, Zap, Settings, Menu, X, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

type WidgetType = 'stats' | 'quickActions' | 'recentActivity' | 'teamOverview' | 'performance' | 'calendar' | 'invoiceChart' | 'jobsMap';

type Widget = {
  id: string;
  type: WidgetType;
  title: string;
  description: string;
  size: 'small' | 'medium' | 'large' | 'full';
};

// Dashboard data types
type DashboardData = {
  counts: {
    jobs: Array<{ status: string; _count: number }>;
    quotes: Array<{ status: string; _count: number }>;
    timesheetsPendingApproval: number;
  };
  quotes: {
    pendingCount: number;
    pendingValue: number;
  };
  invoices: {
    overdueCount: number;
    unpaidTotal: number;
  };
};

type Engineer = {
  id: string;
  email: string;
  name?: string;
  role?: string;
};

type Job = {
  id: string;
  title: string;
  status: string;
  Site?: { address?: string; postcode?: string };
};

type ScheduleEntry = {
  id: string;
  jobId: string;
  jobTitle?: string;
  engineerEmail?: string;
  startAtISO: string;
  endAtISO: string;
  notes?: string;
};

const DEFAULT_WIDGETS: Widget[] = [
  { id: 'stats', type: 'stats', title: 'Stats Overview', description: 'Key business metrics', size: 'full' },
  { id: 'quickActions', type: 'quickActions', title: 'Quick Actions', description: 'Frequently used actions', size: 'full' },
  { id: 'recentActivity', type: 'recentActivity', title: 'Recent Activity', description: 'Latest business activity', size: 'medium' },
  { id: 'teamOverview', type: 'teamOverview', title: 'Team Overview', description: 'Team member status', size: 'medium' },
  { id: 'performance', type: 'performance', title: 'Performance Banner', description: 'Business performance summary', size: 'full' },
];

const AVAILABLE_WIDGETS: Widget[] = [
  ...DEFAULT_WIDGETS,
  { id: 'calendar', type: 'calendar', title: 'Calendar', description: 'Upcoming appointments', size: 'medium' },
  { id: 'invoiceChart', type: 'invoiceChart', title: 'Invoice Chart', description: 'Monthly invoice breakdown', size: 'medium' },
  { id: 'jobsMap', type: 'jobsMap', title: 'Jobs Map', description: 'Geographic job distribution', size: 'large' },
];

const quickActions = [
  { label: "Create Quote", href: "/admin/quotes/new", icon: FileText },
  { label: "New Invoice", href: "/admin/invoices/new", icon: Receipt },
  { label: "Add Job", href: "/admin/jobs/new", icon: Briefcase },
  { label: "View Schedule", href: "/admin/schedule", icon: Clock },
];

// Helper to format currency
function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(1)}k`;
  }
  return `£${value.toFixed(0)}`;
}

// Helper to get job count by status
function getJobCountByStatus(jobs: Array<{ status: string; _count: number }>, statuses: string[]): number {
  return jobs.filter(j => statuses.includes(j.status)).reduce((sum, j) => sum + j._count, 0);
}

// Helper to get quote count by status
function getQuoteCountByStatus(quotes: Array<{ status: string; _count: number }>, statuses: string[]): number {
  return quotes.filter(q => statuses.includes(q.status)).reduce((sum, q) => sum + q._count, 0);
}

// Widget Components
function StatsWidget({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  const stats = data ? [
    {
      label: "Open Quotes",
      value: data.quotes.pendingCount.toString(),
      change: data.quotes.pendingValue > 0 ? `${formatCurrency(data.quotes.pendingValue)} pending` : "No pending value",
      icon: FileText,
      color: "from-blue-500 to-blue-600",
      href: "/admin/quotes",
    },
    {
      label: "Unpaid Invoices",
      value: data.invoices.overdueCount.toString(),
      change: data.invoices.unpaidTotal > 0 ? `${formatCurrency(data.invoices.unpaidTotal)} pending` : "All paid",
      icon: Receipt,
      color: "from-amber-500 to-orange-500",
      href: "/admin/invoices",
    },
    {
      label: "Active Jobs",
      value: getJobCountByStatus(data.counts.jobs, ['scheduled', 'in_progress']).toString(),
      change: getJobCountByStatus(data.counts.jobs, ['completed']) > 0
        ? `${getJobCountByStatus(data.counts.jobs, ['completed'])} completed`
        : "No completed jobs yet",
      icon: Briefcase,
      color: "from-emerald-500 to-teal-500",
      href: "/admin/jobs",
    },
    {
      label: "Timesheets",
      value: data.counts.timesheetsPendingApproval.toString(),
      change: data.counts.timesheetsPendingApproval > 0 ? "Pending approval" : "None pending",
      icon: Clock,
      color: "from-violet-500 to-purple-500",
      href: "/admin/timesheets",
    },
  ] : [];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-full">
            <CardContent className="p-5">
              <div className="w-12 h-12 rounded-xl bg-[var(--muted)] animate-pulse" />
              <div className="mt-4 space-y-2">
                <div className="h-8 w-16 bg-[var(--muted)] rounded animate-pulse" />
                <div className="h-4 w-24 bg-[var(--muted)] rounded animate-pulse" />
                <div className="h-3 w-20 bg-[var(--muted)] rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data || stats.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Open Quotes", icon: FileText, color: "from-blue-500 to-blue-600", href: "/admin/quotes" },
          { label: "Unpaid Invoices", icon: Receipt, color: "from-amber-500 to-orange-500", href: "/admin/invoices" },
          { label: "Active Jobs", icon: Briefcase, color: "from-emerald-500 to-teal-500", href: "/admin/jobs" },
          { label: "Timesheets", icon: Clock, color: "from-violet-500 to-purple-500", href: "/admin/timesheets" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card variant="interactive" className="group h-full">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold text-[var(--foreground)]">0</div>
                  <div className="text-sm font-medium text-[var(--foreground)] mt-1">{stat.label}</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-1">Get started!</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Link key={stat.label} href={stat.href}>
          <Card variant="interactive" className="group h-full">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-[var(--foreground)]">{stat.value}</div>
                <div className="text-sm font-medium text-[var(--foreground)] mt-1">{stat.label}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-1">{stat.change}</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function QuickActionsWidget() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[var(--primary)]" />
          <CardTitle>Quick Actions</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <div className="p-4 rounded-xl border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--muted)] transition-all duration-200 text-center group">
                <action.icon className="w-6 h-6 mx-auto text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors" />
                <div className="mt-2 text-sm font-medium text-[var(--foreground)]">{action.label}</div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivityWidget({ jobs, loading }: { jobs: Job[]; loading: boolean }) {
  // Build activity from recent jobs
  const recentActivity = jobs.slice(0, 5).map((job) => ({
    type: 'job',
    title: job.title || `Job ${job.id.slice(0, 8)}`,
    status: job.status === 'completed' ? 'success' : job.status === 'cancelled' ? 'error' : 'pending',
    statusLabel: job.status?.replace('_', ' ') || 'unknown',
  }));

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Badge variant="secondary">Loading...</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-[var(--muted)] animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[var(--muted)] rounded animate-pulse" />
                  <div className="h-3 w-20 bg-[var(--muted)] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <Badge variant="secondary">Last 7 days</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-[var(--muted-foreground)]">
            <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs mt-1">Create your first job to see activity here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--muted)] transition-colors">
                <div className={`w-2 h-2 rounded-full ${item.status === 'success' ? 'bg-[var(--success)]' : item.status === 'error' ? 'bg-[var(--error)]' : 'bg-[var(--warning)]'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--foreground)] truncate">{item.title}</div>
                  <div className="text-xs text-[var(--muted-foreground)] capitalize">{item.statusLabel}</div>
                </div>
                <Badge variant={item.status === 'success' ? 'success' : item.status === 'error' ? 'destructive' : 'warning'} className="text-xs capitalize">
                  {item.statusLabel}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TeamOverviewWidget({ engineers, loading }: { engineers: Engineer[]; loading: boolean }) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Team Overview</CardTitle>
            <Badge variant="outline">Loading...</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-[var(--muted)] animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-[var(--muted)] rounded animate-pulse" />
                  <div className="h-3 w-16 bg-[var(--muted)] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Team Overview</CardTitle>
          <Link href="/admin/engineers">
            <Badge variant="outline" className="cursor-pointer hover:bg-[var(--muted)]">
              View All <ArrowUpRight className="w-3 h-3 ml-1" />
            </Badge>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {engineers.length === 0 ? (
          <div className="text-center py-8 text-[var(--muted-foreground)]">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No team members yet</p>
            <Link href="/admin/engineers" className="text-xs text-[var(--primary)] hover:underline mt-1 block">
              Add your first engineer
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {engineers.slice(0, 5).map((member, i) => {
              const initials = (member.name || member.email || 'U')
                .split(' ')
                .map((n) => n[0]?.toUpperCase())
                .join('')
                .slice(0, 2);
              return (
                <div key={member.id || i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--muted)] transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-semibold text-sm">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--foreground)]">{member.name || member.email}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">{member.role || 'Engineer'}</div>
                  </div>
                  <Badge variant="success" className="text-xs">Active</Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PerformanceWidget({ data }: { data: DashboardData | null }) {
  const hasActivity = data && (
    data.quotes.pendingCount > 0 ||
    data.invoices.unpaidTotal > 0 ||
    data.counts.jobs.length > 0
  );

  return (
    <Card className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white border-0">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            {hasActivity ? (
              <>
                <h3 className="text-lg font-bold">Keep the momentum going!</h3>
                <p className="text-white/80 text-sm mt-1">
                  {data.quotes.pendingCount > 0 && `${data.quotes.pendingCount} quote${data.quotes.pendingCount !== 1 ? 's' : ''} pending. `}
                  {data.invoices.unpaidTotal > 0 && `${formatCurrency(data.invoices.unpaidTotal)} outstanding. `}
                  Check your reports for insights.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold">Welcome to Quantract!</h3>
                <p className="text-white/80 text-sm mt-1">Get started by creating your first quote or adding team members.</p>
              </>
            )}
          </div>
          <Link href="/admin/reports/profitability">
            <button className="px-6 py-2.5 bg-white text-[var(--primary)] rounded-xl font-semibold hover:bg-white/90 transition-colors">
              View Reports
            </button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarWidget({ schedule, loading }: { schedule: ScheduleEntry[]; loading: boolean }) {
  // Format date for display
  const formatScheduleTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    if (date.toDateString() === now.toDateString()) {
      return `Today, ${timeStr}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${timeStr}`;
    } else {
      return `${date.toLocaleDateString('en-GB', { weekday: 'short' })}, ${timeStr}`;
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Upcoming Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--muted)]">
                <div className="w-2 h-10 rounded-full bg-[var(--border)] animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-[var(--border)] rounded animate-pulse" />
                  <div className="h-3 w-20 bg-[var(--border)] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Upcoming Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        {schedule.length === 0 ? (
          <div className="text-center py-8 text-[var(--muted-foreground)]">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No upcoming appointments</p>
            <Link href="/admin/schedule" className="text-xs text-[var(--primary)] hover:underline mt-1 block">
              Schedule a job
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {schedule.slice(0, 5).map((entry, i) => (
              <div key={entry.id || i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--muted)]">
                <div className="w-2 h-full min-h-[40px] rounded-full bg-[var(--primary)]" />
                <div>
                  <div className="text-sm font-medium">{entry.jobTitle || entry.notes || `Job ${entry.jobId?.slice(0, 8)}`}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{formatScheduleTime(entry.startAtISO)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Link href="/admin/schedule" className="block mt-4">
          <Button variant="outline" size="sm" className="w-full">View Full Schedule</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function InvoiceChartWidget({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  const unpaidTotal = data?.invoices.unpaidTotal || 0;
  // We don't have paid invoices in the API, so we'll show what we have
  const total = unpaidTotal;
  const unpaidPercentage = total > 0 ? 100 : 0;

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Invoice Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 w-full bg-[var(--muted)] rounded animate-pulse" />
            <div className="h-3 bg-[var(--muted)] rounded-full" />
            <div className="h-4 w-full bg-[var(--muted)] rounded animate-pulse" />
            <div className="h-3 bg-[var(--muted)] rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Invoice Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="text-center py-8 text-[var(--muted-foreground)]">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No invoices yet</p>
            <Link href="/admin/invoices/new" className="text-xs text-[var(--primary)] hover:underline mt-1 block">
              Create your first invoice
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--muted-foreground)]">Unpaid</span>
              <span className="text-sm font-semibold text-[var(--warning)]">{formatCurrency(unpaidTotal)}</span>
            </div>
            <div className="h-3 bg-[var(--muted)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--warning)] rounded-full" style={{ width: `${unpaidPercentage}%` }} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--muted-foreground)]">Overdue</span>
              <span className="text-sm font-semibold text-[var(--error)]">{data?.invoices.overdueCount || 0} invoices</span>
            </div>
            <div className="pt-4 border-t border-[var(--border)]">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Outstanding Total</span>
                <span className="text-lg font-bold">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function JobsMapWidget({ data, jobs, loading }: { data: DashboardData | null; jobs: Job[]; loading: boolean }) {
  const activeCount = data ? getJobCountByStatus(data.counts.jobs, ['in_progress']) : 0;
  const scheduledCount = data ? getJobCountByStatus(data.counts.jobs, ['scheduled', 'quoted']) : 0;
  const completedCount = data ? getJobCountByStatus(data.counts.jobs, ['completed']) : 0;

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Job Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-[var(--muted)] rounded-xl animate-pulse" />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-2 bg-[var(--muted)] rounded-lg">
                <div className="h-5 w-8 mx-auto bg-[var(--border)] rounded animate-pulse" />
                <div className="h-3 w-12 mx-auto mt-1 bg-[var(--border)] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Job Locations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-[var(--muted)] rounded-xl flex items-center justify-center">
          {jobs.length === 0 ? (
            <div className="text-center text-[var(--muted-foreground)]">
              <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No jobs to display</p>
              <Link href="/admin/jobs/new" className="text-xs text-[var(--primary)] hover:underline mt-1 block">
                Create your first job
              </Link>
            </div>
          ) : (
            <div className="text-center text-[var(--muted-foreground)]">
              <div className="text-4xl mb-2">🗺️</div>
              <p className="text-sm">Map integration coming soon</p>
              <p className="text-xs mt-1">{jobs.length} job{jobs.length !== 1 ? 's' : ''} to display</p>
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-[var(--muted)] rounded-lg">
            <div className="text-lg font-bold">{activeCount}</div>
            <div className="text-xs text-[var(--muted-foreground)]">Active</div>
          </div>
          <div className="p-2 bg-[var(--muted)] rounded-lg">
            <div className="text-lg font-bold">{scheduledCount}</div>
            <div className="text-xs text-[var(--muted-foreground)]">Scheduled</div>
          </div>
          <div className="p-2 bg-[var(--muted)] rounded-lg">
            <div className="text-lg font-bold">{completedCount}</div>
            <div className="text-xs text-[var(--muted-foreground)]">Completed</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type DashboardState = {
  data: DashboardData | null;
  engineers: Engineer[];
  jobs: Job[];
  schedule: ScheduleEntry[];
  loading: boolean;
};

function renderWidget(widget: Widget, state: DashboardState) {
  switch (widget.type) {
    case 'stats': return <StatsWidget data={state.data} loading={state.loading} />;
    case 'quickActions': return <QuickActionsWidget />;
    case 'recentActivity': return <RecentActivityWidget jobs={state.jobs} loading={state.loading} />;
    case 'teamOverview': return <TeamOverviewWidget engineers={state.engineers} loading={state.loading} />;
    case 'performance': return <PerformanceWidget data={state.data} />;
    case 'calendar': return <CalendarWidget schedule={state.schedule} loading={state.loading} />;
    case 'invoiceChart': return <InvoiceChartWidget data={state.data} loading={state.loading} />;
    case 'jobsMap': return <JobsMapWidget data={state.data} jobs={state.jobs} loading={state.loading} />;
    default: return null;
  }
}

function getWidgetClassName(size: Widget['size']) {
  switch (size) {
    case 'small': return 'col-span-1';
    case 'medium': return 'col-span-1 lg:col-span-1';
    case 'large': return 'col-span-1 lg:col-span-2';
    case 'full': return 'col-span-1 lg:col-span-2';
    default: return 'col-span-1';
  }
}

export default function DashboardPage() {
  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  // Dashboard data state
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    data: null,
    engineers: [],
    jobs: [],
    schedule: [],
    loading: true,
  });

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    setDashboardState((prev) => ({ ...prev, loading: true }));

    try {
      const [dashboardRes, engineersRes, jobsRes, scheduleRes] = await Promise.all([
        fetch('/api/admin/dashboard').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/engineers').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/jobs').then((r) => r.json()).catch(() => []),
        fetch('/api/admin/schedule').then((r) => r.json()).catch(() => null),
      ]);

      setDashboardState({
        data: dashboardRes?.ok ? dashboardRes.data : null,
        engineers: engineersRes?.ok ? (engineersRes.engineers || []) : [],
        jobs: Array.isArray(jobsRes) ? jobsRes : (jobsRes?.data || []),
        schedule: scheduleRes?.ok ? (scheduleRes.entries || []) : [],
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setDashboardState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Load saved layout from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-widgets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate the saved widgets exist in AVAILABLE_WIDGETS
        const validWidgets = parsed.filter((w: Widget) =>
          AVAILABLE_WIDGETS.some(aw => aw.id === w.id)
        );
        if (validWidgets.length > 0) {
          setWidgets(validWidgets);
        }
      } catch {
        // Use defaults if parsing fails
      }
    }
  }, []);

  // Save layout to localStorage
  const saveLayout = (newWidgets: Widget[]) => {
    setWidgets(newWidgets);
    localStorage.setItem('dashboard-widgets', JSON.stringify(newWidgets));
  };

  const moveWidget = (fromIndex: number, toIndex: number) => {
    const newWidgets = [...widgets];
    const [removed] = newWidgets.splice(fromIndex, 1);
    newWidgets.splice(toIndex, 0, removed);
    saveLayout(newWidgets);
  };

  const removeWidget = (id: string) => {
    const newWidgets = widgets.filter(w => w.id !== id);
    saveLayout(newWidgets);
  };

  const addWidget = (widget: Widget) => {
    if (!widgets.some(w => w.id === widget.id)) {
      saveLayout([...widgets, widget]);
    }
    setShowAddWidget(false);
  };

  const resetToDefault = () => {
    saveLayout(DEFAULT_WIDGETS);
    setIsCustomizing(false);
  };

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetId) return;

    const fromIndex = widgets.findIndex(w => w.id === draggedWidget);
    const toIndex = widgets.findIndex(w => w.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      moveWidget(fromIndex, toIndex);
    }
    setDraggedWidget(null);
  };

  const availableToAdd = AVAILABLE_WIDGETS.filter(aw => !widgets.some(w => w.id === aw.id));

  return (
    <AppShell role="admin" title="Dashboard" subtitle="Overview of your business performance and recent activity.">
      <div className="space-y-6">
        {/* Onboarding Checklist */}
        <OnboardingChecklist />

        {/* Customize Controls */}
        <div className="flex items-center justify-end gap-2">
          {isCustomizing ? (
            <>
              <Button variant="outline" size="sm" onClick={resetToDefault}>
                Reset to Default
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowAddWidget(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Widget
              </Button>
              <Button variant="gradient" size="sm" onClick={() => setIsCustomizing(false)}>
                Done
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setIsCustomizing(true)}>
              <Settings className="w-4 h-4 mr-1" />
              Customize Dashboard
            </Button>
          )}
        </div>

        {/* Add Widget Modal */}
        {showAddWidget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowAddWidget(false)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl animate-fade-in">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Add Widget</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowAddWidget(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {availableToAdd.length === 0 ? (
                  <p className="text-[var(--muted-foreground)] text-center py-8">All available widgets are already on your dashboard.</p>
                ) : (
                  <div className="space-y-2">
                    {availableToAdd.map((widget) => (
                      <button
                        key={widget.id}
                        onClick={() => addWidget(widget)}
                        className="w-full p-4 text-left rounded-xl border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--muted)] transition-colors"
                      >
                        <div className="font-medium">{widget.title}</div>
                        <div className="text-sm text-[var(--muted-foreground)]">{widget.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className={`${getWidgetClassName(widget.size)} ${isCustomizing ? 'relative group' : ''} ${draggedWidget === widget.id ? 'opacity-50' : ''}`}
              draggable={isCustomizing}
              onDragStart={(e) => handleDragStart(e, widget.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, widget.id)}
            >
              {isCustomizing && (
                <div className="absolute -top-2 -right-2 z-10 flex gap-1">
                  <button
                    className="w-8 h-8 rounded-full bg-[var(--card)] border border-[var(--border)] shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-[var(--muted)]"
                    title="Drag to reorder"
                  >
                    <Menu className="w-4 h-4 text-[var(--muted-foreground)]" />
                  </button>
                  <button
                    onClick={() => removeWidget(widget.id)}
                    className="w-8 h-8 rounded-full bg-[var(--destructive)] text-white shadow-lg flex items-center justify-center hover:opacity-90"
                    title="Remove widget"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {isCustomizing && (
                <div className="absolute inset-0 border-2 border-dashed border-[var(--primary)] rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              {renderWidget(widget, dashboardState)}
            </div>
          ))}
        </div>

        {widgets.length === 0 && (
          <div className="text-center py-12 bg-[var(--muted)] rounded-2xl">
            <p className="text-[var(--muted-foreground)]">No widgets on your dashboard.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowAddWidget(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Your First Widget
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
