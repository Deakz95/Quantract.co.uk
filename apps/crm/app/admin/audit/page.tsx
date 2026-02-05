"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/cn";
import {
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  FileText,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuditEvent = {
  id: string;
  type: "audit" | "impersonation";
  entityType: string;
  entityId: string;
  action: string;
  actorRole: string;
  actor: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

type AuditResponse = {
  ok: boolean;
  events: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
  actorNames: Record<string, string>;
  entityNames: Record<string, string>;
  error?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ENTITY_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "quote", label: "Quote" },
  { value: "invoice", label: "Invoice" },
  { value: "job", label: "Job" },
  { value: "certificate", label: "Certificate" },
  { value: "user", label: "User" },
  { value: "impersonation", label: "Impersonation" },
  { value: "agreement", label: "Agreement" },
];

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth}mo ago`;
}

function absoluteTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function actionBadgeColor(action: string): string {
  const a = action.toLowerCase();
  if (
    a.includes("created") ||
    a.includes("sent") ||
    a.includes("approved") ||
    a.includes("signed") ||
    a.includes("completed")
  ) {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
  }
  if (
    a.includes("deleted") ||
    a.includes("failed") ||
    a.includes("error") ||
    a.includes("rejected") ||
    a.includes("revoked")
  ) {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  }
  if (
    a.includes("updated") ||
    a.includes("modified") ||
    a.includes("changed") ||
    a.includes("edited")
  ) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
  }
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AuditLogPage() {
  // Filter state
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Data state
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded meta rows
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (entityType) params.set("entityType", entityType);
      if (action.trim()) params.set("action", action.trim());
      if (fromDate) params.set("from", new Date(fromDate).toISOString());
      if (toDate) params.set("to", new Date(toDate + "T23:59:59").toISOString());
      params.set("page", String(page));
      params.set("limit", String(pageSize));

      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      const json: AuditResponse = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to load audit log");
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [entityType, action, fromDate, toDate, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [entityType, action, fromDate, toDate]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <AppShell role="admin" title="Audit Log" subtitle="Human-readable log of all admin actions.">
      <div className="space-y-6">
        {/* ---- Filters ---- */}
        <div
          className={cn(
            "rounded-lg border p-4",
            "bg-[var(--card)] border-[var(--border)]"
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4" style={{ color: "var(--muted-foreground)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Filters
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Entity type */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                Entity type
              </label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-sm",
                  "bg-[var(--card)] border-[var(--border)]"
                )}
                style={{ color: "var(--foreground)" }}
              >
                {ENTITY_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                Action
              </label>
              <div className="relative">
                <Search
                  className="absolute left-2.5 top-2.5 h-4 w-4"
                  style={{ color: "var(--muted-foreground)" }}
                />
                <input
                  type="text"
                  placeholder="e.g. created, sent..."
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className={cn(
                    "w-full rounded-md border pl-8 pr-3 py-2 text-sm",
                    "bg-[var(--card)] border-[var(--border)]",
                    "placeholder:text-[var(--muted-foreground)]"
                  )}
                  style={{ color: "var(--foreground)" }}
                />
              </div>
            </div>

            {/* From date */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-sm",
                  "bg-[var(--card)] border-[var(--border)]"
                )}
                style={{ color: "var(--foreground)" }}
              />
            </div>

            {/* To date */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                To
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-sm",
                  "bg-[var(--card)] border-[var(--border)]"
                )}
                style={{ color: "var(--foreground)" }}
              />
            </div>

            {/* Refresh */}
            <div className="flex items-end">
              <button
                onClick={() => fetchData()}
                disabled={loading}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium",
                  "border-[var(--border)] hover:bg-[var(--border)] transition-colors",
                  loading && "opacity-50 cursor-not-allowed"
                )}
                style={{ color: "var(--foreground)" }}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ---- Loading ---- */}
        {loading && !data && (
          <div className="flex items-center justify-center py-16">
            <RefreshCw
              className="h-6 w-6 animate-spin"
              style={{ color: "var(--muted-foreground)" }}
            />
            <span className="ml-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
              Loading audit events...
            </span>
          </div>
        )}

        {/* ---- Error ---- */}
        {error && (
          <div
            className="rounded-lg border p-4 text-sm"
            style={{
              color: "var(--foreground)",
              borderColor: "var(--border)",
              backgroundColor: "var(--card)",
            }}
          >
            <p className="text-red-600 dark:text-red-400 font-medium">Error: {error}</p>
            <button
              onClick={() => fetchData()}
              className="mt-2 underline text-sm"
              style={{ color: "var(--primary)" }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ---- Empty state ---- */}
        {data && data.events.length === 0 && !loading && (
          <div
            className="rounded-lg border p-8 text-center"
            style={{
              color: "var(--muted-foreground)",
              borderColor: "var(--border)",
              backgroundColor: "var(--card)",
            }}
          >
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No audit events found</p>
            <p className="text-xs mt-1">Try adjusting your filters or date range.</p>
          </div>
        )}

        {/* ---- Event list ---- */}
        {data && data.events.length > 0 && (
          <div
            className="rounded-lg border overflow-hidden"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--card)",
            }}
          >
            {/* Header row */}
            <div
              className="hidden lg:grid lg:grid-cols-[140px_1fr_120px_1fr_60px] gap-3 px-4 py-2.5 text-xs font-medium border-b"
              style={{
                color: "var(--muted-foreground)",
                borderColor: "var(--border)",
              }}
            >
              <span>Time</span>
              <span>Actor</span>
              <span>Action</span>
              <span>Entity</span>
              <span>Meta</span>
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {data.events.map((event) => {
                const actorName = event.actor
                  ? data.actorNames[event.actor] || event.actor.slice(0, 8)
                  : "system";
                const entityName =
                  event.entityType === "impersonation"
                    ? `${(event.meta as any)?.adminName || "Admin"} as ${(event.meta as any)?.targetName || "user"}`
                    : data.entityNames[event.entityId] ||
                      `${event.entityType} ${event.entityId.slice(0, 8)}`;
                const hasMeta = event.meta && Object.keys(event.meta).length > 0;
                const isExpanded = expandedIds.has(event.id);

                return (
                  <div key={event.id}>
                    {/* Main row */}
                    <div
                      className={cn(
                        "grid grid-cols-1 lg:grid-cols-[140px_1fr_120px_1fr_60px] gap-1 lg:gap-3 px-4 py-3 text-sm",
                        "hover:bg-[var(--border)]/20 transition-colors"
                      )}
                      style={{ color: "var(--foreground)" }}
                    >
                      {/* Time */}
                      <div
                        className="flex items-center gap-1.5"
                        title={absoluteTime(event.createdAt)}
                      >
                        <Clock
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ color: "var(--muted-foreground)" }}
                        />
                        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                          {relativeTime(event.createdAt)}
                        </span>
                      </div>

                      {/* Actor */}
                      <div className="flex items-center gap-1.5 truncate">
                        <User
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ color: "var(--muted-foreground)" }}
                        />
                        <span className="truncate">{actorName}</span>
                        {event.actorRole && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            {event.actorRole}
                          </span>
                        )}
                      </div>

                      {/* Action badge */}
                      <div className="flex items-center">
                        <span
                          className={cn(
                            "inline-block text-xs font-medium px-2 py-0.5 rounded-full",
                            actionBadgeColor(event.action)
                          )}
                        >
                          {event.action}
                        </span>
                      </div>

                      {/* Entity */}
                      <div className="flex items-center gap-1.5 truncate">
                        <FileText
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ color: "var(--muted-foreground)" }}
                        />
                        <span className="truncate">{entityName}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {event.entityType}
                        </span>
                      </div>

                      {/* Expand meta */}
                      <div className="flex items-center justify-end">
                        {hasMeta && (
                          <button
                            onClick={() => toggleExpanded(event.id)}
                            className={cn(
                              "text-xs px-2 py-1 rounded border transition-colors",
                              "border-[var(--border)] hover:bg-[var(--border)]"
                            )}
                            style={{ color: "var(--muted-foreground)" }}
                            title={isExpanded ? "Collapse" : "Expand metadata"}
                          >
                            {isExpanded ? "-" : "+"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded meta JSON */}
                    {isExpanded && hasMeta && (
                      <div
                        className="px-4 pb-3 lg:pl-[156px]"
                      >
                        <pre
                          className="text-xs p-3 rounded-md overflow-x-auto border"
                          style={{
                            color: "var(--muted-foreground)",
                            borderColor: "var(--border)",
                            backgroundColor: "var(--card)",
                          }}
                        >
                          {JSON.stringify(event.meta, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---- Pagination ---- */}
        {data && data.total > 0 && (
          <div
            className="flex items-center justify-between px-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            <span className="text-xs">
              Showing {(page - 1) * pageSize + 1}&ndash;
              {Math.min(page * pageSize, data.total)} of {data.total} events
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={cn(
                  "flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  "border-[var(--border)] hover:bg-[var(--border)]",
                  page <= 1 && "opacity-40 cursor-not-allowed"
                )}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={cn(
                  "flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  "border-[var(--border)] hover:bg-[var(--border)]",
                  page >= totalPages && "opacity-40 cursor-not-allowed"
                )}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
