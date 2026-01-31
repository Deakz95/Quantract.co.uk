"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

type ScheduleEntry = {
  id: string;
  jobId: string;
  startAtISO: string;
  endAtISO: string;
  title?: string;
  address?: string;
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

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start, end };
}

export default function TodayClient() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [active, setActive] = useState<TimeEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      // keep active timer fresh
      fetch(`/api/engineer/timer/active`, { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => setActive(j?.active || null))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const todaysJobs = useMemo(() => {
    const byId = new Map(jobs.map((j) => [j.id, j]));
    const ordered: Job[] = [];
    for (const e of [...entries].sort((a, b) => new Date(a.startAtISO).getTime() - new Date(b.startAtISO).getTime())) {
      const j = byId.get(e.jobId);
      if (j) ordered.push(j);
    }
    // fall back to any jobs assigned if no schedule
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

  if (loading) return <div className="text-sm text-[var(--muted-foreground)]">Loading…</div>;

  return (
    <div className="grid gap-6">
      {error === "load_failed" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
          <p className="text-sm font-medium text-rose-700">Couldn&apos;t load your jobs right now.</p>
          <p className="mt-1 text-xs text-rose-600">Check signal and try again.</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Today overview</CardTitle>
            <div className="flex items-center gap-2">
              {active ? <Badge>Timer running</Badge> : <Badge>Timer stopped</Badge>}
              <Button variant="secondary" type="button" onClick={load} disabled={busy}>
                Refresh
              </Button>
            </div>
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

          <div className="mt-4">
            {active ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4">
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">Active timer</div>
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Started {new Date(active.startedAtISO).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/engineer/jobs/${active.jobId}`}>
                    <Button variant="secondary" type="button">Open job</Button>
                  </Link>
                  <Button type="button" onClick={stop} disabled={busy}>
                    Stop timer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[var(--muted-foreground)]">No active timer. Start one from a job below.</div>
            )}
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
            {todaysJobs.map((j) => (
              <div key={j.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">{j.title || "Job"}</div>
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {j.clientName ? `${j.clientName} • ` : ""}{j.siteAddress || ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{j.status}</Badge>
                  <Link href={`/engineer/jobs/${j.id}`}>
                    <Button variant="secondary" type="button">Open</Button>
                  </Link>
                  <Button type="button" onClick={() => start(j.id)} disabled={busy || Boolean(active)}>
                    Start timer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
