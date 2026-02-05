"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import dynamic from "next/dynamic";

const JobsMap = dynamic(() => import("@/components/admin/JobsMap"), { ssr: false });

type DispatchStatus = "scheduled" | "en_route" | "on_site" | "in_progress" | "completed";

type ScheduleEntry = {
  id: string;
  jobId: string;
  startAtISO: string;
  endAtISO: string;
  title?: string;
  address?: string;
  status?: DispatchStatus;
};

type Job = {
  id: string;
  title?: string;
  status: string;
  clientName?: string;
  siteAddress?: string;
};

type TimeEntry = {
  id: string;
  jobId: string;
  startedAtISO: string;
  endedAtISO?: string;
  notes?: string;
};

const NEXT_STATUS: Record<DispatchStatus, { next: DispatchStatus; label: string } | null> = {
  scheduled: { next: "en_route", label: "En Route" },
  en_route: { next: "on_site", label: "On Site" },
  on_site: { next: "in_progress", label: "Start Work" },
  in_progress: { next: "completed", label: "Complete" },
  completed: null,
};

const STATUS_LABELS: Record<DispatchStatus, string> = {
  scheduled: "Scheduled",
  en_route: "En Route",
  on_site: "On Site",
  in_progress: "In Progress",
  completed: "Completed",
};

const STATUS_COLOURS_MAP: Record<DispatchStatus, string> = {
  scheduled: "bg-slate-100 text-slate-700",
  en_route: "bg-blue-100 text-blue-700",
  on_site: "bg-amber-100 text-amber-700",
  in_progress: "bg-violet-100 text-violet-700",
  completed: "bg-emerald-100 text-emerald-700",
};

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start, end };
}

function formatElapsed(startISO: string) {
  const ms = Date.now() - new Date(startISO).getTime();
  if (ms < 0) return "0m";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Skeleton placeholder ────────────────────────────────────────
function Skeleton() {
  return (
    <div className="grid gap-6 animate-pulse">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 h-24" />
      <div className="grid gap-3 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 h-20" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 h-16" />
        ))}
      </div>
    </div>
  );
}

export default function TodayClient() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [active, setActive] = useState<TimeEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState("");
  const [showMap, setShowMap] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("qt-eng-map") !== "hidden";
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = todayRange();
      const [schedRes, jobsRes, timerRes] = await Promise.all([
        fetch(`/api/engineer/schedule?from=${encodeURIComponent(start.toISOString())}&to=${encodeURIComponent(end.toISOString())}`, { cache: "no-store" }),
        fetch(`/api/engineer/jobs`, { cache: "no-store" }),
        fetch(`/api/engineer/timer/active`, { cache: "no-store" }),
      ]);
      const sched = await schedRes.json();
      const j = await jobsRes.json();
      const t = await timerRes.json();
      if (!schedRes.ok || !sched?.ok) throw new Error(sched?.error || "Failed to load schedule");
      setEntries((sched.entries || []) as ScheduleEntry[]);
      setJobs(((j.items || j.jobs || []) as Job[]) ?? []);
      setActive((t.active as TimeEntry) || null);
    } catch (e: any) {
      console.error("[TodayClient] load failed:", e?.message || e);
      setError("load_failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(() => {
      fetch(`/api/engineer/timer/active`, { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => setActive(j?.active || null))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, []);

  // Elapsed ticker
  useEffect(() => {
    if (!active?.startedAtISO) { setElapsed(""); return; }
    setElapsed(formatElapsed(active.startedAtISO));
    const id = setInterval(() => setElapsed(formatElapsed(active.startedAtISO)), 1000);
    return () => clearInterval(id);
  }, [active]);

  // Map schedule entries to jobs with dispatch status
  const entryByJobId = useMemo(() => {
    const map = new Map<string, ScheduleEntry>();
    for (const e of entries) {
      map.set(e.jobId, e);
    }
    return map;
  }, [entries]);

  const todaysJobs = useMemo(() => {
    const byId = new Map(jobs.map((j) => [j.id, j]));
    const ordered: Job[] = [];
    for (const e of [...entries].sort((a, b) => new Date(a.startAtISO).getTime() - new Date(b.startAtISO).getTime())) {
      const j = byId.get(e.jobId);
      if (j) ordered.push(j);
    }
    if (ordered.length === 0) return jobs.slice(0, 10);
    return ordered;
  }, [entries, jobs]);

  const summary = useMemo(() => {
    const now = new Date();
    const sorted = [...entries].sort((a, b) => new Date(a.startAtISO).getTime() - new Date(b.startAtISO).getTime());
    const next = sorted.find((e) => new Date(e.startAtISO).getTime() >= now.getTime()) || null;
    const totalMinutes = entries.reduce((sum, e) => {
      const start = new Date(e.startAtISO).getTime();
      const end = new Date(e.endAtISO).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return sum;
      return sum + Math.round((end - start) / 60000);
    }, 0);
    return { next, totalMinutes };
  }, [entries]);

  async function start(jobId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/engineer/timer/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Could not start timer");
      setActive(json.active || null);
    } catch (e: any) {
      setError(e?.message || "Could not start timer");
    } finally {
      setBusy(false);
    }
  }

  async function updateDispatchStatus(entryId: string, newStatus: DispatchStatus) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/engineer/dispatch/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryId, status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Status update failed");
      // Update local state
      setEntries((prev) =>
        prev.map((e) => e.id === entryId ? { ...e, status: newStatus } : e),
      );
    } catch (e: any) {
      setError(e?.message || "Could not update status");
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/engineer/timer/stop`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Could not stop timer");
      setActive(null);
    } catch (e: any) {
      setError(e?.message || "Could not stop timer");
    } finally {
      setBusy(false);
    }
  }

  function toggleMap() {
    const next = !showMap;
    setShowMap(next);
    localStorage.setItem("qt-eng-map", next ? "visible" : "hidden");
  }

  if (loading) return <Skeleton />;

  return (
    <div className="grid gap-6">
      {error === "load_failed" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
          <p className="text-sm font-medium text-rose-700">Couldn&apos;t load your jobs right now.</p>
          <p className="mt-1 text-xs text-rose-600">Check signal and try again.</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200 transition-colors min-h-[44px]"
          >
            Retry
          </button>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {/* ── Active timer banner ──────────────────────────── */}
      {active && (
        <div className="rounded-xl border-2 border-green-500/30 bg-green-500/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
              </span>
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {todaysJobs.find((j) => j.id === active.jobId)?.title || "Timer running"}
              </span>
              <span className="text-lg font-bold tabular-nums text-[var(--foreground)]">{elapsed}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/engineer/jobs/${active.jobId}`}>
                <Button variant="secondary" type="button" className="min-h-[44px]">Open job</Button>
              </Link>
              <Button type="button" onClick={stop} disabled={busy} className="min-h-[44px]">
                Stop timer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Compact map ──────────────────────────────────── */}
      {todaysJobs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--muted-foreground)]">Today&apos;s locations</span>
            <button
              type="button"
              onClick={toggleMap}
              className="text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors min-h-[44px] inline-flex items-center"
            >
              {showMap ? "Hide map" : "Show map"}
            </button>
          </div>
          {showMap && (
            <div className="h-[200px] rounded-2xl overflow-hidden border border-[var(--border)]">
              <JobsMap defaultTodayOnly />
            </div>
          )}
        </div>
      )}

      {/* ── Prompt if no timer ───────────────────────────── */}
      {!active && todaysJobs.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-3 text-center">
          <span className="text-sm text-[var(--muted-foreground)]">
            Ready to start <span className="font-semibold text-[var(--foreground)]">{todaysJobs[0].title || "your next job"}</span>?
          </span>
          <Button
            variant="secondary"
            type="button"
            onClick={() => start(todaysJobs[0].id)}
            disabled={busy}
            className="ml-3 min-h-[44px]"
          >
            Start timer
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Today overview</CardTitle>
            <Button variant="secondary" type="button" onClick={load} disabled={busy} className="min-h-[44px]">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Scheduled today</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{entries.length}</div>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">{summary.totalMinutes > 0 ? `${summary.totalMinutes} mins booked` : "No hours booked"}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Next job</div>
              <div className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                {summary.next ? jobs.find((j) => j.id === summary.next?.jobId)?.title || "Job" : "None"}
              </div>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                {summary.next
                  ? new Date(summary.next.startAtISO).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                  : "You're clear for now"}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Assigned jobs</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{jobs.length}</div>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">Check your jobs list for updates</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {todaysJobs.length === 0 ? (
              <div className="text-sm text-[var(--muted-foreground)]">No jobs scheduled for today.</div>
            ) : null}
            {todaysJobs.map((j) => {
              const entry = entryByJobId.get(j.id);
              const dispatchStatus = (entry?.status || "scheduled") as DispatchStatus;
              const nextAction = NEXT_STATUS[dispatchStatus];
              return (
                <div key={j.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="shrink-0 w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          active?.jobId === j.id ? "#22c55e" :
                          dispatchStatus === "completed" ? "#6b7280" :
                          dispatchStatus === "in_progress" ? "#8b5cf6" :
                          dispatchStatus === "on_site" ? "#f59e0b" :
                          dispatchStatus === "en_route" ? "#3b82f6" :
                          "#94a3b8",
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--foreground)] truncate">{j.title || "Job"}</div>
                      <div className="text-xs text-[var(--muted-foreground)] truncate">
                        {j.clientName ? `${j.clientName} \u2022 ` : ""}{j.siteAddress || ""}
                      </div>
                      <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLOURS_MAP[dispatchStatus]}`}>
                        {STATUS_LABELS[dispatchStatus]}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry && nextAction && (
                      <Button
                        variant="secondary"
                        type="button"
                        onClick={() => updateDispatchStatus(entry.id, nextAction.next)}
                        disabled={busy}
                        className="min-h-[44px] text-xs"
                      >
                        {nextAction.label}
                      </Button>
                    )}
                    <Link href={`/engineer/jobs/${j.id}`}>
                      <Button variant="secondary" type="button" className="min-h-[44px]">Open</Button>
                    </Link>
                    {active?.jobId !== j.id && (
                      <Button type="button" onClick={() => start(j.id)} disabled={busy || Boolean(active)} className="min-h-[44px]">
                        Start
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
