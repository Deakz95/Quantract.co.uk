"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import LineItemsEditor, { computeSubtotal, LineItem } from "@/components/shared/LineItemsEditor";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type Variation = {
  id: string;
  token?: string;
  jobId?: string;
  quoteId?: string;
  stageId?: string;
  stageName?: string;
  title: string;
  reason?: string;
  notes?: string;
  status: "draft" | "sent" | "approved" | "rejected";
  vatRate: number;
  items: LineItem[];
  subtotal: number;
  vat: number;
  total: number;
  createdAtISO: string;
  sentAtISO?: string;
  approvedAtISO?: string;
  rejectedAtISO?: string;
  approvedBy?: string;
};

type JobStage = {
  id: string;
  name: string;
  status: "not_started" | "in_progress" | "done";
};

type VariationAttachment = {
  id: string;
  name: string;
  mimeType: string;
  createdAtISO: string;
};

function pounds(n: number) {
  return `£${Number(n || 0).toFixed(2)}`;
}

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleString("en-GB") : "—";
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

type Props = {
  variationId: string;
};

export default function AdminVariationPage({ variationId }: Props) {
  const { toast } = useToast();
  const [v, setV] = useState<Variation | null>(null);
  const [attachments, setAttachments] = useState<VariationAttachment[]>([]);
  const [stages, setStages] = useState<JobStage[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const canEdit = v?.status === "draft";

  const totals = useMemo(() => {
    if (!v) return null;
    const subtotal = computeSubtotal(v.items || []);
    const vat = subtotal * Number(v.vatRate || 0);
    const total = subtotal + vat;
    return { subtotal, vat, total };
  }, [v]);

  const stageLabel = useMemo(() => {
    if (!v?.stageId) return "Unassigned";
    return stages.find((s) => s.id === v.stageId)?.name || "Unassigned";
  }, [stages, v?.stageId]);

  async function loadStages(jobId: string) {
    const r = await fetch(`/api/admin/jobs/${jobId}/stages`, { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    if (d.ok) setStages(Array.isArray(d.stages) ? d.stages : []);
  }

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/variations/${variationId}`, { cache: "no-store" });
      const d = await r.json();
      if (d.ok) {
        setV(d.variation);
        setAttachments(Array.isArray(d.attachments) ? d.attachments : []);
        if (d.variation?.jobId) {
          await loadStages(d.variation.jobId);
        } else {
          setStages([]);
        }
      } else {
        setV(null);
        setAttachments([]);
        setStages([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!variationId) {
      setLoading(false);
      setV(null);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variationId]);

  function setItems(next: LineItem[]) {
    setV((prev) => (prev ? { ...prev, items: next } : prev));
  }

  async function save() {
    if (!v) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/variations/${variationId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: v.title,
          reason: v.reason ?? null,
          notes: v.notes ?? null,
          stageId: v.stageId ?? null,
          vatRate: v.vatRate,
          items: (v.items || []).filter((x) => String(x.description || "").trim().length),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(d?.error || "Save failed");
      setV(d.variation);
      toast({ title: "Saved", description: "Variation updated.", variant: "success" });
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error, "Could not save."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!v) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/variations/${variationId}/send`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(d?.error || "Send failed");
      await refresh();
      toast({ title: "Sent", description: `Client link: ${d.clientLink}`, variant: "success" });
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error, "Could not send."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">Variation {variationId}</div>
          {v?.jobId ? (
            <div className="mt-1 text-xs text-slate-600">
              Job: <Link className="hover:underline" href={`/admin/jobs/${v.jobId}`}>{v.jobId}</Link>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={refresh} disabled={busy}>Refresh</Button>
          <Button type="button" onClick={save} disabled={busy || loading || !canEdit}>Save</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-700">Loading…</div>
      ) : !v ? (
        <div className="text-sm text-slate-700">Not found.</div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Header</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{v.status}</Badge>
                  <a className="text-sm font-semibold text-slate-900 hover:underline" href={`/api/admin/variations/${v.id}/pdf`} target="_blank" rel="noreferrer">
                    View PDF
                  </a>
                  {v.token ? (
                    <a className="text-sm font-semibold text-slate-900 hover:underline" href={`/client/variations/${v.token}`} target="_blank" rel="noreferrer">
                      Client link
                    </a>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid gap-2 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-600">Sent</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{formatDate(v.sentAtISO)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-600">Approved</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{formatDate(v.approvedAtISO)}</div>
                  {v.approvedBy ? <div className="mt-1 text-xs text-slate-600">{v.approvedBy}</div> : null}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-600">Rejected</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{formatDate(v.rejectedAtISO)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="text-xs font-semibold text-slate-600">Stage</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{stageLabel}</div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-700">Title</span>
                  <input
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    value={v.title}
                    onChange={(e) => setV((p) => (p ? { ...p, title: e.target.value } : p))}
                    disabled={!canEdit || busy}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-700">Stage (optional)</span>
                  <select
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    value={v.stageId || ""}
                    onChange={(e) => setV((p) => (p ? { ...p, stageId: e.target.value || undefined } : p))}
                    disabled={!canEdit || busy}
                  >
                    <option value="">Unassigned</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-700">Reason (optional)</span>
                  <textarea
                    className="min-h-[90px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    value={v.reason || ""}
                    onChange={(e) => setV((p) => (p ? { ...p, reason: e.target.value } : p))}
                    disabled={!canEdit || busy}
                  />
                </label>
                <label className="grid gap-1 sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-700">Engineer notes</span>
                  <textarea
                    className="min-h-[90px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    value={v.notes || ""}
                    onChange={(e) => setV((p) => (p ? { ...p, notes: e.target.value } : p))}
                    disabled={!canEdit || busy}
                    placeholder="Internal notes from site."
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-700">VAT rate</span>
                  <input
                    type="number"
                    step="0.01"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    value={v.vatRate}
                    onChange={(e) => setV((p) => (p ? { ...p, vatRate: Number(e.target.value) } : p))}
                    disabled={!canEdit || busy}
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-600">
                  Tip: once sent, it stays locked for audit. Approved/rejected is client-driven.
                </div>
                <Button type="button" onClick={send} disabled={busy || !v || v.status !== "draft"}>Send to client</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Line items</CardTitle>
                <div className="text-xs text-slate-600">Edit items like a quote (qty × unit price).</div>
              </div>
            </CardHeader>
            <CardContent>
              <LineItemsEditor items={v.items || []} setItems={setItems} disabled={!canEdit || busy} />

              {totals ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold text-slate-600">Subtotal</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{pounds(totals.subtotal)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold text-slate-600">VAT</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{pounds(totals.vat)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold text-slate-600">Total</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{pounds(totals.total)}</div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Photos & attachments</CardTitle>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <div className="text-sm text-slate-600">No photos uploaded yet.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {attachments.map((att) => (
                    <a
                      key={att.id}
                      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white"
                      href={`/api/admin/variations/${v.id}/attachments/${att.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={`/api/admin/variations/${v.id}/attachments/${att.id}`}
                        alt={att.name}
                        className="h-48 w-full object-cover transition group-hover:scale-[1.02]"
                      />
                      <div className="border-t border-slate-200 px-3 py-2">
                        <div className="text-sm font-semibold text-slate-900">{att.name}</div>
                        <div className="text-xs text-slate-600">Uploaded {formatDate(att.createdAtISO)}</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
