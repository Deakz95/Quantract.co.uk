'use client';

import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OnboardingChecklist } from "@/components/admin/OnboardingChecklist";
import JobsMap from "@/components/admin/JobsMap";
import NeedsAttention from "@/components/admin/NeedsAttention";
import { SystemHealthWidget } from "@/components/admin/dashboard/SystemHealthWidget";
import {
  FileText,
  Receipt,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight,
  Zap,
  Settings,
  Menu,
  X,
  Plus,
  Users,
  RefreshCw,
  CheckCircle,
  Send,
  PoundSterling,
  Calendar,
  Award,
  Inbox,
  Target,
  AlertTriangle,
  Lock
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { getCached, setCached } from "@/lib/client/swrCache";
import { toTitleCase } from "@/lib/cn";

type WidgetType = 'stats' | 'quickActions' | 'recentActivity' | 'teamOverview' | 'performance' | 'calendar' | 'invoiceChart' | 'jobsMap' | 'revenue' | 'breakEven' | 'needsAttention' | 'lowStock' | 'maintenanceAlerts' | 'recentStockChanges' | 'systemHealth' | 'dispatchToday' | 'approvalsPending' | 'todaysProblems' | 'compliance' | 'profitLeakage';

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
    draftCount: number;
    sentCount: number;
  };
  invoices: {
    unpaidCount: number;
    overdueCount: number;
    unpaidTotal: number;
  };
  enquiries: {
    openCount: number;
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

type ActivityItem = {
  id: string;
  type: "quote_sent" | "quote_accepted" | "invoice_sent" | "invoice_paid" | "job_completed" | "job_scheduled" | "certificate_issued" | "general";
  description: string;
  entityId: string;
  entityType: string;
  timestamp: string;
  link: string;
};

type RevenueData = {
  thisMonth: {
    total: number;
    monthName: string;
  };
  lastMonth: {
    total: number;
    monthName: string;
  };
  percentChange: number;
  dailyRevenue: Array<{
    date: string;
    amount: number;
    percentage: number;
  }>;
  maxDailyRevenue: number;
};

type BreakEvenData = {
  monthlyOverheadPence: number;
  avgMarginRatio: number;
  breakEvenRevenuePence: number;
  earnedPence: number;
  progressPercent: number;
  remainingPence: number;
  daysLeft: number;
  requiredDailyPence: number;
  configured: boolean;
  earnedLabel?: string;
  earnedDefinition?: string;
  workingDaysPerMonth?: number;
};

type StockChangeItem = {
  id: string;
  stockItemId: string;
  stockItemName: string | null;
  userId: string;
  userName: string | null;
  qtyDelta: number;
  reason: string | null;
  jobId: string | null;
  createdAt: string;
};

type WidgetsData = {
  featureFlags: { truck_inventory: boolean; maintenance_alerts: boolean };
  lowStockCount: number;
  openMaintenanceAlertsCount: number;
  recentStockChanges: StockChangeItem[];
};

const DEFAULT_WIDGETS: Widget[] = [
  { id: 'needsAttention', type: 'needsAttention', title: 'Needs Attention', description: 'Items requiring action', size: 'full' },
  { id: 'stats', type: 'stats', title: 'Stats Overview', description: 'Key business metrics', size: 'full' },
  { id: 'quickActions', type: 'quickActions', title: 'Quick Actions', description: 'Frequently used actions', size: 'full' },
  { id: 'revenue', type: 'revenue', title: 'Revenue This Month', description: 'Monthly revenue with comparison', size: 'medium' },
  { id: 'breakEven', type: 'breakEven', title: 'Break-even Tracker', description: 'Monthly break-even progress', size: 'medium' },
  { id: 'recentActivity', type: 'recentActivity', title: 'Recent Activity', description: 'Latest business activity', size: 'medium' },
  { id: 'teamOverview', type: 'teamOverview', title: 'Team Overview', description: 'Team member status', size: 'medium' },
  { id: 'jobsMap', type: 'jobsMap', title: 'Jobs Map', description: 'Geographic job distribution', size: 'large' },
  { id: 'performance', type: 'performance', title: 'Performance Banner', description: 'Business performance summary', size: 'full' },
];

const AVAILABLE_WIDGETS: Widget[] = [
  ...DEFAULT_WIDGETS,
  { id: 'breakEven', type: 'breakEven', title: 'Break-even Tracker', description: 'Monthly break-even progress', size: 'medium' },
  { id: 'calendar', type: 'calendar', title: 'Calendar', description: 'Upcoming appointments', size: 'medium' },
  { id: 'invoiceChart', type: 'invoiceChart', title: 'Invoice Chart', description: 'Monthly invoice breakdown', size: 'medium' },
  { id: 'lowStock', type: 'lowStock', title: 'Low Stock', description: 'Truck stock items below minimum', size: 'small' },
  { id: 'maintenanceAlerts', type: 'maintenanceAlerts', title: 'Maintenance Alerts', description: 'Open maintenance alerts', size: 'small' },
  { id: 'recentStockChanges', type: 'recentStockChanges', title: 'Recent Stock Changes', description: 'Latest truck stock movements', size: 'medium' },
  { id: 'systemHealth', type: 'systemHealth', title: 'System Health', description: 'Error rates, webhook and cron status', size: 'small' },
  { id: 'dispatchToday', type: 'dispatchToday', title: 'Dispatch Today', description: "Today's scheduled engineers", size: 'medium' },
  { id: 'approvalsPending', type: 'approvalsPending', title: 'Approvals Pending', description: 'Pending timesheets & expenses', size: 'small' },
  { id: 'todaysProblems', type: 'todaysProblems', title: "Today's Problems", description: 'Overdue checks & invoices', size: 'medium' },
  { id: 'compliance', type: 'compliance', title: 'Compliance', description: 'Upcoming compliance items', size: 'small' },
  { id: 'profitLeakage', type: 'profitLeakage', title: 'Profit Leakage', description: 'Overdue invoices & unbilled jobs', size: 'medium' },
];

const quickActions = [
  { label: "New Quote", href: "/admin/quotes/new", icon: FileText },
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

// Helper to format currency with full precision for large numbers
function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Helper to format relative time
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Helper to get job count by status
function getJobCountByStatus(jobs: Array<{ status: string; _count: number }>, statuses: string[]): number {
  return jobs.filter(j => statuses.includes(j.status)).reduce((sum, j) => sum + j._count, 0);
}

// Helper to get activity icon
function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'quote_sent': return Send;
    case 'quote_accepted': return CheckCircle;
    case 'invoice_sent': return Receipt;
    case 'invoice_paid': return PoundSterling;
    case 'job_completed': return CheckCircle;
    case 'job_scheduled': return Calendar;
    case 'certificate_issued': return Award;
    default: return Briefcase;
  }
}

// Helper to get activity color
function getActivityColor(type: ActivityItem['type']): string {
  switch (type) {
    case 'quote_sent': return 'text-blue-500';
    case 'quote_accepted': return 'text-green-500';
    case 'invoice_sent': return 'text-amber-500';
    case 'invoice_paid': return 'text-green-500';
    case 'job_completed': return 'text-green-500';
    case 'job_scheduled': return 'text-purple-500';
    case 'certificate_issued': return 'text-teal-500';
    default: return 'text-gray-500';
  }
}

// Refresh button component
function RefreshButton({ onClick, isRefreshing }: { onClick: (e?: React.MouseEvent) => void; isRefreshing: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClick(e); }}
      disabled={isRefreshing}
      className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors disabled:opacity-50"
      title="Refresh"
    >
      <RefreshCw className={`w-4 h-4 text-[var(--muted-foreground)] ${isRefreshing ? 'animate-spin' : ''}`} />
    </button>
  );
}

// Widget Components
function StatsWidget({ data, loading, onRefresh, isRefreshing }: {
  data: DashboardData | null;
  loading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const stats = data ? [
    {
      label: "Open Quotes",
      value: data.quotes.pendingCount.toString(),
      change: data.quotes.draftCount > 0
        ? `${data.quotes.draftCount} draft, ${data.quotes.sentCount} sent`
        : data.quotes.pendingValue > 0 ? `${formatCurrency(data.quotes.pendingValue)} pending` : "No quotes awaiting response",
      icon: FileText,
      color: "from-blue-500 to-blue-600",
      href: "/admin/quotes",
    },
    {
      label: "Unpaid Invoices",
      value: data.invoices.unpaidCount.toString(),
      change: data.invoices.overdueCount > 0
        ? `${data.invoices.overdueCount} overdue — ${formatCurrency(data.invoices.unpaidTotal)} total`
        : data.invoices.unpaidTotal > 0 ? `${formatCurrency(data.invoices.unpaidTotal)} pending` : "All paid",
      icon: Receipt,
      color: data.invoices.overdueCount > 0 ? "from-red-500 to-red-600" : "from-amber-500 to-orange-500",
      href: "/admin/invoices",
      alert: data.invoices.overdueCount > 0,
    },
    {
      label: "Active Jobs",
      value: getJobCountByStatus(data.counts.jobs, ['new', 'pending', 'scheduled', 'in_progress']).toString(),
      change: (() => {
        const scheduled = getJobCountByStatus(data.counts.jobs, ['scheduled']);
        const inProgress = getJobCountByStatus(data.counts.jobs, ['in_progress']);
        const parts: string[] = [];
        if (scheduled > 0) parts.push(`${scheduled} scheduled`);
        if (inProgress > 0) parts.push(`${inProgress} in progress`);
        return parts.length > 0 ? parts.join(", ") : "Tracking active work";
      })(),
      icon: Briefcase,
      color: "from-emerald-500 to-teal-500",
      href: "/admin/jobs",
    },
    {
      label: "Open Enquiries",
      value: (data.enquiries?.openCount ?? 0).toString(),
      change: (data.enquiries?.openCount ?? 0) > 0 ? "In pipeline" : "No open enquiries",
      icon: Inbox,
      color: "from-cyan-500 to-blue-500",
      href: "/admin/enquiries",
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
          { label: "Quotes Sent", icon: FileText, color: "from-blue-500 to-blue-600", href: "/admin/quotes" },
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
                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  {(stat as any).alert && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </span>
                  )}
                </div>
                <ArrowUpRight className="w-5 h-5 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-[var(--foreground)]">{stat.value}</div>
                <div className="text-sm font-medium text-[var(--foreground)] mt-1">{stat.label}</div>
                <div className={`text-xs mt-1 ${(stat as any).alert ? "text-red-500 font-semibold" : "text-[var(--muted-foreground)]"}`}>{stat.change}</div>
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

function RecentActivityWidget({
  activities,
  loading,
  onRefresh,
  isRefreshing
}: {
  activities: ActivityItem[];
  loading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
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
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-[var(--muted)] animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-[var(--muted)] rounded animate-pulse" />
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
          <Link href="/admin/reports" className="hover:text-[var(--primary)] transition-colors">
            <CardTitle className="flex items-center gap-2 cursor-pointer">
              Recent Activity
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100" />
            </CardTitle>
          </Link>
          <div className="flex items-center gap-2">
            <RefreshButton onClick={onRefresh} isRefreshing={isRefreshing} />
            {activities.length > 1 && <Badge variant="secondary">Last {Math.min(activities.length, 10)}</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-[var(--muted-foreground)]">
            <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs mt-1">Create your first quote or job to see activity here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const IconComponent = getActivityIcon(activity.type);
              const colorClass = getActivityColor(activity.type);
              return (
                <Link key={activity.id} href={activity.link}>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--muted)] transition-colors cursor-pointer group">
                    <div className={`w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center ${colorClass}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--foreground)] truncate group-hover:text-[var(--primary)]">
                        {activity.description}
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        {formatRelativeTime(activity.timestamp)}
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RevenueWidget({
  data,
  loading,
  onRefresh,
  isRefreshing
}: {
  data: RevenueData | null;
  loading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Revenue This Month</CardTitle>
            <Badge variant="secondary">Loading...</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-10 w-32 bg-[var(--muted)] rounded animate-pulse" />
            <div className="h-4 w-40 bg-[var(--muted)] rounded animate-pulse" />
            <div className="h-24 w-full bg-[var(--muted)] rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPositive = (data?.percentChange || 0) >= 0;
  const showChart = data && data.dailyRevenue.length > 0;

  // Get last 14 days for the mini chart
  const chartDays = data?.dailyRevenue.slice(-14) || [];

  return (
    <Link href="/admin/reports/revenue">
      <Card className="h-full group cursor-pointer hover:border-[var(--primary)]/30 transition-colors">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Revenue This Month
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardTitle>
            <div className="flex items-center gap-2">
              <RefreshButton onClick={() => onRefresh()} isRefreshing={isRefreshing} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Total Revenue */}
            <div>
              <div className="text-3xl font-bold text-[var(--foreground)]">
                {data ? formatCurrencyFull(data.thisMonth.total) : '£0'}
              </div>
              <div className="text-sm text-[var(--muted-foreground)] mt-1">
                {data?.thisMonth.monthName || 'This Month'}
              </div>
            </div>

            {/* Comparison */}
            <div className="flex items-center gap-2">
              {isPositive ? (
                <div className="flex items-center text-green-500">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">+{data?.percentChange || 0}%</span>
                </div>
              ) : (
                <div className="flex items-center text-red-500">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">{data?.percentChange || 0}%</span>
                </div>
              )}
              <span className="text-sm text-[var(--muted-foreground)]">
                vs {data?.lastMonth.monthName || 'last month'}
              </span>
            </div>

            {/* Mini Bar Chart */}
            {showChart && (
              <div className="pt-4 border-t border-[var(--border)]">
                <div className="flex items-end gap-1 h-16">
                  {chartDays.map((day, i) => (
                    <div
                      key={day.date}
                      className="flex-1 bg-[var(--primary)] rounded-t opacity-60 hover:opacity-100 transition-opacity"
                      style={{
                        height: `${Math.max(day.percentage, 4)}%`,
                        minHeight: day.amount > 0 ? '4px' : '2px'
                      }}
                      title={`${new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}: ${formatCurrencyFull(day.amount)}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-[var(--muted-foreground)]">
                  <span>{chartDays[0] ? new Date(chartDays[0].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</span>
                  <span>Last 14 days</span>
                  <span>{chartDays[chartDays.length - 1] ? new Date(chartDays[chartDays.length - 1].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</span>
                </div>
              </div>
            )}

            {!showChart && (
              <div className="pt-4 border-t border-[var(--border)] text-center py-4 text-[var(--muted-foreground)]">
                <PoundSterling className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">No revenue data yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function TeamOverviewWidget({ engineers, loading, onRefresh, isRefreshing }: {
  engineers: Engineer[];
  loading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
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
          <div className="flex items-center gap-2">
            <RefreshButton onClick={onRefresh} isRefreshing={isRefreshing} />
            <Link href="/admin/engineers">
              <Badge variant="outline" className="cursor-pointer hover:bg-[var(--muted)]">
                View All <ArrowUpRight className="w-3 h-3 ml-1" />
              </Badge>
            </Link>
          </div>
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
            {engineers.filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i).slice(0, 5).map((member, i) => {
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
                    <div className="text-sm font-medium text-[var(--foreground)]">{toTitleCase(member.name) || member.email}</div>
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
    <Link href="/admin/reports/profitability">
      <Card className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white border-0 cursor-pointer hover:shadow-lg transition-shadow">
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
            <div className="px-6 py-2.5 bg-white text-[var(--primary)] rounded-xl font-semibold hover:bg-white/90 transition-colors flex items-center gap-2">
              View Reports
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CalendarWidget({ schedule, loading, onRefresh, isRefreshing }: {
  schedule: ScheduleEntry[];
  loading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
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
        <div className="flex items-center justify-between">
          <CardTitle>Upcoming Schedule</CardTitle>
          <RefreshButton onClick={onRefresh} isRefreshing={isRefreshing} />
        </div>
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

function InvoiceChartWidget({ data, loading, onRefresh, isRefreshing }: {
  data: DashboardData | null;
  loading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const unpaidTotal = data?.invoices.unpaidTotal || 0;
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
    <Link href="/admin/invoices">
      <Card className="h-full group cursor-pointer hover:border-[var(--primary)]/30 transition-colors">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Invoice Summary
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardTitle>
            <RefreshButton onClick={() => onRefresh()} isRefreshing={isRefreshing} />
          </div>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No invoices yet</p>
              <span className="text-xs text-[var(--primary)] hover:underline mt-1 block">
                Create your first invoice
              </span>
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
    </Link>
  );
}

function JobsMapWidget({ data, jobs, loading, onRefresh, isRefreshing }: {
  data: DashboardData | null;
  jobs: Job[];
  loading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
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
        <div className="flex items-center justify-between">
          <CardTitle>Job Locations</CardTitle>
          <RefreshButton onClick={() => onRefresh()} isRefreshing={isRefreshing} />
        </div>
      </CardHeader>
      <CardContent>
        <JobsMap />
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

function BreakEvenWidget({
  data,
  loading,
  onRefresh,
  isRefreshing
}: {
  data: BreakEvenData | null;
  loading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Break-even Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-10 w-32 bg-[var(--muted)] rounded animate-pulse" />
            <div className="h-4 w-full bg-[var(--muted)] rounded-full animate-pulse" />
            <div className="h-4 w-40 bg-[var(--muted)] rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.configured) {
    return (
      <Link href="/admin/settings/financials">
        <Card className="h-full group cursor-pointer hover:border-[var(--primary)]/30 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Break-even Tracker
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-[var(--muted-foreground)]">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Set up your overheads</p>
              <p className="text-xs mt-1">Add your fixed costs in Settings → Financials to track break-even.</p>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  const progress = Math.min(data.progressPercent, 100);
  const surpassed = data.progressPercent >= 100;
  const barColor = surpassed ? "bg-green-500" : progress >= 60 ? "bg-amber-500" : "bg-red-400";

  return (
    <Link href="/admin/settings/financials">
      <Card className="h-full group cursor-pointer hover:border-[var(--primary)]/30 transition-colors">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Break-even Tracker
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardTitle>
            <div className="flex items-center gap-2">
              <RefreshButton onClick={() => onRefresh()} isRefreshing={isRefreshing} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress headline */}
            <div>
              <div className="text-3xl font-bold text-[var(--foreground)]">
                {data.progressPercent}%
              </div>
              <div className="text-sm text-[var(--muted-foreground)] mt-1">
                {surpassed ? "Break-even reached!" : "of break-even target"}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-3 bg-[var(--muted)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-[var(--muted-foreground)]">{data.earnedLabel || "Earned"}</div>
                <div className="font-semibold text-[var(--foreground)]">£{(data.earnedPence / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                {data.earnedDefinition && <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{data.earnedDefinition}</div>}
              </div>
              <div>
                <div className="text-xs text-[var(--muted-foreground)]">Target</div>
                <div className="font-semibold text-[var(--foreground)]">£{(data.breakEvenRevenuePence / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              </div>
              {!surpassed && (
                <>
                  <div>
                    <div className="text-xs text-[var(--muted-foreground)]">Remaining</div>
                    <div className="font-semibold text-amber-600">£{(data.remainingPence / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--muted-foreground)]">Need/day ({data.daysLeft} work {data.daysLeft === 1 ? "day" : "days"} left)</div>
                    <div className="font-semibold text-[var(--foreground)]">£{(data.requiredDailyPence / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                  </div>
                </>
              )}
            </div>
            {data.workingDaysPerMonth && (
              <div className="text-[10px] text-[var(--muted-foreground)] mt-1">Based on {data.workingDaysPerMonth} working days/month</div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function FeatureDisabledCard({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-[var(--muted-foreground)]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-6 text-[var(--muted-foreground)]">
          <Lock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">Enable to view</p>
          <p className="text-xs mt-1">This feature is not included in your current plan.</p>
          <Link href="/admin/settings/billing" className="text-xs text-[var(--primary)] hover:underline mt-2 block">
            Upgrade plan
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function LowStockWidget({ data, loading }: { data: WidgetsData | null; loading: boolean }) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader><CardTitle>Low Stock</CardTitle></CardHeader>
        <CardContent><div className="h-16 bg-[var(--muted)] rounded animate-pulse" /></CardContent>
      </Card>
    );
  }
  if (data && !data.featureFlags.truck_inventory) {
    return <FeatureDisabledCard title="Low Stock" icon={Briefcase} />;
  }
  const count = data?.lowStockCount ?? 0;
  return (
    <Link href="/admin/truck-stock?filter=low">
      <Card variant="interactive" className="h-full group">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[var(--primary)]" />
              Low Stock
            </CardTitle>
            <ArrowUpRight className="w-4 h-4 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[var(--foreground)]">{count}</div>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {count === 0 ? 'All stock levels healthy' : `item${count !== 1 ? 's' : ''} below minimum`}
          </p>
          {count > 0 && (
            <Badge variant="destructive" className="mt-2">Needs restock</Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function MaintenanceAlertsWidget({ data, loading }: { data: WidgetsData | null; loading: boolean }) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader><CardTitle>Maintenance Alerts</CardTitle></CardHeader>
        <CardContent><div className="h-16 bg-[var(--muted)] rounded animate-pulse" /></CardContent>
      </Card>
    );
  }
  if (data && !data.featureFlags.maintenance_alerts) {
    return <FeatureDisabledCard title="Maintenance Alerts" icon={Settings} />;
  }
  const count = data?.openMaintenanceAlertsCount ?? 0;
  return (
    <Link href="/admin/maintenance/alerts">
      <Card variant="interactive" className="h-full group">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-[var(--primary)]" />
              Maintenance Alerts
            </CardTitle>
            <ArrowUpRight className="w-4 h-4 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[var(--foreground)]">{count}</div>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {count === 0 ? 'No open alerts' : `open alert${count !== 1 ? 's' : ''}`}
          </p>
          {count > 0 && (
            <Badge variant="warning" className="mt-2">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Action needed
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function RecentStockChangesWidget({ data, loading }: { data: WidgetsData | null; loading: boolean }) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader><CardTitle>Recent Stock Changes</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-[var(--muted)] rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  if (data && !data.featureFlags.truck_inventory) {
    return <FeatureDisabledCard title="Recent Stock Changes" icon={Briefcase} />;
  }
  const changes = data?.recentStockChanges ?? [];
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[var(--primary)]" />
            Recent Stock Changes
          </CardTitle>
          <Link href="/admin/truck-stock">
            <Badge variant="outline" className="cursor-pointer hover:bg-[var(--muted)]">
              View All <ArrowUpRight className="w-3 h-3 ml-1" />
            </Badge>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {changes.length === 0 ? (
          <div className="text-center py-6 text-[var(--muted-foreground)]">
            <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent stock changes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {changes.map((change) => (
              <div key={change.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--muted)] transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${change.qtyDelta > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {change.qtyDelta > 0 ? '+' : ''}{change.qtyDelta}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--foreground)] truncate">
                    {change.stockItemName || change.stockItemId.slice(0, 8)}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {change.userName || 'Unknown'}{change.reason ? ` — ${change.reason}` : ''}
                  </div>
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {formatRelativeTime(change.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OfficeSummaryWidget({ title, description, icon: Icon, href, loading }: {
  title: string;
  description: string;
  icon: typeof Briefcase;
  href: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="p-5">
          <div className="h-8 w-8 rounded-full bg-[var(--muted)] animate-pulse" />
          <div className="mt-3 h-5 w-32 bg-[var(--muted)] rounded animate-pulse" />
          <div className="mt-2 h-4 w-48 bg-[var(--muted)] rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Link href={href}>
      <Card variant="interactive" className="h-full group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center">
              <Icon className="w-5 h-5 text-[var(--muted-foreground)]" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-3 text-sm font-semibold text-[var(--foreground)]">{title}</div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">{description}</div>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickQuoteModal({ onClose }: { onClose: () => void }) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [includeVat, setIncludeVat] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [existingClients, setExistingClients] = useState<Array<{ id: string; name: string; email: string; phone?: string }>>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/clients", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d.ok) setExistingClients(d.clients || []); })
      .catch(() => null);
  }, []);

  const filteredClients = clientSearch.length >= 2
    ? existingClients.filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.email.toLowerCase().includes(clientSearch.toLowerCase()))
    : [];

  function selectClient(c: { id: string; name: string; email: string; phone?: string }) {
    setSelectedClientId(c.id);
    setClientName(c.name);
    setClientEmail(c.email);
    setClientPhone(c.phone || "");
    setClientSearch("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName || !description || !price) return;
    setBusy(true);
    try {
      // 1. Create or use existing client
      let clientId = selectedClientId;
      if (!clientId) {
        const cr = await fetch("/api/admin/clients", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: clientName, email: clientEmail, phone: clientPhone }),
        });
        const cd = await cr.json();
        if (!cd.ok) throw new Error(cd.error || "Failed to create client");
        clientId = cd.client?.id;
      }

      // 2. Create quote with one line item
      const priceNum = Number(price);
      const vatRate = includeVat ? 0.2 : 0;
      const qr = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId,
          clientName,
          clientEmail,
          vatRate,
          items: [{ description, qty: 1, unitPrice: priceNum }],
        }),
      });
      const qd = await qr.json();
      if (!qd.ok) throw new Error(qd.error || "Failed to create quote");
      const quoteId = qd.quote?.id;

      // 3. Optionally send email
      if (sendEmail && quoteId) {
        await fetch(`/api/admin/quotes/${quoteId}/send`, { method: "POST" }).catch(() => null);
      }

      // Navigate to quote
      window.location.href = `/admin/quotes/${quoteId}`;
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Quick Quote</h2>
              <p className="text-sm text-[var(--muted-foreground)]">Create and send a quote in under 60 seconds</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--muted)]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client */}
            <div>
              <label className="text-sm font-medium text-[var(--foreground)]">Client</label>
              {selectedClientId ? (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-[var(--foreground)]">{clientName}</span>
                  <button type="button" onClick={() => { setSelectedClientId(null); setClientName(""); setClientEmail(""); setClientPhone(""); }} className="text-xs text-[var(--primary)] hover:underline">Change</button>
                </div>
              ) : (
                <div className="mt-1 relative">
                  <input
                    placeholder="Search existing or type new name..."
                    value={clientSearch || clientName}
                    onChange={(e) => { setClientSearch(e.target.value); setClientName(e.target.value); }}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                    required
                  />
                  {filteredClients.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg z-10 max-h-40 overflow-auto">
                      {filteredClients.slice(0, 5).map((c) => (
                        <button key={c.id} type="button" onClick={() => selectClient(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--muted)]">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-[var(--muted-foreground)]">{c.email}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!selectedClientId && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input placeholder="Email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
                  <input placeholder="Phone" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-[var(--foreground)]">Description</label>
              <input
                placeholder="e.g., Full rewire of 3-bed semi"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                required
              />
            </div>

            {/* Price + VAT */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-[var(--foreground)]">Price (£)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer">
                  <input type="checkbox" checked={includeVat} onChange={(e) => setIncludeVat(e.target.checked)} className="rounded" />
                  Include VAT (20%)
                </label>
              </div>
            </div>

            {/* Send email toggle */}
            <label className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer">
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="rounded" />
              Send quote email to client immediately
            </label>

            {/* Total preview */}
            {price && (
              <div className="p-3 rounded-xl bg-[var(--muted)] text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>£{Number(price).toFixed(2)}</span></div>
                {includeVat && <div className="flex justify-between text-[var(--muted-foreground)]"><span>VAT (20%)</span><span>£{(Number(price) * 0.2).toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold mt-1 pt-1 border-t border-[var(--border)]">
                  <span>Total</span>
                  <span>£{(Number(price) * (includeVat ? 1.2 : 1)).toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={busy || !clientName || !description || !price}>
                {busy ? "Creating..." : sendEmail ? "Create & Send" : "Create Quote"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

type DashboardState = {
  data: DashboardData | null;
  engineers: Engineer[];
  jobs: Job[];
  schedule: ScheduleEntry[];
  activities: ActivityItem[];
  revenue: RevenueData | null;
  breakEven: BreakEvenData | null;
  widgetsData: WidgetsData | null;
  loading: boolean;
  secondaryLoading: boolean;
  refreshing: {
    stats: boolean;
    activity: boolean;
    revenue: boolean;
    breakEven: boolean;
    team: boolean;
    schedule: boolean;
  };
};

export default function DashboardPage() {
  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [quickQuoteOpen, setQuickQuoteOpen] = useState(false);

  // Dashboard data state
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    data: null,
    engineers: [],
    jobs: [],
    schedule: [],
    activities: [],
    revenue: null,
    breakEven: null,
    widgetsData: null,
    loading: true,
    secondaryLoading: true,
    refreshing: {
      stats: false,
      activity: false,
      revenue: false,
      breakEven: false,
      team: false,
      schedule: false,
    },
  });

  // Apply cached data on mount for instant paint (SWR pattern)
  const hydratedFromCache = useRef(false);
  useEffect(() => {
    if (hydratedFromCache.current) return;
    hydratedFromCache.current = true;
    const cached = getCached<{
      data: DashboardData;
      activities: ActivityItem[];
      revenue: RevenueData;
      engineers: Engineer[];
    }>("dashboard-summary");
    if (cached) {
      setDashboardState((prev) => ({
        ...prev,
        data: cached.data ?? prev.data,
        activities: cached.activities ?? prev.activities,
        revenue: cached.revenue ?? prev.revenue,
        engineers: cached.engineers ?? prev.engineers,
        loading: false,
        // Keep secondaryLoading true — revalidation will update
      }));
    }
  }, []);

  // Fetch dashboard data: try consolidated summary first, fall back to individual endpoints
  const fetchDashboardData = useCallback(async () => {
    setDashboardState((prev) => ({ ...prev, loading: prev.data === null }));

    try {
      // Try consolidated summary endpoint (single round-trip)
      const summaryRes = await fetch('/api/admin/dashboard/summary').then((r) => r.json()).catch(() => null);

      if (summaryRes?.ok) {
        // Cache for SWR
        setCached("dashboard-summary", {
          data: summaryRes.data,
          activities: summaryRes.activities,
          revenue: summaryRes.revenue,
          engineers: summaryRes.engineers,
        });

        setDashboardState((prev) => ({
          ...prev,
          data: summaryRes.data,
          activities: summaryRes.activities || [],
          revenue: summaryRes.revenue || null,
          engineers: summaryRes.engineers || [],
          loading: false,
          secondaryLoading: true,
        }));

        // Only schedule/jobs/breakEven/widgets still need separate calls
        const [jobsRes, scheduleRes, breakEvenRes, widgetsRes] = await Promise.all([
          fetch('/api/admin/jobs').then((r) => r.json()).catch(() => []),
          fetch('/api/admin/schedule').then((r) => r.json()).catch(() => null),
          fetch('/api/admin/dashboard/break-even').then((r) => r.json()).catch(() => null),
          fetch('/api/admin/dashboard/widgets').then((r) => r.json()).catch(() => null),
        ]);

        setDashboardState((prev) => ({
          ...prev,
          jobs: Array.isArray(jobsRes) ? jobsRes : (jobsRes?.data || []),
          schedule: scheduleRes?.ok ? (scheduleRes.entries || []) : [],
          breakEven: breakEvenRes?.ok ? breakEvenRes.data : null,
          widgetsData: widgetsRes?.ok ? widgetsRes : null,
          secondaryLoading: false,
          refreshing: { stats: false, activity: false, revenue: false, breakEven: false, team: false, schedule: false },
        }));
        return;
      }

      // Fallback: individual endpoints
      const dashboardRes = await fetch('/api/admin/dashboard').then((r) => r.json()).catch(() => null);

      setDashboardState((prev) => ({
        ...prev,
        data: dashboardRes?.ok ? dashboardRes.data : null,
        loading: false,
        secondaryLoading: true,
      }));

      const [engineersRes, jobsRes, scheduleRes, activityRes, revenueRes, breakEvenRes, widgetsRes] = await Promise.all([
        fetch('/api/admin/engineers').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/jobs').then((r) => r.json()).catch(() => []),
        fetch('/api/admin/schedule').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/dashboard/activity').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/dashboard/revenue').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/dashboard/break-even').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/dashboard/widgets').then((r) => r.json()).catch(() => null),
      ]);

      setDashboardState((prev) => ({
        ...prev,
        engineers: engineersRes?.ok ? (engineersRes.engineers || []) : [],
        jobs: Array.isArray(jobsRes) ? jobsRes : (jobsRes?.data || []),
        schedule: scheduleRes?.ok ? (scheduleRes.entries || []) : [],
        activities: activityRes?.ok ? (activityRes.activities || []) : [],
        revenue: revenueRes?.ok ? revenueRes.data : null,
        breakEven: breakEvenRes?.ok ? breakEvenRes.data : null,
        widgetsData: widgetsRes?.ok ? widgetsRes : null,
        secondaryLoading: false,
        refreshing: { stats: false, activity: false, revenue: false, breakEven: false, team: false, schedule: false },
      }));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setDashboardState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  // Individual refresh functions
  const refreshStats = useCallback(async () => {
    setDashboardState((prev) => ({ ...prev, refreshing: { ...prev.refreshing, stats: true } }));
    try {
      const res = await fetch('/api/admin/dashboard');
      const data = await res.json();
      setDashboardState((prev) => ({
        ...prev,
        data: data?.ok ? data.data : prev.data,
        refreshing: { ...prev.refreshing, stats: false }
      }));
    } catch {
      setDashboardState((prev) => ({ ...prev, refreshing: { ...prev.refreshing, stats: false } }));
    }
  }, []);

  const refreshActivity = useCallback(async () => {
    setDashboardState((prev) => ({ ...prev, refreshing: { ...prev.refreshing, activity: true } }));
    try {
      const res = await fetch('/api/admin/dashboard/activity');
      const data = await res.json();
      setDashboardState((prev) => ({
        ...prev,
        activities: data?.ok ? (data.activities || []) : prev.activities,
        refreshing: { ...prev.refreshing, activity: false }
      }));
    } catch {
      setDashboardState((prev) => ({ ...prev, refreshing: { ...prev.refreshing, activity: false } }));
    }
  }, []);

  const refreshRevenue = useCallback(async () => {
    setDashboardState((prev) => ({ ...prev, refreshing: { ...prev.refreshing, revenue: true } }));
    try {
      const res = await fetch('/api/admin/dashboard/revenue');
      const data = await res.json();
      setDashboardState((prev) => ({
        ...prev,
        revenue: data?.ok ? data.data : prev.revenue,
        refreshing: { ...prev.refreshing, revenue: false }
      }));
    } catch {
      setDashboardState((prev) => ({ ...prev, refreshing: { ...prev.refreshing, revenue: false } }));
    }
  }, []);

  const refreshBreakEven = useCallback(async () => {
    setDashboardState((prev) => ({ ...prev, refreshing: { ...prev.refreshing, breakEven: true } }));
    try {
      const res = await fetch('/api/admin/dashboard/break-even');
      const data = await res.json();
      setDashboardState((prev) => ({
        ...prev,
        breakEven: data?.ok ? data.data : prev.breakEven,
        refreshing: { ...prev.refreshing, breakEven: false }
      }));
    } catch {
      setDashboardState((prev) => ({ ...prev, refreshing: { ...prev.refreshing, breakEven: false } }));
    }
  }, []);

  const refreshTeam = useCallback(async () => {
    setDashboardState((prev) => ({ ...prev, refreshing: { ...prev.refreshing, team: true } }));
    try {
      const res = await fetch('/api/admin/engineers');
      const data = await res.json();
      setDashboardState((prev) => ({
        ...prev,
        engineers: data?.ok ? (data.engineers || []) : prev.engineers,
        refreshing: { ...prev.refreshing, team: false }
      }));
    } catch {
      setDashboardState((prev) => ({ ...prev, refreshing: { ...prev.refreshing, team: false } }));
    }
  }, []);

  const refreshSchedule = useCallback(async () => {
    setDashboardState((prev) => ({ ...prev, refreshing: { ...prev.refreshing, schedule: true } }));
    try {
      const res = await fetch('/api/admin/schedule');
      const data = await res.json();
      setDashboardState((prev) => ({
        ...prev,
        schedule: data?.ok ? (data.entries || []) : prev.schedule,
        refreshing: { ...prev.refreshing, schedule: false }
      }));
    } catch {
      setDashboardState((prev) => ({ ...prev, refreshing: { ...prev.refreshing, schedule: false } }));
    }
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Load saved layout from localStorage + one-time needsAttention migration
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-widgets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate the saved widgets exist in AVAILABLE_WIDGETS
        let validWidgets: Widget[] = parsed.filter((w: Widget) =>
          AVAILABLE_WIDGETS.some(aw => aw.id === w.id)
        );
        if (validWidgets.length > 0) {
          // One-time migrations: inject widgets that were added after the user saved their layout
          const migrations: { key: string; widgetId: string; insertAt: number }[] = [
            { key: 'dashboard-migrated-needsAttention', widgetId: 'needsAttention', insertAt: 1 },
            { key: 'dashboard-migrated-jobsMap', widgetId: 'jobsMap', insertAt: 2 },
            { key: 'dashboard-migrated-lowStock', widgetId: 'lowStock', insertAt: 99 },
            { key: 'dashboard-migrated-maintenanceAlerts', widgetId: 'maintenanceAlerts', insertAt: 99 },
            { key: 'dashboard-migrated-recentStockChanges', widgetId: 'recentStockChanges', insertAt: 99 },
          ];
          let layoutChanged = false;
          for (const m of migrations) {
            if (
              !localStorage.getItem(m.key) &&
              !validWidgets.some((w: Widget) => w.id === m.widgetId)
            ) {
              const widget = AVAILABLE_WIDGETS.find(w => w.id === m.widgetId);
              if (widget) {
                const idx = Math.min(m.insertAt, validWidgets.length);
                validWidgets = [
                  ...validWidgets.slice(0, idx),
                  widget,
                  ...validWidgets.slice(idx),
                ];
                layoutChanged = true;
              }
              localStorage.setItem(m.key, '1');
            }
          }
          if (layoutChanged) {
            localStorage.setItem('dashboard-widgets', JSON.stringify(validWidgets));
          }
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

  const [dragOverWidget, setDragOverWidget] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    // Required for Chrome/HTML5 DnD: without setData(), drop will never fire
    e.dataTransfer.setData('text/plain', widgetId);
    e.dataTransfer.effectAllowed = 'move';
    // Defer so the browser captures the element before we dim it
    requestAnimationFrame(() => setDraggedWidget(widgetId));
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedWidget && targetId !== draggedWidget) {
      setDragOverWidget(targetId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the widget container (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverWidget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverWidget(null);
    const sourceId = draggedWidget || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;

    const fromIndex = widgets.findIndex(w => w.id === sourceId);
    const toIndex = widgets.findIndex(w => w.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      moveWidget(fromIndex, toIndex);
    }
    setDraggedWidget(null);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
    setDragOverWidget(null);
  };

  const availableToAdd = AVAILABLE_WIDGETS.filter(aw => !widgets.some(w => w.id === aw.id));

  function getWidgetClassName(size: Widget['size']) {
    switch (size) {
      case 'small': return 'col-span-1';
      case 'medium': return 'col-span-1 lg:col-span-1';
      case 'large': return 'col-span-1 lg:col-span-2';
      case 'full': return 'col-span-1 lg:col-span-2';
      default: return 'col-span-1';
    }
  }

  function renderWidget(widget: Widget) {
    const secLoading = dashboardState.loading || dashboardState.secondaryLoading;
    switch (widget.type) {
      case 'stats':
        return (
          <StatsWidget
            data={dashboardState.data}
            loading={dashboardState.loading}
            onRefresh={refreshStats}
            isRefreshing={dashboardState.refreshing.stats}
          />
        );
      case 'quickActions':
        return <QuickActionsWidget />;
      case 'recentActivity':
        return (
          <RecentActivityWidget
            activities={dashboardState.activities}
            loading={secLoading}
            onRefresh={refreshActivity}
            isRefreshing={dashboardState.refreshing.activity}
          />
        );
      case 'revenue':
        return (
          <RevenueWidget
            data={dashboardState.revenue}
            loading={secLoading}
            onRefresh={refreshRevenue}
            isRefreshing={dashboardState.refreshing.revenue}
          />
        );
      case 'teamOverview':
        return (
          <TeamOverviewWidget
            engineers={dashboardState.engineers}
            loading={secLoading}
            onRefresh={refreshTeam}
            isRefreshing={dashboardState.refreshing.team}
          />
        );
      case 'performance':
        return <PerformanceWidget data={dashboardState.data} />;
      case 'calendar':
        return (
          <CalendarWidget
            schedule={dashboardState.schedule}
            loading={secLoading}
            onRefresh={refreshSchedule}
            isRefreshing={dashboardState.refreshing.schedule}
          />
        );
      case 'invoiceChart':
        return (
          <InvoiceChartWidget
            data={dashboardState.data}
            loading={dashboardState.loading}
            onRefresh={refreshStats}
            isRefreshing={dashboardState.refreshing.stats}
          />
        );
      case 'breakEven':
        return (
          <BreakEvenWidget
            data={dashboardState.breakEven}
            loading={secLoading}
            onRefresh={refreshBreakEven}
            isRefreshing={dashboardState.refreshing.breakEven}
          />
        );
      case 'needsAttention':
        return <NeedsAttention />;
      case 'jobsMap':
        return (
          <JobsMapWidget
            data={dashboardState.data}
            jobs={dashboardState.jobs}
            loading={secLoading}
            onRefresh={refreshStats}
            isRefreshing={dashboardState.refreshing.stats}
          />
        );
      case 'lowStock':
        return <LowStockWidget data={dashboardState.widgetsData} loading={secLoading} />;
      case 'maintenanceAlerts':
        return <MaintenanceAlertsWidget data={dashboardState.widgetsData} loading={secLoading} />;
      case 'recentStockChanges':
        return <RecentStockChangesWidget data={dashboardState.widgetsData} loading={secLoading} />;
      case 'systemHealth':
        return <SystemHealthWidget />;
      case 'dispatchToday':
        return <OfficeSummaryWidget title="Dispatch Today" description="View today's scheduled engineers and jobs" icon={Calendar} href="/admin/dispatch" loading={secLoading} />;
      case 'approvalsPending':
        return <OfficeSummaryWidget title="Approvals Pending" description="Timesheets and expenses awaiting approval" icon={CheckCircle} href="/admin/office/approvals" loading={secLoading} />;
      case 'todaysProblems':
        return <OfficeSummaryWidget title="Today's Problems" description="Overdue scheduled checks and unpaid invoices" icon={AlertTriangle} href="/admin/office/alerts" loading={secLoading} />;
      case 'compliance':
        return <OfficeSummaryWidget title="Compliance" description="Upcoming compliance items and certifications" icon={Award} href="/admin/office/compliance" loading={secLoading} />;
      case 'profitLeakage':
        return <OfficeSummaryWidget title="Profit Leakage" description="Overdue invoices and unbilled completed jobs" icon={TrendingDown} href="/admin/reports/revenue" loading={secLoading} />;
      default:
        return null;
    }
  }

  return (
    <AppShell role="admin" title="Dashboard" subtitle="Overview of your business performance and recent activity.">
      <div className="space-y-6">
        {/* Onboarding Checklist */}
        <OnboardingChecklist />

        {/* Customise Controls */}
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
              Customise Dashboard
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
              className={`${getWidgetClassName(widget.size)} transition-all duration-150 ${isCustomizing ? 'relative group' : ''} ${draggedWidget === widget.id ? 'opacity-50 scale-[0.97]' : ''} ${dragOverWidget === widget.id ? 'ring-2 ring-[var(--primary)] rounded-2xl cursor-move' : ''}`}
              draggable={isCustomizing}
              onDragStart={(e) => handleDragStart(e, widget.id)}
              onDragOver={(e) => handleDragOver(e, widget.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, widget.id)}
              onDragEnd={handleDragEnd}
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
              {renderWidget(widget)}
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

      {/* Quick Quote Modal */}
      {quickQuoteOpen && (
        <QuickQuoteModal onClose={() => setQuickQuoteOpen(false)} />
      )}
    </AppShell>
  );
}
