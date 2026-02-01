"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Select, SelectContent, SelectItem } from "@/components/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { useToast } from "@/components/ui/useToast";
import { Badge } from "@/components/ui/badge";

type Job = { id: string; title?: string; siteAddress?: string; status: string };
type TimeEntry = {
  id: string;
  jobId: string;
  startedAtISO: string;
  endedAtISO?: string;
  breakMinutes: number;
  notes?: string;
  status?: string;
};
type Timesheet = { id: string; weekStartISO: string; status: string; submittedAtISO?: string; approvedAtISO?: string };

function mondayISOFor(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function TimesheetsClient() {
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(() => mondayISOFor(new Date()));
  const [jobs, setJobs] = useState<Job[]>([]);
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [jobId, setJobId] = useState<string>("");
  const [startedAtISO, setStartedAtISO] = useState<string>("");
  const [endedAtISO, setEndedAtISO] = useState<string>("");
  const [breakMinutes, setBreakMinutes] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const weekStartISO = useMemo(() => new Date(weekStart + "T00:00:00.000Z").toISOString(), [weekStart]);
  const locked = timesheet?.status === "approved";

  function renderStatusBadge(status?: string) {
    const label = status || "draft";
    const styles: Record<string, string> = {
      draft: "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]",
      submitted: "border-blue-200 bg-blue-50 text-blue-700",
      approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
      rejected: "border-rose-200 bg-rose-50 text-rose-700",
    };
    return <Badge className={styles[label] || styles.draft}>{label}</Badge>;
  }

  async function loadAll() {
    setLoading(true);
    try {
      const j = await fetch("/api/engineer/jobs").then((r) => r.json());
      setJobs(j.jobs || j.items || []);
      const t = await fetch(`/api/engineer/timesheets?weekStart=${encodeURIComponent(weekStartISO)}`).then((r) => r.json());
      setTimesheet(t.timesheet || null);
      setEntries(t.entries || []);
    } catch (e: any) {
      toast({ title: "Failed to load", description: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  async function addEntry() {
    if (!jobId || !startedAtISO) {
      toast({ title: "Missing fields", description: "Select a job and startedAt." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/engineer/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          startedAtISO: new Date(startedAtISO).toISOString(),
          endedAtISO: endedAtISO ? new Date(endedAtISO).toISOString() : undefined,
          breakMinutes: Number(breakMinutes || 0),
          notes: notes || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to create time entry");
      toast({ title: "Time entry added" });
      setStartedAtISO("");
      setEndedAtISO("");
      setBreakMinutes("0");
      setNotes("");
      await loadAll();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch("/api/engineer/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: weekStartISO }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to submit timesheet");
      toast({ title: "Timesheet submitted" });
      await loadAll();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs font-semibold text-[var(--muted-foreground)]">Week starting (Mon)</div>
          <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} disabled={loading} />
        </div>
        <div className="text-sm text-[var(--muted-foreground)]">Status: {renderStatusBadge(timesheet?.status)}</div>
        {timesheet?.submittedAtISO ? (
          <div className="text-xs text-[var(--muted-foreground)]">Submitted {new Date(timesheet.submittedAtISO).toLocaleString()}</div>
        ) : null}
        {timesheet?.approvedAtISO ? (
          <div className="text-xs text-[var(--muted-foreground)]">Approved {new Date(timesheet.approvedAtISO).toLocaleString()}</div>
        ) : null}
        <Button type="button" onClick={submit} disabled={loading || locked}>
          Submit week
        </Button>
      </div>

      {locked ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          This timesheet is approved and locked. Additions and edits are disabled.
        </div>
      ) : null}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-sm">
        <div className="text-sm font-bold text-[var(--foreground)]">Add time entry</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Job</div>
            <Select value={jobId} onValueChange={setJobId} disabled={loading || locked}>
              <SelectContent>
                <SelectItem value="">Select job…</SelectItem>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.title || "Job"} • {j.siteAddress || j.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Break (minutes)</div>
            <Input value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} disabled={loading || locked} />
          </div>

          <div>
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Start</div>
            <Input type="datetime-local" value={startedAtISO} onChange={(e) => setStartedAtISO(e.target.value)} disabled={loading || locked} />
          </div>

          <div>
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">End</div>
            <Input type="datetime-local" value={endedAtISO} onChange={(e) => setEndedAtISO(e.target.value)} disabled={loading || locked} />
          </div>

          <div className="sm:col-span-2">
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Notes</div>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" disabled={loading || locked} />
          </div>
        </div>
        <div className="mt-3">
          <Button type="button" onClick={addEntry} disabled={loading || locked}>
            Add entry
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-sm">
        <div className="text-sm font-bold text-[var(--foreground)]">Entries</div>
        <div className="mt-3">
          {entries.length === 0 ? <div className="text-sm text-[var(--muted-foreground)]">No entries logged for this week yet.</div> : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Break</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{jobs.find((j) => j.id === e.jobId)?.title || "Untitled job"}</TableCell>
                  <TableCell>{e.startedAtISO && !isNaN(new Date(e.startedAtISO).getTime()) ? new Date(e.startedAtISO).toLocaleString() : "—"}</TableCell>
                  <TableCell>{e.endedAtISO && !isNaN(new Date(e.endedAtISO).getTime()) ? new Date(e.endedAtISO).toLocaleString() : "—"}</TableCell>
                  <TableCell>{e.breakMinutes}</TableCell>
                  <TableCell>{renderStatusBadge(e.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
