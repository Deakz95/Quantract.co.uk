"use client";

import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { FeatureGate } from "@/components/billing/FeatureGate";
import { useBillingStatus } from "@/components/billing/useBillingStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import { isScheduleEnabled } from "@/lib/billing/plans";
import { toTitleCase } from "@/lib/cn";
import { AlertCircle, GripVertical, Trash2, Plus } from "lucide-react";

/* ── Types ─────────────────────────────────────────── */

type Job = { id: string; title?: string; clientName: string; status: string };
type Engineer = { id: string; email: string; name?: string };
type ScheduleEntry = {
  id: string;
  jobId: string;
  engineerEmail?: string;
  engineerName?: string;
  engineerId: string;
  startAtISO: string;
  endAtISO: string;
  notes?: string;
  jobTitle?: string;
};
type Clash = { engineerEmail?: string; aId: string; bId: string };
type UnassignedJob = {
  id: string;
  title?: string;
  status: string;
  clientName?: string;
  siteName?: string;
  sitePostcode?: string;
  engineerId?: string;
  engineerName?: string;
};

/* ── Helpers ───────────────────────────────────────── */

function mondayOf(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const HOUR_START = 6; // 06:00
const HOUR_END = 20;  // 20:00
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

/* ── Main Page ─────────────────────────────────────── */

export default function AdminSchedulePage() {
  const { toast } = useToast();

  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [jobs, setJobs] = useState<Job[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [clashes, setClashes] = useState<Clash[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "list" | "calendar">("board");
  const [dragEntryId, setDragEntryId] = useState<string | null>(null);
  const [dragJobId, setDragJobId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0); // day index for board view (0=Mon)

  const { status: billingStatus } = useBillingStatus();
  const scheduleEnabled = billingStatus ? isScheduleEnabled(billingStatus.plan) : true;

  const range = useMemo(() => {
    const from = weekStart;
    const to = addDays(weekStart, 7);
    return { from, to };
  }, [weekStart]);

  const currentDay = useMemo(() => addDays(weekStart, selectedDay), [weekStart, selectedDay]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [j, e, s, u] = await Promise.all([
        fetch("/api/admin/jobs").then((r) => r.json()).catch(() => null),
        fetch("/api/admin/engineers").then((r) => r.json()).catch(() => null),
        fetch(
          `/api/admin/schedule?from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}`
        ).then((r) => r.json()).catch(() => null),
        fetch(
          `/api/admin/schedule/unassigned?from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}`
        ).then((r) => r.json()).catch(() => null),
      ]);

      setJobs(Array.isArray(j) ? j : Array.isArray(j?.jobs) ? j.jobs : []);
      setEngineers(Array.isArray(e?.engineers) ? e.engineers : []);
      setEntries(Array.isArray(s?.entries) ? s.entries : []);
      setClashes(Array.isArray(s?.clashes) ? s.clashes : []);
      setUnassigned(Array.isArray(u?.jobs) ? u.jobs : []);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /* ── Grouped data ──────────────────────────── */

  const clashIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of clashes) { set.add(c.aId); set.add(c.bId); }
    return set;
  }, [clashes]);

  const byEngineer = useMemo(() => {
    const m = new Map<string, ScheduleEntry[]>();
    for (const en of entries) {
      const key = en.engineerId;
      const list = m.get(key) ?? [];
      list.push(en);
      m.set(key, list);
    }
    for (const [k, list] of m) {
      m.set(k, [...list].sort((a, b) => (a.startAtISO > b.startAtISO ? 1 : -1)));
    }
    return m;
  }, [entries]);

  const jobsById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);

  /* ── Drag and Drop ─────────────────────────── */

  function onDragStartEntry(ev: React.DragEvent, entryId: string) {
    setDragEntryId(entryId);
    setDragJobId(null);
    ev.dataTransfer.setData("application/x-entry-id", entryId);
    ev.dataTransfer.effectAllowed = "move";
  }

  function onDragStartJob(ev: React.DragEvent, jobId: string) {
    setDragJobId(jobId);
    setDragEntryId(null);
    ev.dataTransfer.setData("application/x-job-id", jobId);
    ev.dataTransfer.effectAllowed = "copy";
  }

  function onDragEnd() {
    setDragEntryId(null);
    setDragJobId(null);
  }

  async function onDropOnLane(ev: React.DragEvent, engineerId: string, hour: number) {
    ev.preventDefault();
    const entryId = ev.dataTransfer.getData("application/x-entry-id");
    const jobId = ev.dataTransfer.getData("application/x-job-id");

    if (entryId) {
      await moveEntry(entryId, engineerId, hour);
    } else if (jobId) {
      await createEntryFromDrop(jobId, engineerId, hour);
    }
    setDragEntryId(null);
    setDragJobId(null);
  }

  async function moveEntry(entryId: string, engineerId: string, hour: number) {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    const oldStart = new Date(entry.startAtISO);
    const oldEnd = new Date(entry.endAtISO);
    const durationMs = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(currentDay);
    newStart.setHours(hour, 0, 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);

    // Optimistic update
    const prevEntries = [...entries];
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, engineerId, startAtISO: newStart.toISOString(), endAtISO: newEnd.toISOString() }
          : e
      )
    );
    setBusy(entryId);

    try {
      const r = await fetch(`/api/admin/schedule/${entryId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          startAtISO: newStart.toISOString(),
          endAtISO: newEnd.toISOString(),
          engineerId,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        // Rollback
        setEntries(prevEntries);
        const errMsg = d?.error === "clash" ? "Time clash with another booking" : d?.error || "Move failed";
        toast({ title: "Cannot move", description: errMsg, variant: "destructive" });
      } else {
        await refresh();
      }
    } catch {
      setEntries(prevEntries);
      toast({ title: "Error", description: "Could not move entry.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function createEntryFromDrop(jobId: string, engineerId: string, hour: number) {
    const eng = engineers.find((e) => e.id === engineerId);
    if (!eng) return;

    const startAt = new Date(currentDay);
    startAt.setHours(hour, 0, 0, 0);
    const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000); // Default 2h

    setBusy("new");
    try {
      const r = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobId,
          engineerEmail: eng.email,
          startAtISO: startAt.toISOString(),
          endAtISO: endAt.toISOString(),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Failed");
      toast({ title: "Scheduled", description: "Job added to board.", variant: "success" });
      await refresh();
    } catch {
      toast({ title: "Error", description: "Could not schedule job.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function deleteEntry(entryId: string) {
    if (!confirm("Remove this booking from the schedule?")) return;
    setBusy(entryId);
    try {
      const r = await fetch(`/api/admin/schedule/${entryId}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Delete failed");
      toast({ title: "Removed", description: "Booking removed.", variant: "success" });
      await refresh();
    } catch {
      toast({ title: "Error", description: "Could not remove entry.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  /* ── Create form (for list/calendar view) ──── */

  async function createEntry(form: FormData) {
    const jobId = String(form.get("jobId") || "");
    const engineerEmail = String(form.get("engineerEmail") || "").toLowerCase();
    const startLocal = String(form.get("startAt") || "");
    const durationHrs = Number(form.get("duration") || 2);
    const notes = String(form.get("notes") || "").trim();

    if (!jobId || !engineerEmail || !startLocal || !Number.isFinite(durationHrs) || durationHrs <= 0) {
      toast({ title: "Missing fields", description: "Choose job, engineer, start time and duration.", variant: "destructive" });
      return;
    }

    const startAt = new Date(startLocal);
    const endAt = new Date(startAt.getTime() + durationHrs * 60 * 60 * 1000);

    setBusy("create");
    try {
      const r = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobId,
          engineerEmail,
          startAtISO: startAt.toISOString(),
          endAtISO: endAt.toISOString(),
          notes: notes || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Failed");
      toast({ title: "Scheduled", description: "Entry added to schedule.", variant: "success" });
      await refresh();
    } catch {
      toast({ title: "Error", description: "Could not create schedule entry.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  /* ── Board view helpers ────────────────────── */

  function entriesForLane(engineerId: string) {
    const dayStr = isoDate(currentDay);
    return (byEngineer.get(engineerId) ?? []).filter(
      (e) => isoDate(new Date(e.startAtISO)) === dayStr
    );
  }

  function entryPosition(entry: ScheduleEntry) {
    const start = new Date(entry.startAtISO);
    const end = new Date(entry.endAtISO);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const left = ((startHour - HOUR_START) / (HOUR_END - HOUR_START)) * 100;
    const width = ((endHour - startHour) / (HOUR_END - HOUR_START)) * 100;
    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(100 - Math.max(0, left), Math.max(2, width))}%`,
    };
  }

  /* ── Render ────────────────────────────────── */

  return (
    <AppShell role="admin" title="Schedule" subtitle="Dispatch board — schedule and manage engineer bookings.">
      <div className="space-y-4">
        <FeatureGate
          enabled={scheduleEnabled}
          title="Scheduling is on Team and Pro plans"
          description="Upgrade to unlock scheduling, timesheets, and team capacity planning."
          ctaLabel="Upgrade to Team"
        >
          {/* ── Toolbar ──────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant={view === "board" ? "default" : "secondary"} size="sm" onClick={() => setView("board")}>
                Board
              </Button>
              <Button type="button" variant={view === "list" ? "default" : "secondary"} size="sm" onClick={() => setView("list")}>
                List
              </Button>
              <Button type="button" variant={view === "calendar" ? "default" : "secondary"} size="sm" onClick={() => setView("calendar")}>
                Calendar
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setWeekStart(mondayOf(addDays(weekStart, -7)))}>
                Prev
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setWeekStart(mondayOf(new Date()))}>
                Today
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setWeekStart(mondayOf(addDays(weekStart, 7)))}>
                Next
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => void refresh()}>
                Refresh
              </Button>
            </div>
          </div>

          {/* ── Clash banner ─────────────────── */}
          {clashes.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-amber-800">Overbooked:</span>{" "}
                <span className="text-amber-700">{clashes.length} overlap(s) detected this week.</span>
              </div>
            </div>
          )}

          {/* ── Board View ───────────────────── */}
          {view === "board" && (
            <div className="flex gap-4">
              {/* Main board area */}
              <div className="flex-1 min-w-0">
                {/* Day tabs */}
                <div className="flex gap-1 mb-3 overflow-x-auto">
                  {days.map((day, i) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    const dayEntryCount = entries.filter((e) => isoDate(new Date(e.startAtISO)) === isoDate(day)).length;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDay(i)}
                        className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedDay === i
                            ? "bg-[var(--primary)] text-white"
                            : isToday
                              ? "bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20"
                              : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80"
                        }`}
                      >
                        <div>{day.toLocaleDateString("en-GB", { weekday: "short" })}</div>
                        <div className="text-xs opacity-80">{day.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                        {dayEntryCount > 0 && (
                          <div className={`text-xs mt-0.5 ${selectedDay === i ? "text-white/80" : "text-[var(--muted-foreground)]"}`}>
                            {dayEntryCount} job{dayEntryCount !== 1 ? "s" : ""}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {loading ? (
                  <div className="p-8 text-center text-[var(--muted-foreground)]">
                    <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    Loading board...
                  </div>
                ) : engineers.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-[var(--muted-foreground)]">
                      No engineers found. Add engineers in Settings to enable scheduling.
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-0 overflow-x-auto">
                      <div className="min-w-[800px]">
                        {/* Time header */}
                        <div className="flex border-b border-[var(--border)]">
                          <div className="w-40 flex-shrink-0 p-2 text-xs font-semibold text-[var(--muted-foreground)] bg-[var(--muted)]">
                            Engineer
                          </div>
                          <div className="flex-1 flex bg-[var(--muted)]">
                            {HOURS.map((h) => (
                              <div
                                key={h}
                                className="flex-1 text-center text-xs text-[var(--muted-foreground)] py-2 border-l border-[var(--border)]"
                              >
                                {String(h).padStart(2, "0")}:00
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Engineer lanes */}
                        {engineers.map((eng) => {
                          const laneEntries = entriesForLane(eng.id);
                          return (
                            <div key={eng.id} className="flex border-b border-[var(--border)] group">
                              {/* Engineer label */}
                              <div className="w-40 flex-shrink-0 p-2 flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/60 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                  {toTitleCase(eng.name || eng.email.split("@")[0])
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("") || "?"}
                                </div>
                                <span className="text-sm font-medium text-[var(--foreground)] truncate">
                                  {toTitleCase(eng.name || eng.email.split("@")[0])}
                                </span>
                              </div>

                              {/* Timeline */}
                              <div className="flex-1 relative min-h-[56px]">
                                {/* Hour grid lines */}
                                <div className="absolute inset-0 flex pointer-events-none">
                                  {HOURS.map((h) => (
                                    <div key={h} className="flex-1 border-l border-[var(--border)]" />
                                  ))}
                                </div>

                                {/* Drop zones (one per hour) */}
                                <div className="absolute inset-0 flex">
                                  {HOURS.map((h) => (
                                    <div
                                      key={h}
                                      className={`flex-1 transition-colors ${
                                        dragEntryId || dragJobId ? "hover:bg-[var(--primary)]/10" : ""
                                      }`}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = dragEntryId ? "move" : "copy";
                                      }}
                                      onDrop={(e) => onDropOnLane(e, eng.id, h)}
                                    />
                                  ))}
                                </div>

                                {/* Entries */}
                                {laneEntries.map((entry) => {
                                  const pos = entryPosition(entry);
                                  const job = jobsById.get(entry.jobId);
                                  const isClash = clashIds.has(entry.id);
                                  const isBusy = busy === entry.id;
                                  return (
                                    <div
                                      key={entry.id}
                                      draggable
                                      onDragStart={(e) => onDragStartEntry(e, entry.id)}
                                      onDragEnd={onDragEnd}
                                      className={`absolute top-1 bottom-1 rounded-lg border px-2 py-1 text-xs cursor-move transition-all z-10 overflow-hidden ${
                                        isClash
                                          ? "bg-amber-100 border-amber-400 hover:border-amber-500"
                                          : "bg-[var(--primary)]/10 border-[var(--primary)]/30 hover:border-[var(--primary)]"
                                      } ${isBusy ? "opacity-50" : ""}`}
                                      style={{ left: pos.left, width: pos.width }}
                                      title={`${job?.title || "Job"} • ${new Date(entry.startAtISO).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}–${new Date(entry.endAtISO).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
                                    >
                                      <div className="flex items-center gap-1 h-full min-w-0">
                                        <GripVertical className="w-3 h-3 text-[var(--muted-foreground)] flex-shrink-0 opacity-50" />
                                        <div className="flex-1 min-w-0">
                                          <div className="font-semibold text-[var(--foreground)] truncate leading-tight">
                                            {entry.jobTitle || job?.title || entry.notes || `Job ${entry.jobId.slice(0, 6)}`}
                                          </div>
                                          <div className="text-[var(--muted-foreground)] truncate leading-tight">
                                            {new Date(entry.startAtISO).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}–
                                            {new Date(entry.endAtISO).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                                          </div>
                                        </div>
                                        {isClash && <Badge variant="warning" className="text-[10px] px-1 flex-shrink-0">CLASH</Badge>}
                                        <button
                                          onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}
                                          className="flex-shrink-0 p-0.5 rounded hover:bg-red-100 text-[var(--muted-foreground)] hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                          title="Remove"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* ── Unassigned Queue Sidebar ──── */}
              <div className="w-64 flex-shrink-0">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Unassigned Jobs
                      {unassigned.length > 0 && (
                        <Badge variant="secondary" className="ml-auto">{unassigned.length}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                    {unassigned.length === 0 ? (
                      <div className="text-xs text-[var(--muted-foreground)] py-4 text-center">
                        All active jobs are scheduled this week.
                      </div>
                    ) : (
                      unassigned.map((job) => (
                        <div
                          key={job.id}
                          draggable
                          onDragStart={(e) => onDragStartJob(e, job.id)}
                          onDragEnd={onDragEnd}
                          className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 text-xs cursor-move hover:border-[var(--primary)] hover:shadow-sm transition-all"
                        >
                          <div className="font-semibold text-[var(--foreground)] truncate">
                            {job.title || `Job ${job.id.slice(0, 6)}`}
                          </div>
                          {job.clientName && (
                            <div className="text-[var(--muted-foreground)] truncate mt-0.5">{job.clientName}</div>
                          )}
                          {job.sitePostcode && (
                            <div className="text-[var(--muted-foreground)] truncate">{job.sitePostcode}</div>
                          )}
                          <Badge variant="secondary" className="mt-1 text-[10px]">{job.status}</Badge>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ── Calendar View (original) ─────── */}
          {view === "calendar" && !loading && (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-7 gap-px bg-[var(--border)] rounded-xl overflow-hidden min-w-[700px]">
                {Array.from({ length: 7 }, (_, i) => {
                  const day = addDays(weekStart, i);
                  const dayStr = day.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
                  const isToday = day.toDateString() === new Date().toDateString();
                  const dayEntries = entries.filter((e) => {
                    const start = new Date(e.startAtISO);
                    return start.toDateString() === day.toDateString();
                  });
                  return (
                    <div key={i} className={`bg-[var(--card)] min-h-[180px] p-2 ${isToday ? "ring-2 ring-inset ring-[var(--primary)]" : ""}`}>
                      <div className={`text-xs font-semibold mb-2 ${isToday ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}>
                        {dayStr}
                      </div>
                      <div className="space-y-1">
                        {dayEntries.map((e) => {
                          const start = new Date(e.startAtISO);
                          const end = new Date(e.endAtISO);
                          const time = `${start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
                          const eng = engineers.find((en) => en.email.toLowerCase() === (e.engineerEmail || "").toLowerCase());
                          const engDisplay = toTitleCase(eng?.name || e.engineerName || (e.engineerEmail ? e.engineerEmail.split("@")[0] : undefined));
                          return (
                            <Link key={e.id} href={`/admin/jobs/${e.jobId}`}>
                              <div className="rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 p-1.5 text-xs hover:bg-[var(--primary)]/20 transition-colors cursor-pointer">
                                <div className="font-semibold text-[var(--foreground)] truncate">{e.notes || `Job ${e.jobId.slice(0, 6)}`}</div>
                                <div className="text-[var(--muted-foreground)]">{time}</div>
                                {engDisplay && <div className="text-[var(--muted-foreground)] truncate">{engDisplay}</div>}
                              </div>
                            </Link>
                          );
                        })}
                        {dayEntries.length === 0 && (
                          <div className="text-xs text-[var(--muted-foreground)] italic">No bookings</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── List View (original) ─────────── */}
          {view === "list" && (
            <>
              {/* Create form */}
              <Card>
                <CardContent>
                  <div className="text-sm font-semibold text-[var(--foreground)]">Add schedule entry</div>
                  <form
                    className="mt-3 flex flex-wrap items-end gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void createEntry(new FormData(e.currentTarget));
                      e.currentTarget.reset();
                    }}
                  >
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-[var(--foreground)]">Job</span>
                      <select name="jobId" required className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]">
                        <option value="">Select…</option>
                        {jobs.map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.title ? `${j.title} — ` : ""}{j.clientName} ({j.status})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-[var(--foreground)]">Engineer</span>
                      <select name="engineerEmail" required className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]">
                        <option value="">Select…</option>
                        {engineers.map((en) => (
                          <option key={en.id} value={en.email}>
                            {toTitleCase(en.name || en.email.split("@")[0])}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-[var(--foreground)]">Start</span>
                      <input
                        name="startAt"
                        type="datetime-local"
                        defaultValue={toLocalInputValue(new Date().toISOString())}
                        required
                        className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-[var(--foreground)]">Duration (hrs)</span>
                      <input
                        name="duration"
                        type="number"
                        step="0.5"
                        defaultValue={2}
                        className="w-28 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-[var(--foreground)]">Notes</span>
                      <input name="notes" className="w-64 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]" placeholder="Optional" />
                    </label>

                    <Button type="submit" disabled={!!busy}>Add</Button>
                  </form>
                </CardContent>
              </Card>

              {/* List */}
              {loading ? (
                <div className="text-sm text-[var(--muted-foreground)]">Loading…</div>
              ) : engineers.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-title">No engineers found</div>
                  <p className="empty-state-description">Add engineers in Settings to enable scheduling.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {engineers.map((en) => {
                    const list = byEngineer.get(en.id) ?? [];
                    return (
                      <Card key={en.id}>
                        <CardContent>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-semibold text-[var(--foreground)]">{toTitleCase(en.name || en.email.split("@")[0])}</div>
                            <Badge variant="secondary">{list.length} entries</Badge>
                          </div>

                          {list.length === 0 ? (
                            <div className="mt-2 text-sm text-[var(--muted-foreground)]">No bookings this week.</div>
                          ) : (
                            <div className="mt-2 space-y-2">
                              {list.map((s) => {
                                const clash = clashIds.has(s.id);
                                return (
                                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-sm">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Link href={`/admin/jobs/${s.jobId}`} className="font-semibold text-[var(--primary)] hover:underline">
                                          {(() => { const j = jobsById.get(s.jobId); return j?.title || `Job ${s.jobId.slice(0, 6)}`; })()}
                                        </Link>
                                        {clash && <Badge variant="warning">OVERBOOKED</Badge>}
                                      </div>
                                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                                        {new Date(s.startAtISO).toLocaleString("en-GB")} → {new Date(s.endAtISO).toLocaleString("en-GB")}
                                        {s.notes ? ` • ${s.notes}` : ""}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => deleteEntry(s.id)}
                                      className="p-1 rounded hover:bg-red-100 text-[var(--muted-foreground)] hover:text-red-600 transition-colors"
                                      title="Remove booking"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Date range label */}
          <div className="text-xs text-[var(--muted-foreground)] text-center">
            {range.from.toLocaleDateString("en-GB")} → {addDays(range.to, -1).toLocaleDateString("en-GB")}
            {view === "board" && " • Drag jobs from the sidebar onto engineer lanes to schedule. Drag existing entries to reschedule."}
          </div>
        </FeatureGate>
      </div>
    </AppShell>
  );
}
