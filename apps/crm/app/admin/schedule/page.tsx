"use client";

import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FeatureGate } from "@/components/billing/FeatureGate";
import { useBillingStatus } from "@/components/billing/useBillingStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import { isScheduleEnabled } from "@/lib/billing/plans";

type Job = { id: string; title?: string; clientName: string; status: string };
type Engineer = { id: string; email: string; name?: string };
type ScheduleEntry = {
  id: string;
  jobId: string;
  engineerEmail?: string;
  engineerId: string;
  startAtISO: string;
  endAtISO: string;
  notes?: string;
};

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

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminSchedulePage() {
  const { toast } = useToast();

  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [jobs, setJobs] = useState<Job[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [clashes, setClashes] = useState<Array<{ engineerEmail?: string; aId: string; bId: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const { status: billingStatus } = useBillingStatus();
  const scheduleEnabled = billingStatus ? isScheduleEnabled(billingStatus.plan) : true;

  const range = useMemo(() => {
    const from = weekStart;
    const to = addDays(weekStart, 7);
    return { from, to };
  }, [weekStart]);

  async function refresh() {
    setLoading(true);
    try {
      const [j, e, s] = await Promise.all([
        fetch("/api/admin/jobs").then((r) => r.json()).catch(() => null),
        fetch("/api/admin/engineers").then((r) => r.json()).catch(() => null),
        fetch(
          `/api/admin/schedule?from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}`
        )
          .then((r) => r.json())
          .catch(() => null),
      ]);

      setJobs(Array.isArray(j?.jobs) ? j.jobs : []);
      setEngineers(Array.isArray(e?.engineers) ? e.engineers : []);
      setEntries(Array.isArray(s?.entries) ? s.entries : []);
      setClashes(Array.isArray(s?.clashes) ? s.clashes : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from.toISOString()]);

  const byEngineer = useMemo(() => {
    const m = new Map<string, ScheduleEntry[]>();
    for (const en of entries) {
      const key = (en.engineerEmail || en.engineerId).toLowerCase();
      const list = m.get(key) ?? [];
      list.push(en);
      m.set(key, list);
    }
    for (const [k, list] of m) {
      m.set(k, [...list].sort((a, b) => (a.startAtISO > b.startAtISO ? 1 : -1)));
    }
    return m;
  }, [entries]);

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

    setBusy(true);
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
      setBusy(false);
    }
  }

  return (
    <AppShell role="admin" title="Schedule" subtitle="See upcoming work and engineer availability.">
      <div className="space-y-6">
        <FeatureGate
          enabled={scheduleEnabled}
          title="Scheduling is on Team and Pro plans"
          description="Upgrade to unlock scheduling, timesheets, and team capacity planning."
          ctaLabel="Upgrade to Team"
        >
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Schedule (Week view)</CardTitle>
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
            </CardHeader>

            <CardContent>
              <div className="text-sm text-[var(--muted-foreground)]">
                {range.from.toLocaleDateString("en-GB")} → {addDays(range.to, -1).toLocaleDateString("en-GB")}
              </div>

              {clashes.length > 0 && (
                <div className="mt-3 rounded-xl border border-[var(--warning)] bg-[var(--warning)]/10 p-3 text-sm">
                  <div className="font-semibold text-[var(--warning)]">Overbooked warnings</div>
                  <div className="mt-1 text-[var(--foreground)]">{clashes.length} overlap(s) detected for engineers this week.</div>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-4">
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
                          {j.title ? `${j.title} — ` : ""}
                          {j.clientName} ({j.status})
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
                          {en.name ? `${en.name} — ` : ""}
                          {en.email}
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

                  <Button type="submit" disabled={busy}>
                    Add
                  </Button>
                </form>
              </div>

              {loading ? (
                <div className="mt-4 text-sm text-[var(--muted-foreground)]">Loading…</div>
              ) : engineers.length === 0 ? (
                <div className="empty-state mt-4">
                  <div className="empty-state-title">No engineers found</div>
                  <p className="empty-state-description">
                    Add engineers in Settings to enable scheduling.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {engineers.map((en) => {
                    const list = byEngineer.get(en.email.toLowerCase()) ?? [];
                    return (
                      <div key={en.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-semibold text-[var(--foreground)]">{en.name || en.email}</div>
                          <Badge variant="secondary">{list.length} entries</Badge>
                        </div>

                        {list.length === 0 ? (
                          <div className="mt-2 text-sm text-[var(--muted-foreground)]">No bookings this week.</div>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {list.map((s) => {
                              const clash = clashes.some((c) => c.aId === s.id || c.bId === s.id);
                              return (
                                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-sm">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Link href={`/admin/jobs/${s.jobId}`} className="font-semibold text-[var(--primary)] hover:underline">
                                        Job {s.jobId}
                                      </Link>
                                      {clash && <Badge variant="warning">OVERBOOKED</Badge>}
                                    </div>
                                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                                      {new Date(s.startAtISO).toLocaleString("en-GB")} → {new Date(s.endAtISO).toLocaleString("en-GB")}
                                      {s.notes ? ` • ${s.notes}` : ""}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </FeatureGate>
      </div>
    </AppShell>
  );
}
