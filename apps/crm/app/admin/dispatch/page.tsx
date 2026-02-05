"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  GripVertical,
  X,
  Copy,
  RefreshCcw,
  Filter,
  Settings,
} from "lucide-react";
import { toTitleCase } from "@/lib/cn";

/* ────────────────────── Types ────────────────────── */

type Engineer = {
  id: string;
  name: string;
  email: string;
  workStartHour: number;
  workEndHour: number;
  breakMinutes: number;
  maxJobsPerDay: number | null;
  travelBufferMinutes: number;
};

type DispatchStatus = "scheduled" | "en_route" | "on_site" | "in_progress" | "completed";

type Entry = {
  id: string;
  engineerId: string;
  engineerName?: string;
  jobId: string;
  jobTitle?: string;
  startAtISO: string;
  endAtISO: string;
  notes?: string;
  status?: DispatchStatus;
};

type UnassignedJob = {
  id: string;
  title: string;
  status: string;
  clientName?: string;
  siteName?: string;
  sitePostcode?: string;
  engineerId?: string;
  engineerName?: string;
};

type RecurringRule = {
  id: string;
  jobId: string | null;
  engineerId: string;
  pattern: string;
  startTime: string;
  durationMinutes: number;
  validFrom: string;
  validUntil: string | null;
  notes: string | null;
};

/* ────────────────────── Date helpers ────────────────────── */

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Mon = start
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function isToday(d: Date) {
  return isoDate(d) === isoDate(new Date());
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ────────────────────── Constants ────────────────────── */

const HOUR_START = 6; // 06:00
const HOUR_END = 20; // 20:00
const TOTAL_HOURS = HOUR_END - HOUR_START; // 14
const PX_PER_HOUR = 80;
const LANE_WIDTH = TOTAL_HOURS * PX_PER_HOUR; // 1120px
const SNAP_MINUTES = 15;
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000; // 2h for new entries

const STATUS_COLOURS: Record<DispatchStatus, { bg: string; text: string; label: string }> = {
  scheduled: { bg: "bg-slate-100", text: "text-slate-700", label: "Scheduled" },
  en_route: { bg: "bg-blue-100", text: "text-blue-700", label: "En Route" },
  on_site: { bg: "bg-amber-100", text: "text-amber-700", label: "On Site" },
  in_progress: { bg: "bg-violet-100", text: "text-violet-700", label: "In Progress" },
  completed: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Completed" },
};

const ALL_STATUSES: DispatchStatus[] = ["scheduled", "en_route", "on_site", "in_progress", "completed"];

/* ────────────────────── Colour pool for engineers ────────────────────── */

const LANE_COLOURS = [
  { bg: "rgba(59,130,246,0.15)", border: "rgb(59,130,246)" },
  { bg: "rgba(16,185,129,0.15)", border: "rgb(16,185,129)" },
  { bg: "rgba(245,158,11,0.15)", border: "rgb(245,158,11)" },
  { bg: "rgba(168,85,247,0.15)", border: "rgb(168,85,247)" },
  { bg: "rgba(239,68,68,0.15)", border: "rgb(239,68,68)" },
  { bg: "rgba(6,182,212,0.15)", border: "rgb(6,182,212)" },
];

function engineerColour(idx: number) {
  return LANE_COLOURS[idx % LANE_COLOURS.length];
}

/* ────────────────────── Pixel/time conversions ────────────────────── */

function timeToX(iso: string): number {
  const d = new Date(iso);
  const hours = d.getHours() + d.getMinutes() / 60 - HOUR_START;
  return Math.max(0, Math.min(hours * PX_PER_HOUR, LANE_WIDTH));
}

function xToDate(x: number, dayDate: Date): Date {
  const totalMinutes = (x / PX_PER_HOUR) * 60 + HOUR_START * 60;
  const snapped = Math.round(totalMinutes / SNAP_MINUTES) * SNAP_MINUTES;
  const hours = Math.floor(snapped / 60);
  const mins = snapped % 60;
  const d = new Date(dayDate);
  d.setHours(Math.max(HOUR_START, Math.min(hours, HOUR_END)), mins, 0, 0);
  return d;
}

function durationPx(startISO: string, endISO: string): number {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const hours = (e.getTime() - s.getTime()) / 3_600_000;
  return Math.max(hours * PX_PER_HOUR, 20); // min 20px
}

/* ────────────────────── Error message helper ────────────────────── */

function formatApiError(json: any): string {
  switch (json.error) {
    case "clash":
      return "Clash: this time slot overlaps an existing booking for this engineer.";
    case "outside_working_hours":
      return `Outside working hours: this engineer works ${String(json.workStartHour ?? 8).padStart(2, "0")}:00–${String(json.workEndHour ?? 17).padStart(2, "0")}:00.`;
    case "max_jobs_exceeded":
      return `At capacity: engineer already has ${json.currentCount}/${json.maxJobsPerDay} jobs this day.`;
    case "travel_buffer_violation":
      return `Too close to another booking. ${json.travelBufferMinutes ?? 0}min travel buffer required between jobs.`;
    case "overlaps_break":
      return "This slot overlaps the engineer's break period. The entry was not saved – use the override option if intended.";
    default:
      return json.error || "Update failed";
  }
}

/* ────────────────────────────────────────────────────── */
/*                  MAIN COMPONENT                       */
/* ────────────────────────────────────────────────────── */

export default function DispatchBoardPage() {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [popover, setPopover] = useState<{ entry: Entry; rect: DOMRect } | null>(null);

  // Queue sidebar
  const [queueOpen, setQueueOpen] = useState(true);
  const [queueFilter, setQueueFilter] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState<Set<DispatchStatus>>(new Set());
  const [postcodeFilter, setPostcodeFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Copy week modal
  const [copyWeekOpen, setCopyWeekOpen] = useState(false);
  const [copyWeekTarget, setCopyWeekTarget] = useState("");
  const [copyWeekBusy, setCopyWeekBusy] = useState(false);

  // Recurring rules panel
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [recurringBusy, setRecurringBusy] = useState(false);
  const [newRule, setNewRule] = useState({ engineerId: "", pattern: "weekly:1", startTime: "09:00", durationMinutes: 120 });

  // Engineer config modal
  const [configEngineer, setConfigEngineer] = useState<Engineer | null>(null);
  const [configForm, setConfigForm] = useState({ workStartHour: 8, workEndHour: 17, breakMinutes: 30, maxJobsPerDay: null as number | null, travelBufferMinutes: 0 });
  const [configBusy, setConfigBusy] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  /* ── Data fetching ── */

  const fetchData = useCallback(async () => {
    setError(null);
    const from = isoDate(weekStart);
    const to = isoDate(addDays(weekStart, 7));
    try {
      const [engRes, schedRes, unassRes] = await Promise.all([
        fetch("/api/admin/engineers"),
        fetch(`/api/admin/schedule?from=${from}&to=${to}`),
        fetch(`/api/admin/schedule/unassigned?from=${from}&to=${to}`),
      ]);
      const engJson = await engRes.json();
      const schedJson = await schedRes.json();
      const unassJson = await unassRes.json();

      setEngineers(
        (engJson.engineers || engJson.data || []).map((e: any) => ({
          id: e.id,
          name: e.name || e.email,
          email: e.email,
          workStartHour: e.workStartHour ?? 8,
          workEndHour: e.workEndHour ?? 17,
          breakMinutes: e.breakMinutes ?? 30,
          maxJobsPerDay: e.maxJobsPerDay ?? null,
          travelBufferMinutes: e.travelBufferMinutes ?? 0,
        })),
      );
      setEntries(
        (schedJson.entries || schedJson.data || []).map((e: any) => ({
          id: e.id,
          engineerId: e.engineerId,
          engineerName: e.engineerName || e.engineer,
          jobId: e.jobId,
          jobTitle: e.jobTitle || e.job,
          startAtISO: e.startAtISO || e.startAt || e.start,
          endAtISO: e.endAtISO || e.endAt || e.end,
          notes: e.notes,
          status: e.status || "scheduled",
        })),
      );
      setUnassigned(unassJson.jobs || []);
    } catch {
      setError("Failed to load dispatch data");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  /* ── Week navigation ── */
  function prevWeek() {
    setWeekStart((w) => addDays(w, -7));
  }
  function nextWeek() {
    setWeekStart((w) => addDays(w, 7));
  }
  function goToday() {
    setWeekStart(startOfWeek(new Date()));
    setSelectedDay(new Date());
  }

  /* ── PATCH entry (move / resize) ── */

  async function patchEntry(
    entryId: string,
    patch: { startAtISO?: string; endAtISO?: string; engineerId?: string; force?: boolean },
  ) {
    setBusyIds((s) => new Set(s).add(entryId));
    setError(null);
    try {
      const res = await fetch(`/api/admin/schedule/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) {
        // Break overlap is overridable — prompt the user
        if (json.error === "overlaps_break" && json.overridable && !patch.force) {
          const override = window.confirm(
            "This slot overlaps the engineer's break period. Schedule anyway?",
          );
          if (override) {
            setBusyIds((s) => { const n = new Set(s); n.delete(entryId); return n; });
            return patchEntry(entryId, { ...patch, force: true });
          }
        }
        setError(formatApiError(json));
        return false;
      }
      // Apply optimistically
      setEntries((prev) =>
        prev.map((e) => {
          if (e.id !== entryId) return e;
          return {
            ...e,
            startAtISO: patch.startAtISO ?? e.startAtISO,
            endAtISO: patch.endAtISO ?? e.endAtISO,
            engineerId: patch.engineerId ?? e.engineerId,
          };
        }),
      );
      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(entryId);
        return n;
      });
    }
  }

  /* ── Schedule unassigned job (with client-side pre-validation) ── */

  async function scheduleJob(jobId: string, engineerId: string, startDate: Date, force?: boolean) {
    setError(null);
    const eng = engineers.find((e) => e.id === engineerId);
    if (!eng) return;

    // Client-side pre-validation: working hours
    const startHour = startDate.getHours() + startDate.getMinutes() / 60;
    const endDate = new Date(startDate.getTime() + DEFAULT_DURATION_MS);
    const endHour = endDate.getHours() + endDate.getMinutes() / 60;
    if (startHour < eng.workStartHour || endHour > eng.workEndHour) {
      setError(`Outside working hours: ${toTitleCase(eng.name)} works ${String(eng.workStartHour).padStart(2, "0")}:00–${String(eng.workEndHour).padStart(2, "0")}:00.`);
      return;
    }

    const startAtISO = startDate.toISOString();
    const endAtISO = endDate.toISOString();
    try {
      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          engineerEmail: eng.email,
          startAtISO,
          endAtISO,
          ...(force ? { force: true } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        // Break overlap is overridable — prompt the user
        if (json.error === "overlaps_break" && json.overridable && !force) {
          const override = window.confirm(
            "This slot overlaps the engineer's break period. Schedule anyway?",
          );
          if (override) {
            return scheduleJob(jobId, engineerId, startDate, true);
          }
        }
        setError(formatApiError(json));
        return;
      }
      await fetchData();
    } catch {
      setError("Network error");
    }
  }

  /* ── Entries for a specific engineer + day ── */

  function entriesForDay(engineerId: string, day: Date) {
    const dayKey = isoDate(day);
    return filteredEntries.filter(
      (e) => e.engineerId === engineerId && isoDate(new Date(e.startAtISO)) === dayKey,
    );
  }

  /* ── Filtered entries (by status + postcode) ── */
  const filteredEntries = useMemo(() => {
    let result = entries;
    if (statusFilter.size > 0) {
      result = result.filter((e) => statusFilter.has(e.status || "scheduled"));
    }
    if (postcodeFilter) {
      const q = postcodeFilter.toLowerCase();
      result = result.filter((e) =>
        (e.jobTitle || "").toLowerCase().includes(q) ||
        (e.notes || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [entries, statusFilter, postcodeFilter]);

  /* ── Filtered unassigned list ── */
  const filteredUnassigned = useMemo(() => {
    if (!queueFilter) return unassigned;
    const q = queueFilter.toLowerCase();
    return unassigned.filter(
      (j) =>
        (j.title || "").toLowerCase().includes(q) ||
        (j.clientName || "").toLowerCase().includes(q) ||
        (j.sitePostcode || "").toLowerCase().includes(q),
    );
  }, [unassigned, queueFilter]);

  /* ── Job count per engineer for selected day ── */
  const jobCountsByEngineer = useMemo(() => {
    const counts = new Map<string, number>();
    const dayKey = isoDate(selectedDay);
    for (const e of entries) {
      if (isoDate(new Date(e.startAtISO)) === dayKey) {
        counts.set(e.engineerId, (counts.get(e.engineerId) || 0) + 1);
      }
    }
    return counts;
  }, [entries, selectedDay]);

  /* ── Close popover on click outside ── */
  useEffect(() => {
    if (!popover) return;
    const handler = () => setPopover(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [popover]);

  /* ── Copy week handler ── */
  async function handleCopyWeek() {
    if (!copyWeekTarget) return;
    setCopyWeekBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dispatch/copy-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceWeekStart: weekStart.toISOString(),
          targetWeekStart: new Date(copyWeekTarget).toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Copy failed");
      } else {
        setCopyWeekOpen(false);
        setCopyWeekTarget("");
        // If target is the current week, refresh
        if (isoDate(new Date(copyWeekTarget)) === isoDate(weekStart)) {
          await fetchData();
        }
      }
    } catch {
      setError("Network error");
    } finally {
      setCopyWeekBusy(false);
    }
  }

  /* ── Recurring rules handlers ── */
  async function fetchRecurringRules() {
    setRecurringBusy(true);
    try {
      const res = await fetch("/api/admin/dispatch/recurring");
      const json = await res.json();
      if (json.ok) setRecurringRules(json.rules || []);
    } catch { /* ignore */ }
    finally { setRecurringBusy(false); }
  }

  async function createRecurringRule() {
    if (!newRule.engineerId || !newRule.pattern || !newRule.startTime) {
      setError("Fill in all recurring rule fields");
      return;
    }
    setRecurringBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dispatch/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engineerId: newRule.engineerId,
          pattern: newRule.pattern,
          startTime: newRule.startTime,
          durationMinutes: newRule.durationMinutes,
          validFrom: new Date().toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to create rule");
      } else {
        await fetchRecurringRules();
      }
    } catch {
      setError("Network error");
    } finally {
      setRecurringBusy(false);
    }
  }

  async function generateFromRules() {
    setRecurringBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dispatch/recurring/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetWeekStart: weekStart.toISOString() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Generation failed");
      } else if (json.created > 0) {
        await fetchData();
      } else {
        setError("No new entries to generate (all already exist for this week).");
      }
    } catch {
      setError("Network error");
    } finally {
      setRecurringBusy(false);
    }
  }

  useEffect(() => {
    if (recurringOpen) fetchRecurringRules();
  }, [recurringOpen]);

  /* ── Polling for real-time status updates (30s) ── */
  useEffect(() => {
    const id = setInterval(async () => {
      const from = isoDate(weekStart);
      const to = isoDate(addDays(weekStart, 7));
      try {
        const res = await fetch(`/api/admin/schedule?from=${from}&to=${to}`);
        const json = await res.json();
        if (json.ok) {
          setEntries(
            (json.entries || []).map((e: any) => ({
              id: e.id,
              engineerId: e.engineerId,
              engineerName: e.engineerName || e.engineer,
              jobId: e.jobId,
              jobTitle: e.jobTitle || e.job,
              startAtISO: e.startAtISO || e.startAt || e.start,
              endAtISO: e.endAtISO || e.endAt || e.end,
              notes: e.notes,
              status: e.status || "scheduled",
            })),
          );
        }
      } catch { /* silent fail for background poll */ }
    }, 30_000);
    return () => clearInterval(id);
  }, [weekStart]);

  /* ── Engineer config handlers ── */
  function openEngineerConfig(eng: Engineer) {
    setConfigEngineer(eng);
    setConfigForm({
      workStartHour: eng.workStartHour,
      workEndHour: eng.workEndHour,
      breakMinutes: eng.breakMinutes,
      maxJobsPerDay: eng.maxJobsPerDay,
      travelBufferMinutes: eng.travelBufferMinutes,
    });
  }

  async function saveEngineerConfig() {
    if (!configEngineer) return;
    setConfigBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/engineers/${configEngineer.id}/schedule-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to save config");
      } else {
        // Update local engineer data
        setEngineers((prev) =>
          prev.map((e) =>
            e.id === configEngineer.id
              ? { ...e, ...configForm }
              : e,
          ),
        );
        setConfigEngineer(null);
      }
    } catch {
      setError("Network error");
    } finally {
      setConfigBusy(false);
    }
  }

  /* ────────────────────── Render ────────────────────── */

  return (
    <AppShell role="admin" title="Dispatch Board" subtitle="Drag to schedule, resize to adjust duration">
      <div className="space-y-4">
        {/* ── Top controls ── */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={prevWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={goToday}>
              Today
            </Button>
            <Button variant="secondary" size="sm" onClick={nextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-[var(--foreground)] ml-2">
              {days[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })} –{" "}
              {days[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={filtersOpen ? "default" : "secondary"}
              size="sm"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <Filter className="w-4 h-4 mr-1.5" />
              Filters
              {statusFilter.size > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                  {statusFilter.size}
                </Badge>
              )}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setCopyWeekOpen(true)}>
              <Copy className="w-4 h-4 mr-1.5" />
              Copy Week
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setRecurringOpen(!recurringOpen)}>
              <RefreshCcw className="w-4 h-4 mr-1.5" />
              Recurring
            </Button>
            <Button
              variant={queueOpen ? "default" : "secondary"}
              size="sm"
              onClick={() => setQueueOpen(!queueOpen)}
            >
              <Briefcase className="w-4 h-4 mr-1.5" />
              Queue
              {unassigned.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                  {unassigned.length}
                </Badge>
              )}
            </Button>
            <Button variant="secondary" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── Filters panel ── */}
        {filtersOpen && (
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Status:</span>
                {ALL_STATUSES.map((s) => {
                  const sc = STATUS_COLOURS[s];
                  const active = statusFilter.has(s);
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        setStatusFilter((prev) => {
                          const next = new Set(prev);
                          if (next.has(s)) next.delete(s);
                          else next.add(s);
                          return next;
                        });
                      }}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                        active
                          ? `${sc.bg} ${sc.text} border-current`
                          : "bg-[var(--muted)] text-[var(--muted-foreground)] border-transparent hover:border-[var(--border)]"
                      }`}
                    >
                      {sc.label}
                    </button>
                  );
                })}
                <div className="ml-auto flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={postcodeFilter}
                    onChange={(e) => setPostcodeFilter(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] w-40"
                  />
                  {(statusFilter.size > 0 || postcodeFilter) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => { setStatusFilter(new Set()); setPostcodeFilter(""); }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Day tabs ── */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {days.map((d) => (
            <button
              key={isoDate(d)}
              onClick={() => setSelectedDay(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isoDate(d) === isoDate(selectedDay)
                  ? "bg-[var(--primary)] text-white"
                  : isToday(d)
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]/80"
              }`}
            >
              {d.toLocaleDateString(undefined, { weekday: "short" })}{" "}
              {d.toLocaleDateString(undefined, { day: "2-digit" })}
            </button>
          ))}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/20 p-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[var(--error)] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--error)]">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-[var(--error)] hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Main area: board + sidebars ── */}
        {loading ? (
          <div className="p-8 text-center text-[var(--muted-foreground)]">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading dispatch board...
          </div>
        ) : (
          <div className="flex gap-4">
            {/* ── Board ── */}
            <Card className="flex-1 min-w-0">
              <CardContent className="p-0 overflow-x-auto">
                <div style={{ minWidth: LANE_WIDTH + 160 }}>
                  {/* Time header */}
                  <div className="flex border-b border-[var(--border)] sticky top-0 bg-[var(--card)] z-10">
                    <div className="w-[160px] shrink-0 p-3 text-xs font-semibold text-[var(--muted-foreground)] bg-[var(--muted)]">
                      Engineer
                    </div>
                    <div className="flex relative" style={{ width: LANE_WIDTH }}>
                      {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                        <div
                          key={i}
                          className="border-l border-[var(--border)] text-center text-[10px] text-[var(--muted-foreground)] py-1 bg-[var(--muted)]"
                          style={{ width: PX_PER_HOUR }}
                        >
                          {String(HOUR_START + i).padStart(2, "0")}:00
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Engineer lanes */}
                  {engineers.map((eng, engIdx) => (
                    <EngineerLane
                      key={eng.id}
                      engineer={eng}
                      engIdx={engIdx}
                      entries={entriesForDay(eng.id, selectedDay)}
                      allDayEntries={entries.filter((e) => e.engineerId === eng.id && isoDate(new Date(e.startAtISO)) === isoDate(selectedDay))}
                      day={selectedDay}
                      busyIds={busyIds}
                      jobCount={jobCountsByEngineer.get(eng.id) || 0}
                      onPatch={patchEntry}
                      onScheduleJob={scheduleJob}
                      onShowPopover={(entry, rect) => setPopover({ entry, rect })}
                      onOpenConfig={() => openEngineerConfig(eng)}
                    />
                  ))}

                  {engineers.length === 0 && (
                    <div className="p-8 text-center text-[var(--muted-foreground)]">
                      No engineers found.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── Sidebars ── */}
            <div className="flex flex-col gap-4 w-72 shrink-0">
              {/* ── Unassigned queue sidebar ── */}
              {queueOpen && (
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[var(--foreground)]">
                        Unassigned Jobs
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {unassigned.length}
                      </Badge>
                    </div>
                    <input
                      type="text"
                      placeholder="Filter jobs..."
                      value={queueFilter}
                      onChange={(e) => setQueueFilter(e.target.value)}
                      className="w-full mb-2 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                    />
                    <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                      {filteredUnassigned.length === 0 ? (
                        <p className="text-xs text-[var(--muted-foreground)] text-center py-4">
                          {unassigned.length === 0 ? "All jobs scheduled" : "No matches"}
                        </p>
                      ) : (
                        filteredUnassigned.map((job) => (
                          <div
                            key={job.id}
                            draggable
                            onDragStart={(ev) => {
                              ev.dataTransfer.setData("application/x-unassigned-job", job.id);
                              ev.dataTransfer.effectAllowed = "copy";
                            }}
                            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-2.5 cursor-grab hover:border-[var(--primary)] hover:shadow-sm transition-all"
                          >
                            <div className="text-xs font-medium text-[var(--foreground)] truncate">
                              {job.title || "Untitled job"}
                            </div>
                            {job.clientName && (
                              <div className="text-[10px] text-[var(--muted-foreground)] truncate mt-0.5">
                                {job.clientName}
                              </div>
                            )}
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                {job.status}
                              </Badge>
                              {job.sitePostcode && (
                                <span className="text-[10px] text-[var(--muted-foreground)]">
                                  {job.sitePostcode}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ── Recurring rules sidebar ── */}
              {recurringOpen && (
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[var(--foreground)]">
                        Recurring Rules
                      </span>
                      <button onClick={() => setRecurringOpen(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Existing rules */}
                    <div className="space-y-1.5 max-h-[20vh] overflow-y-auto mb-3">
                      {recurringBusy && <p className="text-xs text-[var(--muted-foreground)]">Loading...</p>}
                      {!recurringBusy && recurringRules.length === 0 && (
                        <p className="text-xs text-[var(--muted-foreground)] text-center py-2">No recurring rules</p>
                      )}
                      {recurringRules.map((rule) => {
                        const eng = engineers.find((e) => e.id === rule.engineerId);
                        return (
                          <div key={rule.id} className="rounded-lg border border-[var(--border)] p-2 text-[10px] flex items-start justify-between gap-1">
                            <div>
                              <div className="font-medium text-[var(--foreground)]">{eng ? toTitleCase(eng.name) : rule.engineerId}</div>
                              <div className="text-[var(--muted-foreground)]">{rule.pattern} at {rule.startTime} ({rule.durationMinutes}min)</div>
                            </div>
                            <button
                              onClick={async () => {
                                if (!window.confirm("Delete this recurring rule?")) return;
                                setRecurringBusy(true);
                                try {
                                  const res = await fetch(`/api/admin/dispatch/recurring/${rule.id}`, { method: "DELETE" });
                                  if (res.ok) {
                                    setRecurringRules((prev) => prev.filter((r) => r.id !== rule.id));
                                  } else {
                                    const json = await res.json();
                                    setError(json.error || "Delete failed");
                                  }
                                } catch { setError("Network error"); }
                                finally { setRecurringBusy(false); }
                              }}
                              className="shrink-0 p-0.5 rounded text-[var(--muted-foreground)] hover:text-[var(--error)] transition-colors"
                              title="Delete rule"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* New rule form */}
                    <div className="space-y-1.5 border-t border-[var(--border)] pt-2">
                      <p className="text-[10px] font-semibold text-[var(--muted-foreground)]">Add Rule</p>
                      <select
                        value={newRule.engineerId}
                        onChange={(e) => setNewRule((r) => ({ ...r, engineerId: e.target.value }))}
                        className="w-full px-2 py-1 text-xs rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                      >
                        <option value="">Select engineer</option>
                        {engineers.map((eng) => (
                          <option key={eng.id} value={eng.id}>{toTitleCase(eng.name)}</option>
                        ))}
                      </select>
                      <select
                        value={newRule.pattern}
                        onChange={(e) => setNewRule((r) => ({ ...r, pattern: e.target.value }))}
                        className="w-full px-2 py-1 text-xs rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                      >
                        <option value="weekly:1">Every Monday</option>
                        <option value="weekly:2">Every Tuesday</option>
                        <option value="weekly:3">Every Wednesday</option>
                        <option value="weekly:4">Every Thursday</option>
                        <option value="weekly:5">Every Friday</option>
                        <option value="weekly:1,2,3,4,5">Mon–Fri</option>
                        <option value="weekly:1,3,5">Mon/Wed/Fri</option>
                        <option value="weekly:2,4">Tue/Thu</option>
                      </select>
                      <div className="flex gap-1.5">
                        <input
                          type="time"
                          value={newRule.startTime}
                          onChange={(e) => setNewRule((r) => ({ ...r, startTime: e.target.value }))}
                          className="flex-1 px-2 py-1 text-xs rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                        />
                        <input
                          type="number"
                          value={newRule.durationMinutes}
                          onChange={(e) => setNewRule((r) => ({ ...r, durationMinutes: Number(e.target.value) || 120 }))}
                          placeholder="mins"
                          min={15}
                          max={480}
                          className="w-16 px-2 py-1 text-xs rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                        />
                      </div>
                      <Button size="sm" className="w-full" disabled={recurringBusy} onClick={createRecurringRule}>
                        Add Rule
                      </Button>
                    </div>

                    {/* Generate from rules */}
                    {recurringRules.length > 0 && (
                      <div className="border-t border-[var(--border)] pt-2 mt-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          disabled={recurringBusy}
                          onClick={generateFromRules}
                        >
                          Generate for This Week
                        </Button>
                        <p className="text-[9px] text-[var(--muted-foreground)] mt-1 text-center">
                          Creates entries from rules for the current week view
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ── Help ── */}
        <p className="text-xs text-[var(--muted-foreground)] text-center">
          Drag entries to move between engineers/times. Drag the right edge to resize. Drag unassigned jobs onto a lane to schedule.
        </p>

        {/* ── Popover ── */}
        {popover && (
          <EntryPopover
            entry={popover.entry}
            rect={popover.rect}
            onClose={() => setPopover(null)}
            onStatusChange={async (entryId, newStatus) => {
              setError(null);
              try {
                const res = await fetch(`/api/admin/schedule/${entryId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: newStatus }),
                });
                const json = await res.json();
                if (!res.ok) {
                  setError(json.error || "Status update failed");
                  return;
                }
                setEntries((prev) =>
                  prev.map((e) => e.id === entryId ? { ...e, status: newStatus } : e),
                );
                setPopover((p) => p ? { ...p, entry: { ...p.entry, status: newStatus } } : null);
              } catch {
                setError("Network error");
              }
            }}
          />
        )}

        {/* ── Engineer Config Modal ── */}
        {configEngineer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setConfigEngineer(null)}>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  Schedule Config – {toTitleCase(configEngineer.name)}
                </span>
                <button onClick={() => setConfigEngineer(null)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[var(--foreground)]">Work start</label>
                    <select
                      value={configForm.workStartHour}
                      onChange={(e) => setConfigForm((f) => ({ ...f, workStartHour: Number(e.target.value) }))}
                      className="w-full mt-1 px-2 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--foreground)]">Work end</label>
                    <select
                      value={configForm.workEndHour}
                      onChange={(e) => setConfigForm((f) => ({ ...f, workEndHour: Number(e.target.value) }))}
                      className="w-full mt-1 px-2 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                    >
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                        <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--foreground)]">Break (minutes)</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={configForm.breakMinutes}
                    onChange={(e) => setConfigForm((f) => ({ ...f, breakMinutes: Number(e.target.value) || 0 }))}
                    className="w-full mt-1 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--foreground)]">Max jobs / day</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={configForm.maxJobsPerDay ?? ""}
                    placeholder="No limit"
                    onChange={(e) => setConfigForm((f) => ({ ...f, maxJobsPerDay: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full mt-1 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--foreground)]">Travel buffer (minutes)</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={configForm.travelBufferMinutes}
                    onChange={(e) => setConfigForm((f) => ({ ...f, travelBufferMinutes: Number(e.target.value) || 0 }))}
                    className="w-full mt-1 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button className="flex-1" size="sm" disabled={configBusy} onClick={saveEngineerConfig}>
                  {configBusy ? "Saving..." : "Save"}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setConfigEngineer(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Copy Week Modal ── */}
        {copyWeekOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setCopyWeekOpen(false)}>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-[var(--foreground)]">Copy Week</span>
                <button onClick={() => setCopyWeekOpen(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-3">
                Copy all entries from the current week ({days[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })}) to a target week.
              </p>
              <label className="text-xs font-medium text-[var(--foreground)]">Target week start (Monday)</label>
              <input
                type="date"
                value={copyWeekTarget}
                onChange={(e) => setCopyWeekTarget(e.target.value)}
                className="w-full mt-1 mb-3 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
              />
              <Button className="w-full" size="sm" disabled={!copyWeekTarget || copyWeekBusy} onClick={handleCopyWeek}>
                {copyWeekBusy ? "Copying..." : "Copy Week"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* ────────────────────────────────────────────────────── */
/*               ENGINEER LANE COMPONENT                 */
/* ────────────────────────────────────────────────────── */

function EngineerLane({
  engineer,
  engIdx,
  entries,
  allDayEntries,
  day,
  busyIds,
  jobCount,
  onPatch,
  onScheduleJob,
  onShowPopover,
  onOpenConfig,
}: {
  engineer: Engineer;
  engIdx: number;
  entries: Entry[];
  allDayEntries: Entry[];
  day: Date;
  busyIds: Set<string>;
  jobCount: number;
  onPatch: (id: string, patch: { startAtISO?: string; endAtISO?: string; engineerId?: string }) => Promise<boolean>;
  onScheduleJob: (jobId: string, engineerId: string, start: Date) => void;
  onShowPopover: (entry: Entry, rect: DOMRect) => void;
  onOpenConfig: () => void;
}) {
  const laneRef = useRef<HTMLDivElement>(null);
  const [dropHighlight, setDropHighlight] = useState(false);
  const colour = engineerColour(engIdx);

  // Working hours shading
  const workStartPx = Math.max(0, (engineer.workStartHour - HOUR_START) * PX_PER_HOUR);
  const workEndPx = Math.min(LANE_WIDTH, (engineer.workEndHour - HOUR_START) * PX_PER_HOUR);
  const atCapacity = engineer.maxJobsPerDay !== null && jobCount >= engineer.maxJobsPerDay;

  // Break zone calculation: midpoint of working hours
  const breakMins = engineer.breakMinutes ?? 0;
  const workMidHour = (engineer.workStartHour + engineer.workEndHour) / 2;
  const breakStartHour = workMidHour - breakMins / 60 / 2;
  const breakEndHour = breakStartHour + breakMins / 60;
  const breakStartPx = Math.max(0, (breakStartHour - HOUR_START) * PX_PER_HOUR);
  const breakWidthPx = (breakMins / 60) * PX_PER_HOUR;

  // Capacity hours: available work hours minus break
  const availableHours = engineer.workEndHour - engineer.workStartHour - breakMins / 60;
  const bookedHours = allDayEntries.reduce((sum, e) => {
    const ms = new Date(e.endAtISO).getTime() - new Date(e.startAtISO).getTime();
    return sum + Math.max(0, ms / 3_600_000);
  }, 0);

  function handleDragOver(ev: React.DragEvent) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = ev.dataTransfer.types.includes("application/x-unassigned-job") ? "copy" : "move";
    setDropHighlight(true);
  }

  function handleDragLeave() {
    setDropHighlight(false);
  }

  function handleDrop(ev: React.DragEvent) {
    ev.preventDefault();
    setDropHighlight(false);

    const laneRect = laneRef.current?.getBoundingClientRect();
    if (!laneRect) return;

    const x = ev.clientX - laneRect.left;
    const dropDate = xToDate(x, day);

    // Case 1: unassigned job dropped
    const jobId = ev.dataTransfer.getData("application/x-unassigned-job");
    if (jobId) {
      onScheduleJob(jobId, engineer.id, dropDate);
      return;
    }

    // Case 2: existing entry moved
    const entryId = ev.dataTransfer.getData("application/x-entry-id");
    const sourceEngineerId = ev.dataTransfer.getData("application/x-entry-engineer");
    const sourceDurationMs = Number(ev.dataTransfer.getData("application/x-entry-duration"));
    if (!entryId) return;

    const newStart = dropDate;
    const newEnd = new Date(newStart.getTime() + (sourceDurationMs || DEFAULT_DURATION_MS));

    onPatch(entryId, {
      startAtISO: newStart.toISOString(),
      endAtISO: newEnd.toISOString(),
      ...(sourceEngineerId !== engineer.id ? { engineerId: engineer.id } : {}),
    });
  }

  return (
    <div className="flex border-b border-[var(--border)]">
      {/* Engineer label */}
      <div className="w-[160px] shrink-0 p-2 flex flex-col gap-0.5 border-r border-[var(--border)]">
        <div className="flex items-center gap-1.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
            style={{ background: colour.border }}
          >
            {toTitleCase(engineer.name)
              ?.split(" ")
              .map((n) => n[0])
              .join("") || "?"}
          </div>
          <span className="text-xs font-medium text-[var(--foreground)] truncate flex-1">
            {toTitleCase(engineer.name)}
          </span>
          <button
            onClick={onOpenConfig}
            title="Configure schedule"
            className="shrink-0 p-0.5 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Capacity indicator */}
        <div className="ml-9 space-y-0.5">
          {engineer.maxJobsPerDay !== null && (
            <div className="flex items-center gap-1">
              <span className={`text-[10px] ${atCapacity ? "text-[var(--error)] font-semibold" : "text-[var(--muted-foreground)]"}`}>
                {jobCount}/{engineer.maxJobsPerDay} jobs
              </span>
              {atCapacity && (
                <Badge variant="destructive" className="text-[8px] px-1 py-0">
                  Full
                </Badge>
              )}
            </div>
          )}
          <div className="text-[10px] text-[var(--muted-foreground)]">
            {bookedHours.toFixed(1)}h / {availableHours.toFixed(1)}h
          </div>
        </div>
      </div>

      {/* Timeline lane */}
      <div
        ref={laneRef}
        className={`relative transition-colors ${dropHighlight ? "bg-[var(--primary)]/5" : ""}`}
        style={{ width: LANE_WIDTH, minHeight: 56 }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Non-working hours shading (before work start) */}
        {workStartPx > 0 && (
          <div
            className="absolute top-0 bottom-0 bg-[var(--muted)]/60"
            style={{ left: 0, width: workStartPx }}
          >
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, currentColor 4px, currentColor 5px)",
              color: "var(--muted-foreground)",
            }} />
          </div>
        )}
        {/* Non-working hours shading (after work end) */}
        {workEndPx < LANE_WIDTH && (
          <div
            className="absolute top-0 bottom-0 bg-[var(--muted)]/60"
            style={{ left: workEndPx, width: LANE_WIDTH - workEndPx }}
          >
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, currentColor 4px, currentColor 5px)",
              color: "var(--muted-foreground)",
            }} />
          </div>
        )}

        {/* Break period shading */}
        {breakMins > 0 && (
          <div
            className="absolute top-0 bottom-0 bg-amber-200/30 border-l border-r border-amber-300/50"
            style={{ left: breakStartPx, width: breakWidthPx }}
            title={`Break: ${Math.floor(breakStartHour)}:${String(Math.round((breakStartHour % 1) * 60)).padStart(2, "0")}–${Math.floor(breakEndHour)}:${String(Math.round((breakEndHour % 1) * 60)).padStart(2, "0")}`}
          >
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 3px, currentColor 3px, currentColor 4px)",
              color: "var(--warning, #d97706)",
            }} />
          </div>
        )}

        {/* Hour grid lines */}
        {Array.from({ length: TOTAL_HOURS }, (_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l border-[var(--border)]/50"
            style={{ left: i * PX_PER_HOUR }}
          />
        ))}

        {/* Entries */}
        {entries.map((entry) => (
          <EntryBlock
            key={entry.id}
            entry={entry}
            colour={colour}
            busy={busyIds.has(entry.id)}
            day={day}
            onPatch={onPatch}
            onShowPopover={onShowPopover}
          />
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────── */
/*               ENTRY BLOCK COMPONENT                   */
/* ────────────────────────────────────────────────────── */

function EntryBlock({
  entry,
  colour,
  busy,
  day,
  onPatch,
  onShowPopover,
}: {
  entry: Entry;
  colour: { bg: string; border: string };
  busy: boolean;
  day: Date;
  onPatch: (id: string, patch: { startAtISO?: string; endAtISO?: string; engineerId?: string }) => Promise<boolean>;
  onShowPopover: (entry: Entry, rect: DOMRect) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef<{ startX: number; startWidth: number } | null>(null);

  const left = timeToX(entry.startAtISO);
  const width = durationPx(entry.startAtISO, entry.endAtISO);
  const statusInfo = STATUS_COLOURS[entry.status || "scheduled"];

  /* ── Drag to move ── */

  function handleDragStart(ev: React.DragEvent) {
    const duration = new Date(entry.endAtISO).getTime() - new Date(entry.startAtISO).getTime();
    ev.dataTransfer.setData("application/x-entry-id", entry.id);
    ev.dataTransfer.setData("application/x-entry-engineer", entry.engineerId);
    ev.dataTransfer.setData("application/x-entry-duration", String(duration));
    ev.dataTransfer.effectAllowed = "move";
  }

  /* ── Resize handle (pointer events, not drag) ── */

  function handleResizeDown(ev: React.MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    setResizing(true);
    resizeStart.current = { startX: ev.clientX, startWidth: width };

    const onMove = (me: MouseEvent) => {
      if (!resizeStart.current || !ref.current) return;
      const delta = me.clientX - resizeStart.current.startX;
      const newW = Math.max(20, resizeStart.current.startWidth + delta);
      ref.current.style.width = `${newW}px`;
    };

    const onUp = (me: MouseEvent) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setResizing(false);
      if (!resizeStart.current) return;
      const delta = me.clientX - resizeStart.current.startX;
      const newW = Math.max(20, resizeStart.current.startWidth + delta);
      const newHours = newW / PX_PER_HOUR;
      const newMins = Math.round((newHours * 60) / SNAP_MINUTES) * SNAP_MINUTES;
      const newEnd = new Date(new Date(entry.startAtISO).getTime() + newMins * 60_000);
      // Clamp to HOUR_END
      const maxEnd = new Date(day);
      maxEnd.setHours(HOUR_END, 0, 0, 0);
      if (newEnd > maxEnd) newEnd.setTime(maxEnd.getTime());

      if (newEnd.toISOString() !== entry.endAtISO) {
        onPatch(entry.id, { endAtISO: newEnd.toISOString() });
      } else if (ref.current) {
        ref.current.style.width = `${width}px`;
      }
      resizeStart.current = null;
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  return (
    <div
      ref={ref}
      draggable={!resizing}
      onDragStart={handleDragStart}
      onClick={(ev) => {
        ev.stopPropagation();
        if (ref.current) onShowPopover(entry, ref.current.getBoundingClientRect());
      }}
      className={`absolute top-1 rounded-md border px-1.5 py-0.5 text-[10px] cursor-grab select-none overflow-hidden transition-opacity ${busy ? "opacity-50" : ""} ${resizing ? "cursor-ew-resize" : ""}`}
      style={{
        left,
        width,
        height: "calc(100% - 8px)",
        background: colour.bg,
        borderColor: colour.border,
        zIndex: resizing ? 20 : 1,
      }}
      title={`${entry.jobTitle || "Job"} – ${fmtTime(entry.startAtISO)}–${fmtTime(entry.endAtISO)}`}
    >
      <div className="flex items-center gap-1">
        <span className="font-medium truncate text-[var(--foreground)]">
          {entry.jobTitle || "Job"}
        </span>
        {statusInfo && entry.status && entry.status !== "scheduled" && (
          <span className={`shrink-0 px-1 py-0 rounded text-[8px] font-medium ${statusInfo.bg} ${statusInfo.text}`}>
            {statusInfo.label}
          </span>
        )}
      </div>
      <div className="text-[var(--muted-foreground)] flex items-center gap-0.5">
        <Clock className="w-2.5 h-2.5" />
        {fmtTime(entry.startAtISO)}–{fmtTime(entry.endAtISO)}
      </div>

      {/* Resize handle (right edge) */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-[var(--primary)]/20 flex items-center justify-center"
        onMouseDown={handleResizeDown}
        onClick={(ev) => ev.stopPropagation()}
      >
        <GripVertical className="w-2.5 h-2.5 text-[var(--muted-foreground)]" />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────── */
/*                ENTRY POPOVER                          */
/* ────────────────────────────────────────────────────── */

function EntryPopover({
  entry,
  rect,
  onClose,
  onStatusChange,
}: {
  entry: Entry;
  rect: DOMRect;
  onClose: () => void;
  onStatusChange: (entryId: string, status: DispatchStatus) => void;
}) {
  const top = rect.bottom + 8;
  const left = Math.min(rect.left, window.innerWidth - 280);
  const statusInfo = STATUS_COLOURS[entry.status || "scheduled"];

  return (
    <div
      className="fixed z-50 w-64 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl animate-fade-in p-3"
      style={{ top, left }}
      onClick={(ev) => ev.stopPropagation()}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-semibold text-[var(--foreground)]">
          {entry.jobTitle || "Job"}
        </span>
        <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-1.5 text-xs text-[var(--muted-foreground)]">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {fmtTime(entry.startAtISO)} – {fmtTime(entry.endAtISO)}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--muted-foreground)]">Status:</span>
          <select
            value={entry.status || "scheduled"}
            onChange={(e) => onStatusChange(entry.id, e.target.value as DispatchStatus)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border-0 cursor-pointer ${statusInfo.bg} ${statusInfo.text}`}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_COLOURS[s].label}</option>
            ))}
          </select>
        </div>
        {entry.engineerName && (
          <div>Engineer: {toTitleCase(entry.engineerName)}</div>
        )}
        {entry.notes && <div className="mt-1">{entry.notes}</div>}
      </div>
      <div className="mt-2 pt-2 border-t border-[var(--border)]">
        <a
          href={`/admin/jobs/${entry.jobId}`}
          className="text-xs font-medium text-[var(--primary)] hover:underline"
        >
          View Job Details
        </a>
      </div>
    </div>
  );
}
