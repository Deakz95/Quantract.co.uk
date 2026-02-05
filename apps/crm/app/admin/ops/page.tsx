"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  RefreshCw,
  Shield,
  Zap,
  Users,
  ChevronRight,
} from "lucide-react";

/* ---------- Types ---------- */

type IndicatorColor = "green" | "amber" | "red" | "no_data" | "unknown";

interface CronJob {
  jobName: string;
  lastRun: string;
  status: "success" | "failed" | "running";
  durationMs: number | null;
  error: string | null;
  indicator: IndicatorColor;
}

interface WebhookHealth {
  lastWebhookAt: string | null;
  lastEventId: string | null;
  status: IndicatorColor;
}

interface HealthData {
  errorCount24h: number;
  errorStatus: IndicatorColor;
  activeImpersonations: number;
  webhookHealth: WebhookHealth;
  cronJobs: CronJob[];
  storageBytes: number;
  checkedAt: string;
}

/* ---------- Helpers ---------- */

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 MB";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function timeAgo(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

function humanJobName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const DOT_COLORS: Record<string, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  no_data: "bg-gray-400",
  unknown: "bg-gray-400",
};

function StatusDot({ color }: { color: IndicatorColor }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full shrink-0",
        DOT_COLORS[color] ?? "bg-gray-400",
      )}
    />
  );
}

function cronBadgeVariant(
  status: string,
): "success" | "destructive" | "warning" {
  if (status === "success") return "success";
  if (status === "failed") return "destructive";
  return "warning";
}

/* ---------- Page ---------- */

export default function OpsHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/system/health", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to fetch health data");
        return;
      }
      setHealth(data.health);
    } catch {
      setError("Network error - could not reach the health endpoint.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
  }, [fetchHealth]);

  return (
    <AppShell role="admin" title="System Health" subtitle="Operational status and diagnostics.">
      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="text-sm text-[var(--muted-foreground)]">
          {health ? (
            <>Last checked: {timeAgo(health.checkedAt)}</>
          ) : (
            <>Loading...</>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void fetchHealth(true)}
          disabled={refreshing}
        >
          <RefreshCw
            className={cn("h-4 w-4 mr-1.5", refreshing && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mr-2 inline h-4 w-4" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !health && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--card)]"
            />
          ))}
        </div>
      )}

      {/* Health content */}
      {health && (
        <>
          {/* ---- Status Cards ---- */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {/* Error Count */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <AlertTriangle className="h-3.5 w-3.5" />
                Errors (24h)
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-[var(--foreground)]">
                  {health.errorCount24h}
                </span>
                <StatusDot color={health.errorStatus} />
              </div>
            </div>

            {/* Active Impersonations */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <Shield className="h-3.5 w-3.5" />
                Impersonations
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-[var(--foreground)]">
                  {health.activeImpersonations}
                </span>
                <StatusDot
                  color={health.activeImpersonations > 0 ? "amber" : "green"}
                />
              </div>
            </div>

            {/* Webhook Health */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <Zap className="h-3.5 w-3.5" />
                Webhooks
              </div>
              <div className="flex items-center gap-3">
                <StatusDot color={health.webhookHealth.status} />
                <span className="text-sm text-[var(--foreground)]">
                  {health.webhookHealth.lastWebhookAt
                    ? timeAgo(health.webhookHealth.lastWebhookAt)
                    : "No data"}
                </span>
              </div>
            </div>

            {/* Storage */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <Database className="h-3.5 w-3.5" />
                Storage
              </div>
              <div className="text-2xl font-bold text-[var(--foreground)]">
                {formatBytes(health.storageBytes)}
              </div>
              {/* Simple bar (percentage of 5 GB assumed limit) */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all"
                  style={{
                    width: `${Math.min(100, (health.storageBytes / (5 * 1024 * 1024 * 1024)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* ---- Cron Jobs Table ---- */}
          <div className="mt-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--foreground)]">
              <Clock className="h-5 w-5" />
              Cron Jobs
            </h2>

            {health.cronJobs.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">
                No cron job data recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--card)]">
                      <th className="px-4 py-3 text-left font-semibold text-[var(--muted-foreground)]">
                        Job Name
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--muted-foreground)]">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--muted-foreground)]">
                        Last Run
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--muted-foreground)]">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-[var(--muted-foreground)]">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {health.cronJobs.map((job) => (
                      <tr
                        key={job.jobName}
                        className="border-b border-[var(--border)] last:border-0 bg-[var(--card)] hover:bg-[var(--muted)]/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                          <div className="flex items-center gap-2">
                            <StatusDot color={job.indicator} />
                            {humanJobName(job.jobName)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={cronBadgeVariant(job.status)}>
                            {job.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">
                          {job.lastRun ? timeAgo(job.lastRun) : "-"}
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">
                          {job.durationMs != null
                            ? job.durationMs < 1000
                              ? `${job.durationMs}ms`
                              : `${(job.durationMs / 1000).toFixed(1)}s`
                            : "-"}
                        </td>
                        <td className="max-w-[240px] px-4 py-3">
                          {job.error ? (
                            <span
                              className="block truncate text-xs text-red-600 dark:text-red-400"
                              title={job.error}
                            >
                              {job.error}
                            </span>
                          ) : (
                            <span className="text-[var(--muted-foreground)]">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ---- Quick Links ---- */}
          <div className="mt-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--foreground)]">
              <ChevronRight className="h-5 w-5" />
              Quick Links
            </h2>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "Audit Log", href: "/admin/audit", icon: Activity },
                { label: "Roles", href: "/admin/roles", icon: Users },
                {
                  label: "Storage Details",
                  href: "/admin/settings/storage",
                  icon: Database,
                },
                {
                  label: "Entitlements",
                  href: "/admin/entitlements",
                  icon: CheckCircle,
                },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--muted)] transition-colors"
                >
                  <link.icon className="h-4 w-4 text-[var(--primary)]" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
