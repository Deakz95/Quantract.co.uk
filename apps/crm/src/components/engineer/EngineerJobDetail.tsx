"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import EngineerVariationForm from "@/components/engineer/EngineerVariationForm";
import EngineerSnagCard from "@/components/engineer/EngineerSnagCard";
import BottomDrawer from "@/components/ui/BottomDrawer";

// ── Types (mirrors server-side shapes) ──────────────────────────

type QuoteItem = {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
};

type StockBudgetLine = {
  id: string;
  description: string;
  stockItemId: string;
  stockQty: number;
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
  stockConsumedAt?: string;
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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

// ── CollapsibleSection ──────────────────────────────────────────

function CollapsibleSection({ title, defaultOpen, children, count }: {
  title: string; defaultOpen: boolean; children: React.ReactNode; count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <CardHeader>
        <button type="button" onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between min-h-[44px] text-left">
          <CardTitle>{title}{count != null ? ` (${count})` : ""}</CardTitle>
          <span className="text-xs text-[var(--muted-foreground)]">{open ? "Hide" : "Show"}</span>
        </button>
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}

// ── Component ───────────────────────────────────────────────────

export default function EngineerJobDetail({
  job,
  quote,
  agreement,
  stages,
  variations,
  certs,
  budgetLines,
}: {
  job: JobData;
  quote: QuoteData;
  agreement: AgreementData;
  stages: StageData[];
  variations: VariationData[];
  certs: CertData[];
  budgetLines?: StockBudgetLine[];
}) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [active, setActive] = useState<ActiveTimer>(null);
  const [elapsed, setElapsed] = useState("");
  const [busy, setBusy] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [jobStatus, setJobStatus] = useState(job.status);
  const [stockConsumed, setStockConsumed] = useState(!!job.stockConsumedAt);
  const [consumingStock, setConsumingStock] = useState(false);
  const [insufficient, setInsufficient] = useState<Array<{ description: string; stockQty: number; available: number }>>([]);
  const [drawerMode, setDrawerMode] = useState<"cost" | "time" | null>(null);

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
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/engineer/timer/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not start timer");
      setActive(data.active || data.started || null);
      if (data.started) {
        toast({ title: "Timer started", variant: "success" });
      } else if (data.active) {
        toast({ title: "Timer already running", variant: "default" });
      }
    } catch (e: any) {
      toast({ title: "Timer error", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function stopTimer() {
    if (busy) return;
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

  async function consumeStock() {
    if (!confirm("Consume stock for this job? Quantities will be deducted from your truck stock.")) return;
    setConsumingStock(true);
    setInsufficient([]);
    try {
      const res = await fetch(`/api/engineer/jobs/${job.id}/consume-stock`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not consume stock");
      if (data.alreadyConsumed) {
        setStockConsumed(true);
        toast({ title: "Already consumed", description: "Stock was already consumed for this job." });
      } else {
        const consumedCount = data.consumed?.length ?? 0;
        const insufficientList = data.insufficient ?? [];
        if (insufficientList.length > 0) {
          setInsufficient(insufficientList);
          toast({ title: "Partial stock consume", description: `${consumedCount} consumed, ${insufficientList.length} insufficient.`, variant: "destructive" });
        } else {
          setStockConsumed(true);
          toast({ title: "Stock consumed", description: `${consumedCount} item(s) consumed.`, variant: "success" });
        }
      }
    } catch (e: any) {
      toast({ title: "Stock error", description: e?.message || "Could not consume stock.", variant: "destructive" });
    } finally {
      setConsumingStock(false);
    }
  }

  const hasStockLines = (budgetLines ?? []).length > 0;

  const isTimerOnThisJob = active?.jobId === job.id;
  const hasActiveTimer = Boolean(active);

  // ── Drawer form handlers ────────────────────────────────────

  async function handleLogTime(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const date = fd.get("date") as string;
    const start = fd.get("startTime") as string;
    const duration = parseFloat(fd.get("duration") as string) || 1;
    const breakMins = parseInt(fd.get("breakMinutes") as string) || 0;
    const notes = (fd.get("notes") as string)?.trim() || undefined;

    const startedAt = new Date(`${date}T${start}`);
    const endedAt = new Date(startedAt.getTime() + duration * 3600000);

    try {
      const res = await fetch("/api/engineer/time-entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          startedAtISO: startedAt.toISOString(),
          endedAtISO: endedAt.toISOString(),
          breakMinutes: breakMins,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      toast({ title: "Time logged", variant: "success" });
      setDrawerMode(null);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  }

  async function handleAddCost(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const description = (fd.get("description") as string)?.trim();
    const type = fd.get("type") as string;
    const quantity = parseFloat(fd.get("quantity") as string) || 1;
    const unitCost = parseFloat(fd.get("unitCost") as string) || 0;
    const supplier = (fd.get("supplier") as string)?.trim() || undefined;

    if (!description) return;

    try {
      const res = await fetch(`/api/engineer/jobs/${job.id}/cost-items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description, type, quantity, unitCost, supplier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      toast({ title: "Cost added", variant: "success" });
      setDrawerMode(null);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  }

  // ── Section content helpers ─────────────────────────────────

  const documentsContent = (
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
  );

  const stagesContent = stages.length === 0 ? (
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
  );

  const variationsContent = (
    <div className="space-y-4">
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
      <EngineerVariationForm jobId={job.id} stages={stages} />
    </div>
  );

  const stockContent = stockConsumed ? (
    <div className="flex items-center gap-2">
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Stock consumed &#10003;</Badge>
    </div>
  ) : (
    <div className="space-y-3">
      <div className="text-sm text-[var(--muted-foreground)]">
        This job has {budgetLines?.length} stock-mapped item{(budgetLines?.length ?? 0) !== 1 ? "s" : ""} to consume from your truck stock.
      </div>
      <div className="space-y-1">
        {(budgetLines ?? []).map((bl) => (
          <div key={bl.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] p-2 text-sm">
            <span className="text-[var(--foreground)]">{bl.description || bl.stockItemId.slice(0, 8)}</span>
            <span className="text-[var(--muted-foreground)]">×{bl.stockQty}</span>
          </div>
        ))}
      </div>
      {insufficient.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-1">
          <div className="text-sm font-semibold text-amber-800 dark:text-amber-300">Insufficient stock:</div>
          {insufficient.map((item, i) => (
            <div key={i} className="text-xs text-amber-700 dark:text-amber-400">
              {item.description}: need {item.stockQty}, have {item.available}
            </div>
          ))}
        </div>
      )}
      <Button type="button" onClick={consumeStock} disabled={consumingStock || busy}>
        {consumingStock ? "Consuming..." : "Consume Stock"}
      </Button>
    </div>
  );

  const certsContent = certs.length === 0 ? (
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
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5 pb-24">
      {/* ── Job header ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="line-clamp-2 md:line-clamp-none">
              {job.title || `Job #${job.id.slice(0, 8)}`}
            </CardTitle>
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

      {/* ── Scope (collapsible — has own toggle) ─────────── */}
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

      {/* ── Sections: mobile = collapsible, desktop = always expanded ── */}

      {isMobile ? (
        <>
          <CollapsibleSection title="Documents" defaultOpen={false}>
            {documentsContent}
          </CollapsibleSection>

          <CollapsibleSection title="Stages" defaultOpen={false} count={stages.length}>
            {stagesContent}
          </CollapsibleSection>

          <CollapsibleSection title="Variations" defaultOpen={false} count={variations.length}>
            {variationsContent}
          </CollapsibleSection>

          <CollapsibleSection title="Snag List" defaultOpen={false}>
            <EngineerSnagCard jobId={job.id} />
          </CollapsibleSection>

          {hasStockLines && (
            <CollapsibleSection title="Stock" defaultOpen={false} count={budgetLines?.length}>
              {stockContent}
            </CollapsibleSection>
          )}

          <CollapsibleSection title="Certificates" defaultOpen={false} count={certs.length}>
            {certsContent}
          </CollapsibleSection>
        </>
      ) : (
        <>
          {/* Documents */}
          <Card>
            <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
            <CardContent>{documentsContent}</CardContent>
          </Card>

          {/* Stages */}
          <Card>
            <CardHeader><CardTitle>Stages</CardTitle></CardHeader>
            <CardContent>{stagesContent}</CardContent>
          </Card>

          {/* Variations */}
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

          {/* Stock */}
          {hasStockLines && (
            <Card>
              <CardHeader><CardTitle>Stock</CardTitle></CardHeader>
              <CardContent>{stockContent}</CardContent>
            </Card>
          )}

          {/* Certificates */}
          <Card>
            <CardHeader><CardTitle>Certificates</CardTitle></CardHeader>
            <CardContent>{certsContent}</CardContent>
          </Card>
        </>
      )}

      {/* ── Sticky bottom action bar ───────────────────────── */}
      {isMobile ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--background)] pb-[env(safe-area-inset-bottom,8px)]">
          <div className="grid grid-cols-4 h-[56px]">
            <button
              type="button"
              onClick={isTimerOnThisJob ? stopTimer : startTimer}
              disabled={busy || (!isTimerOnThisJob && hasActiveTimer)}
              className="flex flex-col items-center justify-center gap-0.5 text-[var(--foreground)] disabled:opacity-40"
            >
              <span className="text-lg">{isTimerOnThisJob ? "\u23F8" : "\u25B6"}</span>
              <span className="text-[10px] leading-none">{isTimerOnThisJob ? "Stop" : "Timer"}</span>
            </button>
            <button
              type="button"
              onClick={() => setDrawerMode("cost")}
              className="flex flex-col items-center justify-center gap-0.5 text-[var(--foreground)]"
            >
              <span className="text-lg">+</span>
              <span className="text-[10px] leading-none">Add Cost</span>
            </button>
            <button
              type="button"
              onClick={() => setDrawerMode("time")}
              className="flex flex-col items-center justify-center gap-0.5 text-[var(--foreground)]"
            >
              <span className="text-lg">{"\u23F1"}</span>
              <span className="text-[10px] leading-none">Log Time</span>
            </button>
            {jobStatus !== "completed" && (
              <button
                type="button"
                onClick={markComplete}
                disabled={busy}
                className="flex flex-col items-center justify-center gap-0.5 text-[var(--foreground)] disabled:opacity-40"
              >
                <span className="text-lg">{"\u2713"}</span>
                <span className="text-[10px] leading-none">Complete</span>
              </button>
            )}
          </div>
        </div>
      ) : (
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
      )}

      {/* ── Log Time Drawer ────────────────────────────────── */}
      <BottomDrawer open={drawerMode === "time"} onClose={() => setDrawerMode(null)} title="Log Time">
        <form onSubmit={handleLogTime} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-[var(--foreground)]">Date</span>
            <input type="date" name="date" defaultValue={today} required
              className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[44px]" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[var(--foreground)]">Start time</span>
            <input type="time" name="startTime" defaultValue="09:00" required
              className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[44px]" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[var(--foreground)]">Duration (hours)</span>
            <input type="number" name="duration" defaultValue={1} step={0.25} min={0.25} required
              className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[44px]" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[var(--foreground)]">Break (mins)</span>
            <input type="number" name="breakMinutes" defaultValue={0} min={0}
              className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[44px]" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[var(--foreground)]">Notes</span>
            <textarea name="notes" rows={2}
              className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
          </label>
          <Button type="submit" className="w-full min-h-[44px]">Log Time</Button>
        </form>
      </BottomDrawer>

      {/* ── Add Cost Drawer ────────────────────────────────── */}
      <BottomDrawer open={drawerMode === "cost"} onClose={() => setDrawerMode(null)} title="Add Cost">
        <form onSubmit={handleAddCost} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-[var(--foreground)]">Description</span>
            <input type="text" name="description" required
              className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[44px]" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[var(--foreground)]">Type</span>
            <select name="type" defaultValue="material"
              className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[44px]">
              <option value="material">Material</option>
              <option value="subcontractor">Subcontractor</option>
              <option value="plant">Plant</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[var(--foreground)]">Quantity</span>
            <input type="number" name="quantity" defaultValue={1} min={1} step={1}
              className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[44px]" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[var(--foreground)]">Unit cost (&pound;)</span>
            <input type="number" name="unitCost" defaultValue={0} min={0} step={0.01}
              className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[44px]" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[var(--foreground)]">Notes / Supplier</span>
            <input type="text" name="supplier"
              className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm min-h-[44px]" />
          </label>
          <Button type="submit" className="w-full min-h-[44px]">Add Cost</Button>
        </form>
      </BottomDrawer>
    </div>
  );
}
