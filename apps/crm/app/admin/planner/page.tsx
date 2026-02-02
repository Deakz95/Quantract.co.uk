'use client';

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Clock, AlertCircle } from "lucide-react";

type Engineer = { id: string; name: string };
type Entry = { id: string; engineerId: string; engineer?: string; jobId: string; job?: string; start: string; end: string };

function startOfDay(d: Date) {
  const x = new Date(d);
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

export default function PlannerPage() {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const from = useMemo(() => startOfDay(new Date()), []);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(from, i)), [from]);

  async function refresh() {
    setError(null);
    const fromStr = isoDate(days[0]);
    const toStr = isoDate(days[6]);
    const [engRes, planRes] = await Promise.all([
      fetch("/api/admin/engineers"),
      fetch(`/api/admin/planner?from=${fromStr}&to=${toStr}`)
    ]);
    const engJson = await engRes.json();
    const planJson = await planRes.json();
    setEngineers(engJson.engineers || engJson.data || []);
    setEntries((planJson.data || []).map((e: any) => ({
      ...e,
      start: new Date(e.start).toISOString(),
      end: new Date(e.end).toISOString()
    })));
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  function entriesForCell(engineerId: string, day: Date) {
    const dayKey = isoDate(day);
    return entries.filter(e => e.engineerId === engineerId && isoDate(new Date(e.start)) === dayKey);
  }

  async function moveEntry(entryId: string, engineerId: string, day: Date) {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    setBusy(entryId);
    setError(null);
    try {
      const start = new Date(entry.start);
      const end = new Date(entry.end);
      const duration = end.getTime() - start.getTime();

      const targetStart = new Date(day);
      targetStart.setHours(8, 0, 0, 0);
      const targetEnd = new Date(targetStart.getTime() + duration);

      const res = await fetch("/api/admin/planner/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleEntryId: entryId,
          engineerId,
          start: targetStart.toISOString(),
          end: targetEnd.toISOString()
        })
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Move failed");
        return;
      }

      await refresh();
    } finally {
      setBusy(null);
    }
  }

  function onDragStart(ev: React.DragEvent, entryId: string) {
    ev.dataTransfer.setData("text/plain", entryId);
    ev.dataTransfer.effectAllowed = "move";
  }

  function onDrop(ev: React.DragEvent, engineerId: string, day: Date) {
    ev.preventDefault();
    const entryId = ev.dataTransfer.getData("text/plain");
    if (!entryId) return;
    moveEntry(entryId, engineerId, day);
  }

  return (
    <AppShell role="admin" title="Planner" subtitle="Drag and drop to schedule jobs">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--primary)]" />
            <span className="text-sm text-[var(--muted-foreground)]">
              {days[0].toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={refresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/20 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[var(--error)] flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--error)]">Schedule Error</p>
              <p className="text-xs text-[var(--error)]/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Planner Grid */}
        {loading ? (
          <div className="p-8 text-center text-[var(--muted-foreground)]">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading planner...
          </div>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-auto">
              <div className="min-w-[920px]">
                {/* Header row */}
                <div className="grid border-b border-[var(--border)]" style={{ gridTemplateColumns: "200px repeat(7, 1fr)" }}>
                  <div className="p-4 font-semibold text-sm text-[var(--foreground)] bg-[var(--muted)]">Engineer</div>
                  {days.map(d => (
                    <div key={isoDate(d)} className="p-4 font-semibold text-sm text-[var(--foreground)] bg-[var(--muted)] text-center border-l border-[var(--border)]">
                      <div>{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{d.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</div>
                    </div>
                  ))}
                </div>

                {/* Engineer rows */}
                {engineers.map(eng => (
                  <div key={eng.id} className="grid border-b border-[var(--border)]" style={{ gridTemplateColumns: "200px repeat(7, 1fr)" }}>
                    <div className="p-4 text-sm font-medium text-[var(--foreground)] flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white text-xs font-semibold">
                        {eng.name?.split(' ').map(n => n[0]).join('') || '?'}
                      </div>
                      {eng.name}
                    </div>

                    {days.map(day => (
                      <div
                        key={isoDate(day)}
                        className="p-2 border-l border-[var(--border)] min-h-[100px] hover:bg-[var(--muted)]/50 transition-colors"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onDrop(e, eng.id, day)}
                      >
                        <div className="space-y-2">
                          {entriesForCell(eng.id, day).map(e => (
                            <div
                              key={e.id}
                              draggable
                              onDragStart={(ev) => onDragStart(ev, e.id)}
                              className={`rounded-lg border border-[var(--border)] px-3 py-2 text-xs bg-[var(--card)] cursor-move hover:border-[var(--primary)] hover:shadow-sm transition-all ${busy === e.id ? "opacity-50" : ""}`}
                              title="Drag to reschedule"
                            >
                              <div className="flex items-center gap-1 mb-1">
                                <span className="font-medium text-[var(--foreground)] truncate">{e.job || "Job"}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                                <Clock className="w-3 h-3" />
                                {new Date(e.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–
                                {new Date(e.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {engineers.length === 0 && (
                  <div className="p-8 text-center text-[var(--muted-foreground)]">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No engineers found. Add engineers to start scheduling.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Text */}
        <p className="text-xs text-[var(--muted-foreground)] text-center">
          Drag bookings between engineers and days. Bookings snap to 08:00 on the target day.
        </p>
      </div>
    </AppShell>
  );
}
