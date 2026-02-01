"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import EngineerVariationForm from "@/components/engineer/EngineerVariationForm";
import EngineerSnagCard from "@/components/engineer/EngineerSnagCard";

// ── Types (mirrors server-side shapes) ──────────────────────────

type QuoteItem = {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
};

type JobData = {
  id: string;
  title?: string;
  status: string;
  clientName?: string;
  clientEmail?: string;
  siteName?: string;
  siteAddress?: string;
  scheduledAtISO?: string;
  notes?: string;
  quoteId?: string;
};

type QuoteData = {
  token?: string;
  notes?: string;
  items: QuoteItem[];
} | null;

type AgreementData = {
  token?: string;
  status: string;
} | null;

type StageData = {
  id: string;
  name: string;
  status: string;
};

type VariationData = {
  id: string;
  title: string;
  stageName?: string;
  status: string;
  total: number;
};

type CertData = {
  id: string;
  type: string;
  status: string;
  certificateNumber?: string;
  completedAtISO?: string;
};

type ActiveTimer = {
  id: string;
  jobId: string;
  startedAtISO: string;
} | null;

// ── Helpers ─────────────────────────────────────────────────────

function pounds(value: number) {
  return `\u00A3${Number(value || 0).toFixed(2)}`;
}

function formatElapsed(startISO: string) {
  const ms = Date.now() - new Date(startISO).getTime();
  if (ms < 0) return "0m";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function googleMapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// ── Component ───────────────────────────────────────────────────

export default function EngineerJobDetail({
  job,
  quote,
  agreement,
  stages,
  variations,
  certs,
}: {
  job: JobData;
  quote: QuoteData;
  agreement: AgreementData;
  stages: StageData[];
  variations: VariationData[];
  certs: CertData[];
}) {
  const { toast } = useToast();
  const [active, setActive] = useState<ActiveTimer>(null);
  const [elapsed, setElapsed] = useState("");
  const [busy, setBusy] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [jobStatus, setJobStatus] = useState(job.status);

  // ── Timer polling ───────────────────────────────────────────
  const fetchTimer = useCallback(async () => {
    try {
      const res = await fetch("/api/engineer/timer/active", { cache: "no-store" });
      const data = await res.json();
      setActive(data?.active || null);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchTimer();
    const id = setInterval(fetchTimer, 15000);
    return () => clearInterval(id);
  }, [fetchTimer]);

  // ── Elapsed ticker ──────────────────────────────────────────
  useEffect(() => {
    if (!active?.startedAtISO) { setElapsed(""); return; }
    setElapsed(formatElapsed(active.startedAtISO));
    const id = setInterval(() => setElapsed(formatElapsed(active.startedAtISO)), 1000);
    return () => clearInterval(id);
  }, [active]);

  // ── Actions ─────────────────────────────────────────────────
  async function startTimer() {
    setBusy(true);
    try {
      const res = await fetch("/api/engineer/timer/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not start timer");
      setActive(data.active || null);
      toast({ title: "Timer started", variant: "success" });
    } catch (e: any) {
      toast({ title: "Timer error", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function stopTimer() {
    setBusy(true);
    try {
      const res = await fetch("/api/engineer/timer/stop", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not stop timer");
      setActive(null);
      toast({ title: "Timer stopped", variant: "success" });
    } catch (e: any) {
      toast({ title: "Timer error", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function markComplete() {
    if (!confirm("Mark this job as complete?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/engineer/jobs/${job.id}/complete`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not complete job");
      setJobStatus("completed");
      toast({ title: "Job marked complete", variant: "success" });
    } catch (e: any) {
      toast({ title: "Could not complete", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  }

  const isTimerOnThisJob = active?.jobId === job.id;
  const hasActiveTimer = Boolean(active);

  return (
    <div className="space-y-5 pb-24">
      {/* ── Job header ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{job.title || `Job #${job.id.slice(0, 8)}`}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge>{jobStatus.replace("_", " ")}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-[var(--muted-foreground)] space-y-1">
            {(job.siteName || job.siteAddress) && (
              <div><span className="font-semibold text-[var(--foreground)]">Site:</span> {job.siteName ? `${job.siteName} \u2022 ` : ""}{job.siteAddress}</div>
            )}
            {job.clientName && (
              <div><span className="font-semibold text-[var(--foreground)]">Client:</span> {job.clientName}</div>
            )}
            {job.scheduledAtISO && (
              <div><span className="font-semibold text-[var(--foreground)]">Scheduled:</span> {new Date(job.scheduledAtISO).toLocaleString("en-GB")}</div>
            )}
            {job.notes && (
              <div><span className="font-semibold text-[var(--foreground)]">Notes:</span> {job.notes}</div>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            {job.siteAddress && (
              <>
                <a
                  href={googleMapsUrl(job.siteAddress)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 text-[13px] font-medium rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                >
                  Navigate
                </a>
                <button
                  type="button"
                  onClick={() => copyText(job.siteAddress!, "Address")}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 text-[13px] font-medium rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                >
                  Copy address
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Active timer banner ────────────────────────────── */}
      {isTimerOnThisJob && active && (
        <div className="rounded-xl border-2 border-green-500/30 bg-green-500/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
              </span>
              <span className="text-sm font-semibold text-[var(--foreground)]">Timer running</span>
              <span className="text-lg font-bold tabular-nums text-[var(--foreground)]">{elapsed}</span>
            </div>
            <Button type="button" onClick={stopTimer} disabled={busy}>
              Stop timer
            </Button>
          </div>
        </div>
      )}

      {/* ── Scope (collapsible) ────────────────────────────── */}
      <Card>
        <CardHeader>
          <button
            type="button"
            onClick={() => setScopeOpen(!scopeOpen)}
            className="flex w-full items-center justify-between min-h-[44px] text-left"
          >
            <CardTitle>Scope</CardTitle>
            <span className="text-xs text-[var(--muted-foreground)]">{scopeOpen ? "Hide" : "Show"}</span>
          </button>
        </CardHeader>
        {scopeOpen && (
          <CardContent>
            {quote ? (
              <div className="space-y-4">
                {quote.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-[var(--muted-foreground)]">
                          <th className="py-2 pr-3">Description</th>
                          <th className="py-2 pr-3">Qty</th>
                          <th className="py-2 pr-3">Unit</th>
                          <th className="py-2 pr-0 text-right">Line</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quote.items.map((item) => (
                          <tr key={item.id} className="border-t border-[var(--border)]">
                            <td className="py-3 pr-3">{item.description}</td>
                            <td className="py-3 pr-3">{item.qty}</td>
                            <td className="py-3 pr-3">{pounds(item.unitPrice)}</td>
                            <td className="py-3 pr-0 text-right">{pounds(item.qty * item.unitPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-[var(--muted-foreground)]">No scope items captured yet.</div>
                )}
                {quote.notes && (
                  <div>
                    <div className="text-xs font-semibold text-[var(--muted-foreground)]">Notes</div>
                    <div className="mt-1 whitespace-pre-wrap rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)]">
                      {quote.notes}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-[var(--muted-foreground)]">Scope details are not available yet.</div>
            )}
          </CardContent>
        )}
      </Card>

      {/* ── Documents ──────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
              <div>
                <div className="font-semibold text-[var(--foreground)]">Quote PDF</div>
                <div className="text-xs text-[var(--muted-foreground)]">{quote ? "Ready" : "Not available"}</div>
              </div>
              {quote?.token && (
                <a className="text-sm font-semibold text-[var(--foreground)] hover:underline min-h-[44px] inline-flex items-center" href={`/api/client/quotes/${quote.token}/pdf`} target="_blank" rel="noreferrer">
                  Open
                </a>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
              <div>
                <div className="font-semibold text-[var(--foreground)]">Agreement</div>
                <div className="text-xs text-[var(--muted-foreground)]">{agreement ? `Status: ${agreement.status}` : "Not created"}</div>
              </div>
              {agreement?.token && (
                <a className="text-sm font-semibold text-[var(--foreground)] hover:underline min-h-[44px] inline-flex items-center" href={`/api/client/agreements/${agreement.token}/pdf`} target="_blank" rel="noreferrer">
                  Open
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stages ─────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle>Stages</CardTitle></CardHeader>
        <CardContent>
          {stages.length === 0 ? (
            <div className="text-sm text-[var(--muted-foreground)]">No stages set up yet.</div>
          ) : (
            <div className="space-y-2">
              {stages.map((stage) => (
                <div key={stage.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm">
                  <div className="font-semibold text-[var(--foreground)]">{stage.name}</div>
                  <Badge>{stage.status.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Variations ─────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle>Variations</CardTitle></CardHeader>
        <CardContent>
          {variations.length === 0 ? (
            <div className="text-sm text-[var(--muted-foreground)]">No variations raised yet.</div>
          ) : (
            <div className="space-y-2">
              {variations.map((v) => (
                <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--foreground)]">{v.title}</div>
                    <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      {v.stageName ? `${v.stageName} \u2022 ` : ""}{v.status} \u2022 {pounds(v.total)}
                    </div>
                  </div>
                  <Badge>{v.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EngineerVariationForm jobId={job.id} stages={stages} />

      <EngineerSnagCard jobId={job.id} />

      {/* ── Certificates ───────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle>Certificates</CardTitle></CardHeader>
        <CardContent>
          {certs.length === 0 ? (
            <div className="text-sm text-[var(--muted-foreground)]">No certificates assigned yet.</div>
          ) : (
            <div className="space-y-2">
              {certs.map((cert) => (
                <div key={cert.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-[var(--foreground)]">{cert.type} {cert.certificateNumber ? `\u2022 ${cert.certificateNumber}` : `\u2022 #${cert.id.slice(0, 8)}`}</div>
                      <Badge>{cert.status}</Badge>
                    </div>
                    {cert.completedAtISO && (
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">Completed {new Date(cert.completedAtISO).toLocaleString("en-GB")}</div>
                    )}
                  </div>
                  <Link className="text-sm font-semibold text-[var(--foreground)] hover:underline min-h-[44px] inline-flex items-center" href={`/engineer/certificates/${cert.id}`}>
                    Open
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Sticky bottom action bar ───────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--background)] px-4 pb-[env(safe-area-inset-bottom,8px)] pt-3">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-3">
          {isTimerOnThisJob ? (
            <Button type="button" onClick={stopTimer} disabled={busy} className="min-h-[44px] min-w-[44px] flex-1 max-w-[200px]">
              Stop timer \u2022 {elapsed}
            </Button>
          ) : (
            <Button type="button" onClick={startTimer} disabled={busy || hasActiveTimer} className="min-h-[44px] min-w-[44px] flex-1 max-w-[200px]">
              {hasActiveTimer ? "Timer on another job" : "Start timer"}
            </Button>
          )}
          {jobStatus !== "completed" && (
            <Button variant="secondary" type="button" onClick={markComplete} disabled={busy} className="min-h-[44px] min-w-[44px]">
              Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
