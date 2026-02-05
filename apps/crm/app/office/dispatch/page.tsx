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
} from "lucide-react";
import { toTitleCase } from "@/lib/cn";

/* ────────────────────── Types ────────────────────── */

type Engineer = { id: string; name: string; email: string };

type Entry = {
  id: string;
  engineerId: string;
  engineerName?: string;
  jobId: string;
  jobTitle?: string;
  startAtISO: string;
  endAtISO: string;
  notes?: string;
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

/* ────────────────────── Date helpers ────────────────────── */

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
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

const HOUR_START = 6;
const HOUR_END = 20;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const PX_PER_HOUR = 80;
const LANE_WIDTH = TOTAL_HOURS * PX_PER_HOUR;
const SNAP_MINUTES = 15;
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

/* ────────────────────── Colour pool ────────────────────── */

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
  return Math.max(hours * PX_PER_HOUR, 20);
}

/* ────────────────────────────────────────────────────── */
/*                  MAIN COMPONENT                       */
/* ────────────────────────────────────────────────────── */

export default function OfficeDispatchPage() {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [popover, setPopover] = useState<{ entry: Entry; rect: DOMRect } | null>(null);

  const [queueOpen, setQueueOpen] = useState(true);
  const [queueFilter, setQueueFilter] = useState("");

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

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

  async function patchEntry(
    entryId: string,
    patch: { startAtISO?: string; endAtISO?: string; engineerId?: string },
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
        if (json.error === "clash") {
          setError("Clash: this time slot overlaps an existing booking for this engineer.");
        } else {
          setError(json.error || "Update failed");
        }
        return false;
      }
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

  async function scheduleJob(jobId: string, engineerId: string, startDate: Date) {
    setError(null);
    const eng = engineers.find((e) => e.id === engineerId);
    if (!eng) return;
    const startAtISO = startDate.toISOString();
    const endAtISO = new Date(startDate.getTime() + DEFAULT_DURATION_MS).toISOString();
    try {
      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          engineerEmail: eng.email,
          startAtISO,
          endAtISO,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not schedule");
        return;
      }
      await fetchData();
    } catch {
      setError("Network error");
    }
  }

  function entriesForDay(engineerId: string, day: Date) {
    const dayKey = isoDate(day);
    return entries.filter(
      (e) => e.engineerId === engineerId && isoDate(new Date(e.startAtISO)) === dayKey,
    );
  }

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

  useEffect(() => {
    if (!popover) return;
    const handler = () => setPopover(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [popover]);

  return (
    <AppShell role="office" title="Dispatch Board" subtitle="Drag to schedule, resize to adjust duration">
      <div className="space-y-4">
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

        {loading ? (
          <div className="p-8 text-center text-[var(--muted-foreground)]">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading dispatch board...
          </div>
        ) : (
          <div className="flex gap-4">
            <Card className="flex-1 min-w-0">
              <CardContent className="p-0 overflow-x-auto">
                <div style={{ minWidth: LANE_WIDTH + 160 }}>
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

                  {engineers.map((eng, engIdx) => (
                    <EngineerLane
                      key={eng.id}
                      engineer={eng}
                      engIdx={engIdx}
                      entries={entriesForDay(eng.id, selectedDay)}
                      day={selectedDay}
                      busyIds={busyIds}
                      onPatch={patchEntry}
                      onScheduleJob={scheduleJob}
                      onShowPopover={(entry, rect) => setPopover({ entry, rect })}
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

            {queueOpen && (
              <div className="w-72 shrink-0">
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
                    <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
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
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-[var(--muted-foreground)] text-center">
          Drag entries to move between engineers/times. Drag the right edge to resize. Drag unassigned jobs onto a lane to schedule.
        </p>

        {popover && <EntryPopover entry={popover.entry} rect={popover.rect} onClose={() => setPopover(null)} />}
      </div>
    </AppShell>
  );
}

/* ────────────────────────────────────────────────────── */

function EngineerLane({
  engineer,
  engIdx,
  entries,
  day,
  busyIds,
  onPatch,
  onScheduleJob,
  onShowPopover,
}: {
  engineer: Engineer;
  engIdx: number;
  entries: Entry[];
  day: Date;
  busyIds: Set<string>;
  onPatch: (id: string, patch: { startAtISO?: string; endAtISO?: string; engineerId?: string }) => Promise<boolean>;
  onScheduleJob: (jobId: string, engineerId: string, start: Date) => void;
  onShowPopover: (entry: Entry, rect: DOMRect) => void;
}) {
  const laneRef = useRef<HTMLDivElement>(null);
  const [dropHighlight, setDropHighlight] = useState(false);
  const colour = engineerColour(engIdx);

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

    const jobId = ev.dataTransfer.getData("application/x-unassigned-job");
    if (jobId) {
      onScheduleJob(jobId, engineer.id, dropDate);
      return;
    }

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
      <div className="w-[160px] shrink-0 p-3 flex items-center gap-2 border-r border-[var(--border)]">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
          style={{ background: colour.border }}
        >
          {toTitleCase(engineer.name)
            ?.split(" ")
            .map((n) => n[0])
            .join("") || "?"}
        </div>
        <span className="text-xs font-medium text-[var(--foreground)] truncate">
          {toTitleCase(engineer.name)}
        </span>
      </div>

      <div
        ref={laneRef}
        className={`relative transition-colors ${dropHighlight ? "bg-[var(--primary)]/5" : ""}`}
        style={{ width: LANE_WIDTH, minHeight: 56 }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {Array.from({ length: TOTAL_HOURS }, (_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l border-[var(--border)]/50"
            style={{ left: i * PX_PER_HOUR }}
          />
        ))}

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

  function handleDragStart(ev: React.DragEvent) {
    const duration = new Date(entry.endAtISO).getTime() - new Date(entry.startAtISO).getTime();
    ev.dataTransfer.setData("application/x-entry-id", entry.id);
    ev.dataTransfer.setData("application/x-entry-engineer", entry.engineerId);
    ev.dataTransfer.setData("application/x-entry-duration", String(duration));
    ev.dataTransfer.effectAllowed = "move";
  }

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
      <div className="font-medium truncate text-[var(--foreground)]">
        {entry.jobTitle || "Job"}
      </div>
      <div className="text-[var(--muted-foreground)] flex items-center gap-0.5">
        <Clock className="w-2.5 h-2.5" />
        {fmtTime(entry.startAtISO)}–{fmtTime(entry.endAtISO)}
      </div>

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

function EntryPopover({ entry, rect, onClose }: { entry: Entry; rect: DOMRect; onClose: () => void }) {
  const top = rect.bottom + 8;
  const left = Math.min(rect.left, window.innerWidth - 280);

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
      <div className="space-y-1 text-xs text-[var(--muted-foreground)]">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {fmtTime(entry.startAtISO)} – {fmtTime(entry.endAtISO)}
        </div>
        {entry.engineerName && (
          <div>Engineer: {toTitleCase(entry.engineerName)}</div>
        )}
        {entry.notes && <div className="mt-1">{entry.notes}</div>}
      </div>
    </div>
  );
}
