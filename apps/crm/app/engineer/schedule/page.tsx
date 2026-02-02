"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeatureGate } from "@/components/billing/FeatureGate";
import { useEntitlements } from "@/components/billing/useEntitlements";

type ScheduleEntry = {
  id: string;
  jobId: string;
  engineerId: string;
  engineerEmail?: string;
  startAtISO: string;
  endAtISO: string;
  notes?: string;
};

type Job = {
  id: string;
  title?: string;
  clientName?: string;
  siteAddress?: string;
  status?: string;
};

type Clash = { aId: string; bId: string };

function mondayOf(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function formatDayLabel(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function formatTimeRange(entry: ScheduleEntry) {
  const start = new Date(entry.startAtISO).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const end = new Date(entry.endAtISO).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${start}–${end}`;
}

export default function EngineerSchedulePage() {
  const { hasFeature } = useEntitlements();
  const scheduleEnabled = hasFeature("feature_schedule");

  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [jobs, setJobs] = useState<Job[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [clashes, setClashes] = useState<Clash[]>([]);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    const from = weekStart;
    const to = addDays(weekStart, 7);
    return { from, to };
  }, [weekStart]);

  async function refresh() {
    setLoading(true);
    try {
      const [jobsRes, schedRes] = await Promise.all([
        fetch("/api/engineer/jobs", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        fetch(`/api/engineer/schedule?from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}`, { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => null),
      ]);
      setJobs(Array.isArray(jobsRes?.jobs) ? jobsRes.jobs : []);
      setEntries(Array.isArray(schedRes?.entries) ? schedRes.entries : []);
      setClashes(Array.isArray(schedRes?.clashes) ? schedRes.clashes : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from.toISOString()]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(range.from, i)), [range.from]);

  const jobsById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>();
    for (const entry of entries) {
      const key = new Date(entry.startAtISO).toDateString();
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    for (const [key, list] of map.entries()) {
      map.set(key, [...list].sort((a, b) => (a.startAtISO > b.startAtISO ? 1 : -1)));
    }
    return map;
  }, [entries]);

  const clashIds = useMemo(() => {
    const set = new Set<string>();
    for (const clash of clashes) {
      set.add(clash.aId);
      set.add(clash.bId);
    }
    return set;
  }, [clashes]);

  return (
    <FeatureGate
      enabled={scheduleEnabled}
      title="Schedule requires a Pro plan or CRM module"
      description="Upgrade your plan to access scheduling and engineer availability."
    >
    <div className="space-y-4">
        <Card>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">Week of {range.from.toLocaleDateString("en-GB")}</div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {range.from.toLocaleDateString("en-GB")} → {addDays(range.to, -1).toLocaleDateString("en-GB")}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" onClick={() => setWeekStart(mondayOf(addDays(weekStart, -7)))}>
                  Prev
                </Button>
                <Button type="button" variant="secondary" onClick={() => setWeekStart(mondayOf(new Date()))}>
                  Today
                </Button>
                <Button type="button" variant="secondary" onClick={() => setWeekStart(mondayOf(addDays(weekStart, 7)))}>
                  Next
                </Button>
                <Button type="button" variant="secondary" onClick={refresh}>
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {clashes.length > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {clashes.length} schedule clash{clashes.length === 1 ? "" : "es"} detected this week. Check the highlighted entries.
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-[var(--muted-foreground)]">Loading…</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
            {days.map((day) => {
              const items = entriesByDay.get(day.toDateString()) ?? [];
              return (
                <div key={day.toISOString()} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-[var(--muted-foreground)]">{formatDayLabel(day)}</div>
                    <Badge>{items.length} jobs</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {items.length === 0 ? <div className="text-xs text-[var(--muted-foreground)]">No bookings.</div> : null}
                    {items.map((entry) => {
                      const job = jobsById.get(entry.jobId);
                      const clash = clashIds.has(entry.id);
                      return (
                        <Link key={entry.id} href={`/engineer/jobs/${entry.jobId}`} className="block">
                          <div className="rounded-xl border border-[var(--border)] p-3 text-xs text-[var(--muted-foreground)] hover:border-[var(--border)]">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-[var(--foreground)]">{job?.title || "Job"}</div>
                              {clash ? <Badge className="border-amber-300 bg-amber-100 text-amber-900">Clash</Badge> : null}
                            </div>
                            <div className="mt-1 text-xs text-[var(--muted-foreground)]">{formatTimeRange(entry)}</div>
                            {job?.clientName || job?.siteAddress ? (
                              <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                                {job?.clientName ? `${job.clientName} • ` : ""}{job?.siteAddress || ""}
                              </div>
                            ) : null}
                            {entry.notes ? <div className="mt-1 text-xs text-[var(--muted-foreground)]">{entry.notes}</div> : null}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
    </FeatureGate>
  );
}
