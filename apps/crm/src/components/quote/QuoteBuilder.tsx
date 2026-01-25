// src/components/quote/QuoteBuilder.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/useToast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stepper } from "@/components/ui/Stepper";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";
import RequestChangeModal from "@/components/support/RequestChangeModal";
import SendQuoteModal from "@/components/quote/SendQuoteModal";
import { Lock, HelpCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { getSigningRecord } from "@/lib/signingStore";
import {
  clampPct,
  defaultQuoteSettings,
  getQuoteSettings,
  rebalanceLastStage,
  setDepositPct,
  sumStagePct,
  upsertQuoteSettings,
  lockQuoteSettings,
} from "@/lib/quoteStore";
import type { QuoteLine } from "@/lib/quoteMath";
import { grandTotal, lineTotal, subtotal, vatAmount } from "@/lib/quoteMath";

function uid() {
  return Math.random().toString(16).slice(2);
}

function formatGBP(n: number) {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
  } catch {
    return `£${n.toFixed(2)}`;
  }
}

export default function QuoteBuilder({ initialQuoteId }: { initialQuoteId?: string }) {
  const { toast } = useToast();

  const steps = ["Draft", "Sent", "Signed", "Invoiced"] as const;
  const [status, setStatus] = useState<(typeof steps)[number]>("Draft");
  const activeStep = Math.max(0, steps.indexOf(status));

  const [sendOpen, setSendOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  const [quoteId] = useState(initialQuoteId ?? "QT-NEW");
  const [qSettings, setQSettings] = useState(() => defaultQuoteSettings(initialQuoteId ?? "QT-NEW"));

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [reference, setReference] = useState("");

  const [vatEnabled, setVatEnabled] = useState(true);
  const vatRate = 0.2;

  const [lines, setLines] = useState<QuoteLine[]>([
    { id: uid(), description: "", qty: 1, unit: "each", rate: 0 },
  ]);

  const sub = useMemo(() => subtotal(lines), [lines]);
  const vat = useMemo(() => (vatEnabled ? vatAmount(sub, vatRate) : 0), [sub, vatEnabled]);
  const total = useMemo(() => grandTotal(sub, vat), [sub, vat]);

  const signedRecord = useMemo(() => getSigningRecord(quoteId), [quoteId]);
  const isLocked = status === "Signed" || !!signedRecord || !!qSettings.lockedAtISO;

  // Load per-quote settings
  useEffect(() => {
    const loaded = getQuoteSettings(quoteId);
    setQSettings(loaded);
  }, [quoteId]);

  // If client signs, move to Signed + lock plan
  useEffect(() => {
    const applySigned = () => {
      const signed = getSigningRecord(quoteId);
      if (!signed) return;

      setStatus((prev) => (prev === "Invoiced" ? prev : "Signed"));
      const locked = lockQuoteSettings(quoteId);
      setQSettings(locked);
    };

    applySigned();

    const t = window.setInterval(applySigned, 1200);
    return () => window.clearInterval(t);
  }, [quoteId]);

  // When Signed, normalize schedule + attempt invoice creation (admin-only)
  useEffect(() => {
    if (status !== "Signed") return;

    const stages = rebalanceLastStage(
      (qSettings?.stages?.length ? qSettings.stages : defaultQuoteSettings(quoteId).stages).map((s) => ({
        ...s,
        pct: clampPct(Number(s.pct || 0)),
        label: (s.label || "Stage").trim(),
      }))
    );

    const normalized = {
      ...qSettings,
      quoteId,
      stages,
      depositPct: clampPct(qSettings.depositPct),
      quoteTotal: total,
    };

    upsertQuoteSettings(normalized);
    setQSettings(normalized);

    const run = async () => {
      try {
        const r = await fetch(`/api/admin/quotes/${quoteId}/invoice`, { method: "POST" });
        if (r.ok) setStatus("Invoiced");
      } catch {
        // keep silent for now (or toast if you want)
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, quoteId, total]);

  // ---- Lines helpers ----
  function updateLine(id: string, patch: Partial<QuoteLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { id: uid(), description: "", qty: 1, unit: "each", rate: 0 }]);
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  }

  const canSend = clientEmail.trim().length > 3 && lines.some((l) => (l.description || "").trim().length > 0);

  async function openInvoice() {
    // ✅ Production-safe: don’t call undefined client functions.
    // Try to create/ensure invoice exists, then fallback to invoices list.
    try {
      const r = await fetch(`/api/admin/quotes/${quoteId}/invoice`, { method: "POST" });
      const d = await r.json().catch(() => ({}));

      const invoiceId =
        d?.invoice?.id ||
        d?.id ||
        d?.invoiceId ||
        (Array.isArray(d?.invoices) ? d.invoices?.[0]?.id : undefined);

      if (r.ok && invoiceId) {
        window.location.href = `/admin/invoices/${invoiceId}`;
        return;
      }

      // fallback (safe even if you don’t support query params)
      window.location.href = `/admin/invoices`;
    } catch {
      toast({
        title: "Error",
        description: "Could not open invoice. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-5">
      <RequestChangeModal open={requestOpen} onClose={() => setRequestOpen(false)} quoteId={quoteId} />

      <SendQuoteModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        quoteId={quoteId}
        clientEmail={clientEmail}
        onSent={() => {
          setSendOpen(false);
          setStatus("Sent");
          toast({ title: "Sent", description: "Quote marked as sent (demo).", variant: "success" });
        }}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Quote Builder</CardTitle>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                {quoteId}
                {reference ? ` • Ref: ${reference}` : ""}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Badge>{status}</Badge>

                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    setStatus("Draft");
                    toast({ title: "Saved", description: "Draft saved (demo).", variant: "success" });
                  }}
                >
                  Save draft
                </Button>

                <Button type="button" disabled={!canSend} onClick={() => setSendOpen(true)}>
                  Send to client
                </Button>

                {status === "Signed" || status === "Invoiced" ? (
                  <Button type="button" onClick={openInvoice}>
                    Open invoice
                  </Button>
                ) : null}
              </div>

              <div className="mt-1">
                <Stepper steps={[...steps]} active={activeStep} />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[var(--foreground)]">Client name</label>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm shadow-sm focus:border-[var(--border)] focus:outline-none"
                placeholder="e.g. John Smith"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--foreground)]">Client email</label>
              <input
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm shadow-sm focus:border-[var(--border)] focus:outline-none"
                placeholder="e.g. john@domain.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-[var(--foreground)]">Site address</label>
              <input
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm shadow-sm focus:border-[var(--border)] focus:outline-none"
                placeholder="e.g. 12 High Street, London, SW1A 1AA"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-[var(--foreground)]">Reference / Notes</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm shadow-sm focus:border-[var(--border)] focus:outline-none"
                placeholder="e.g. Kitchen rewire"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Line items</CardTitle>
            <Button variant="secondary" type="button" onClick={addLine}>
              Add line
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-[var(--muted-foreground)]">
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pr-3 w-20">Qty</th>
                  <th className="py-2 pr-3 w-24">Unit</th>
                  <th className="py-2 pr-3 w-28">Rate</th>
                  <th className="py-2 pr-3 w-28">Line total</th>
                  <th className="py-2 w-20"></th>
                </tr>
              </thead>

              <tbody className="align-top">
                {lines.map((l) => {
                  const lt = lineTotal(l);
                  return (
                    <tr key={l.id} className="border-t border-[var(--border)]">
                      <td className="py-3 pr-3">
                        <input
                          value={l.description}
                          onChange={(e) => updateLine(l.id, { description: e.target.value })}
                          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm shadow-sm focus:border-[var(--border)] focus:outline-none"
                          placeholder="e.g. Supply & fit 8 downlights"
                        />
                      </td>

                      <td className="py-3 pr-3">
                        <input
                          inputMode="decimal"
                          value={String(l.qty)}
                          onChange={(e) => updateLine(l.id, { qty: Number(e.target.value || 0) })}
                          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm shadow-sm focus:border-[var(--border)] focus:outline-none"
                        />
                      </td>

                      <td className="py-3 pr-3">
                        <input
                          value={l.unit}
                          onChange={(e) => updateLine(l.id, { unit: e.target.value })}
                          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm shadow-sm focus:border-[var(--border)] focus:outline-none"
                          placeholder="each"
                        />
                      </td>

                      <td className="py-3 pr-3">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-2.5 text-[var(--muted-foreground)]">£</span>
                          <input
                            inputMode="decimal"
                            value={String(l.rate)}
                            onChange={(e) => updateLine(l.id, { rate: Number(e.target.value || 0) })}
                            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] pl-7 pr-3 py-2 text-sm shadow-sm focus:border-[var(--border)] focus:outline-none"
                          />
                        </div>
                      </td>

                      <td className="py-3 pr-3 font-semibold text-[var(--foreground)]">{formatGBP(lt)}</td>

                      <td className="py-3">
                        <Button
                          variant="ghost"
                          type="button"
                          className={cn("w-full", lines.length <= 1 && "opacity-50")}
                          disabled={lines.length <= 1}
                          onClick={() => removeLine(l.id)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Payment plan</CardTitle>
              <div className="flex items-center gap-2">
                {isLocked ? (
                  <>
                    <Badge className="border-[var(--primary)] bg-[var(--background)] text-white">
                      <Lock className="h-3.5 w-3.5" /> Agreed
                    </Badge>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] shadow-sm">
                            <HelpCircle className="h-4 w-4" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Once the quote is signed, we lock the plan so everyone is working from the same agreed version.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button variant="secondary" type="button" onClick={() => setRequestOpen(true)}>
                      Request change
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-sm text-[var(--muted-foreground)]">
              Set your deposit and (optionally) multi-stage payments. The last stage auto-balances so the total is 100%.
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-[var(--foreground)]">Deposit % (0–100)</label>
                <input
                  inputMode="numeric"
                  value={String(qSettings.depositPct)}
                  disabled={isLocked}
                  onChange={(e) => {
                    const pct = clampPct(Number(e.target.value || 0));
                    const next = setDepositPct(qSettings, pct);
                    upsertQuoteSettings({ ...next, quoteId });
                    setQSettings({ ...next, quoteId });
                  }}
                  className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm shadow-sm focus:border-[var(--border)] focus:outline-none"
                />
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {isLocked
                    ? "This payment plan is locked. If anything needs changing, request a change."
                    : "This sets stage 1 and rebalances the last stage."}
                </p>
              </div>

              <div className="md:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-[var(--foreground)]">Schedule</div>
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">Total: {sumStagePct(qSettings.stages)}%</div>
                    {isLocked ? (
                      <div className="mt-1 inline-flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                        <Lock className="h-3.5 w-3.5" />
                        <span>Agreed plan</span>
                      </div>
                    ) : null}
                  </div>

                  <Button
                    variant="secondary"
                    type="button"
                    disabled={isLocked}
                    onClick={() => {
                      const stages = qSettings.stages.length ? qSettings.stages : defaultQuoteSettings(quoteId).stages;
                      const idx = Math.max(1, stages.length);
                      const inserted = [
                        ...stages.slice(0, -1),
                        { id: uid(), label: `Stage ${idx}`, pct: 10, due: "" },
                        stages[stages.length - 1],
                      ];
                      const nextStages = rebalanceLastStage(inserted);
                      const next = { ...qSettings, quoteId, stages: nextStages };
                      upsertQuoteSettings(next);
                      setQSettings(next);
                    }}
                  >
                    Add stage
                  </Button>
                </div>

                <div className="mt-3 space-y-2">
                  {qSettings.stages.map((s, i) => (
                    <div key={s.id} className="grid grid-cols-1 gap-2 md:grid-cols-12">
                      <div className="md:col-span-4">
                        <input
                          value={s.label}
                          disabled={isLocked}
                          onChange={(e) => {
                            const nextStages = qSettings.stages.map((x) =>
                              x.id === s.id ? { ...x, label: e.target.value } : x
                            );
                            const next = { ...qSettings, quoteId, stages: nextStages };
                            upsertQuoteSettings(next);
                            setQSettings(next);
                          }}
                          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm shadow-sm focus:border-[var(--border)] focus:outline-none"
                          placeholder={i === 0 ? "Deposit" : i === qSettings.stages.length - 1 ? "Final" : "Stage"}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <input
                          inputMode="numeric"
                          value={String(s.pct)}
                          disabled={isLocked}
                          onChange={(e) => {
                            const pct = clampPct(Number(e.target.value || 0));
                            const edited = qSettings.stages.map((x) => (x.id === s.id ? { ...x, pct } : x));
                            const nextStages = rebalanceLastStage(edited);
                            const next = {
                              ...qSettings,
                              quoteId,
                              stages: nextStages,
                              depositPct: clampPct(nextStages[0]?.pct ?? qSettings.depositPct),
                            };
                            upsertQuoteSettings(next);
                            setQSettings(next);
                          }}
                          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm shadow-sm focus:border-[var(--border)] focus:outline-none"
                        />
                      </div>

                      <div className="md:col-span-5">
                        <input
                          value={s.due || ""}
                          disabled={isLocked}
                          onChange={(e) => {
                            const nextStages = qSettings.stages.map((x) =>
                              x.id === s.id ? { ...x, due: e.target.value } : x
                            );
                            const next = { ...qSettings, quoteId, stages: nextStages };
                            upsertQuoteSettings(next);
                            setQSettings(next);
                          }}
                          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm shadow-sm focus:border-[var(--border)] focus:outline-none"
                          placeholder="Due: e.g. On booking / On first fix / On completion"
                        />
                      </div>

                      <div className="md:col-span-1">
                        <Button
                          variant="ghost"
                          type="button"
                          disabled={isLocked || qSettings.stages.length <= 1}
                          onClick={() => {
                            const keep = qSettings.stages.filter((x) => x.id !== s.id);
                            const safe = keep.length >= 2 ? keep : defaultQuoteSettings(quoteId).stages;
                            const nextStages = rebalanceLastStage(safe);
                            const next = {
                              ...qSettings,
                              quoteId,
                              stages: nextStages,
                              depositPct: clampPct(nextStages[0]?.pct ?? qSettings.depositPct),
                            };
                            upsertQuoteSettings(next);
                            setQSettings(next);
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                  Once signed, invoices are created step-by-step from this plan. Next stage is raised only after the previous is marked paid.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted-foreground)]">Subtotal</span>
                <span className="font-semibold text-[var(--foreground)]">{formatGBP(sub)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--muted-foreground)]">VAT (20%)</span>
                <span className="font-semibold text-[var(--foreground)]">{formatGBP(vat)}</span>
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[var(--muted-foreground)]">Total</span>
                <span className="text-base font-extrabold text-[var(--foreground)]">{formatGBP(total)}</span>
              </div>

              <label className="mt-3 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <input
                  type="checkbox"
                  checked={vatEnabled}
                  onChange={(e) => setVatEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)]"
                />
                VAT enabled
              </label>

              <div className="mt-4 space-y-2">
                <Button
                  variant="secondary"
                  type="button"
                  className="w-full"
                  onClick={() => toast({ title: "Preview", description: "PDF preview (demo)." })}
                >
                  Preview PDF
                </Button>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => toast({ title: "Agreement", description: "Agreement generation (demo)." })}
                >
                  Generate agreement
                </Button>
              </div>

              <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                Flow: client signs → status Signed → stage invoice created from schedule. Next stage only after previous is paid.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
