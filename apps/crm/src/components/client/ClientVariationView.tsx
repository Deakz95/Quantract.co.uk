"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/useToast";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type Variation = {
  id: string;
  token: string;
  title: string;
  reason?: string;
  status: "draft" | "sent" | "approved" | "rejected";
  subtotal: number;
  vat: number;
  total: number;
  createdAtISO: string;
  sentAtISO?: string;
  approvedAtISO?: string;
  rejectedAtISO?: string;
  approvedBy?: string;
};

function pounds(n: number) {
  const v = Number(n || 0);
  return `£${v.toFixed(2)}`;
}

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleString("en-GB") : "—";
}

export default function ClientVariationView({ token }: { token: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [variation, setVariation] = useState<Variation | null>(null);

  async function load() {
    setBusy(true);
    try {
      const res = await fetch(`/api/client/variations/${token}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load");
      setVariation(data.variation);
    } catch (e: any) {
      toast({ title: "Could not load variation", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const canDecide = useMemo(() => variation && variation.status === "sent", [variation]);

  async function decide(decision: "approved" | "rejected") {
    setBusy(true);
    try {
      const res = await fetch(`/api/client/variations/${token}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed");
      setVariation(data.variation);
      toast({ title: decision === "approved" ? "Variation approved" : "Variation rejected", variant: "success" });
    } catch (e: any) {
      toast({ title: "Could not update", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  if (!variation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{busy ? "Loading…" : "Variation not found"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="secondary" onClick={load} disabled={busy}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-6 space-y-4">
      <Breadcrumbs />
      <Card>
        <CardHeader className="flex items-start justify-between gap-3 sm:flex-row">
          <div>
            <CardTitle>Variation</CardTitle>
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">{variation.title}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{variation.status}</Badge>
            <Badge>{pounds(variation.total)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Status</div>
            <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">
              {variation.status === "sent" ? "Awaiting your decision" : variation.status === "approved" ? "Approved" : variation.status === "rejected" ? "Rejected" : "Draft"}
            </div>
            <div className="mt-2 grid gap-2 text-xs text-[var(--muted-foreground)] sm:grid-cols-3">
              <div>Sent: {formatDate(variation.sentAtISO)}</div>
              <div>Approved: {formatDate(variation.approvedAtISO)}</div>
              <div>Rejected: {formatDate(variation.rejectedAtISO)}</div>
            </div>
            {variation.approvedBy ? <div className="mt-2 text-xs text-[var(--muted-foreground)]">Approved by {variation.approvedBy}</div> : null}
          </div>
          {variation.reason ? (
            <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Reason</div>
              <div className="mt-1 text-sm text-[var(--foreground)]">{variation.reason}</div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Subtotal (ex VAT)</div>
              <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{pounds(variation.subtotal)}</div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">VAT</div>
              <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{pounds(variation.vat)}</div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Total</div>
              <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{pounds(variation.total)}</div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={load} disabled={busy}>
              Refresh
            </Button>
            <Button type="button" onClick={() => decide("approved")} disabled={!canDecide || busy}>
              Accept variation
            </Button>
            <Button type="button" variant="destructive" onClick={() => decide("rejected")} disabled={!canDecide || busy}>
              Reject variation
            </Button>
            {variation.status === "draft" ? (
              <div className="text-xs text-[var(--muted-foreground)]">Decisions are available once the variation has been sent.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
