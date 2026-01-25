"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type Invoice = {
  id: string;
  token: string;
  quoteId?: string;
  clientName: string;
  clientEmail: string;
  subtotal: number;
  vat: number;
  total: number;
  status: "draft" | "sent" | "unpaid" | "paid";
  createdAtISO: string;
  paidAtISO?: string;
  paymentUrl?: string;
  attachments?: Array<{ id: string; name: string; mimeType: string }>;
};

type InvoicePayment = {
  id: string;
  amount: number;
  currency: string;
  provider: "stripe" | "manual";
  status: "pending" | "succeeded" | "failed";
  receivedAtISO: string;
};

type PaymentSummary = {
  totalPaid: number;
  balanceDue: number;
  payments: InvoicePayment[];
};

const STATUS_LABEL: Record<Invoice["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  unpaid: "Unpaid",
  paid: "Paid",
};

function pounds(n: number) {
  return `£${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

export default function ClientInvoiceView({ token }: { token: string }) {
  const [inv, setInv] = useState<Invoice | null>(null);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [paying, setPaying] = useState(false);
  const [amountInput, setAmountInput] = useState<string>("");

  const canPay = useMemo(() => {
    if (!inv) return false;
    if (inv.status === "paid") return false;
    return inv.status === "sent" || inv.status === "unpaid" || inv.status === "draft";
  }, [inv]);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/client/invoices/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        setInv(d.invoice ?? null);
        setSummary(d.paymentSummary ?? null);
        const bal = Number(d?.paymentSummary?.balanceDue ?? NaN);
        if (Number.isFinite(bal)) setAmountInput(bal.toFixed(2));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [token]);

  async function startPay() {
    if (!inv) return;

    const balanceDue = Number(summary?.balanceDue ?? inv.total);
    const raw = Number(String(amountInput || "").replace(/[^0-9.]/g, ""));
    const amount = Number.isFinite(raw) ? raw : balanceDue;
    const safe = Math.max(0.01, Math.min(amount, balanceDue));

    setPaying(true);
    try {
      const r = await fetch(`/api/client/invoices/${inv.token}/pay`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: safe }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        if (d.invoice) setInv(d.invoice ?? null);
        if (d.paymentSummary) setSummary(d.paymentSummary ?? null);
        const url = d.paymentUrl || d.invoice?.paymentUrl;
        if (typeof url === "string" && url.startsWith("http")) {
          const opened = window.open(url, "_blank", "noopener,noreferrer");
          if (!opened) window.location.href = url;
        }
      }
    } finally {
      setPaying(false);
    }
  }

  if (!inv) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-[var(--muted-foreground)]">Loading…</div>
        </CardContent>
      </Card>
    );
  }

  const isPaid = inv.status === "paid";
  const totalPaid = Number(summary?.totalPaid ?? (isPaid ? inv.total : 0));
  const balanceDue = Number(summary?.balanceDue ?? (isPaid ? 0 : inv.total));

  return (
    <div className="mx-auto w-full max-w-2xl p-6 space-y-4">
      <Breadcrumbs />
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Invoice</CardTitle>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">Invoice ID: {inv.id}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{STATUS_LABEL[inv.status]}</Badge>
              <Badge>{pounds(inv.total)}</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4 text-xs text-[var(--muted-foreground)]">
            This invoice is accessed via a secure link. Don’t forward it unless you want someone else to view or pay it.
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Billed To</div>
            <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{inv.clientName}</div>
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">{inv.clientEmail}</div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Subtotal</div>
              <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{pounds(inv.subtotal)}</div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">VAT</div>
              <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{pounds(inv.vat)}</div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Total</div>
              <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{pounds(inv.total)}</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Paid so far</div>
              <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{pounds(totalPaid)}</div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Balance due</div>
              <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{pounds(balanceDue)}</div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/api/client/invoices/${inv.token}/pdf`} target="_blank" rel="noreferrer">
              <Button type="button" variant="secondary">
                Download PDF
              </Button>
            </Link>
            {inv.paymentUrl ? (
              <Link href={inv.paymentUrl} target="_blank" rel="noreferrer">
                <Button type="button">Open payment link</Button>
              </Link>
            ) : null}

            {Array.isArray(inv.attachments) && inv.attachments.length ? (
              <div className="flex flex-wrap gap-2">
                {inv.attachments.map((a) => (
                  <Link key={a.id} href={`/api/client/invoices/${inv.token}/attachments/${a.id}`} target="_blank" rel="noreferrer">
                    <Button type="button" variant="secondary">
                      {a.name || "Attachment"}
                    </Button>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {!isPaid && canPay ? (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="text-sm font-semibold text-[var(--foreground)]">Pay invoice</div>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                We’ll open a secure payment page in a new tab and return you here once it’s complete.
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)]">Amount (GBP)</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                    inputMode="decimal"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                  />
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">You can pay a partial amount. Balance updates automatically.</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setAmountInput(balanceDue.toFixed(2))}
                    disabled={paying || balanceDue <= 0}
                  >
                    Pay remaining
                  </Button>
                  <Button type="button" onClick={startPay} disabled={paying || balanceDue <= 0}>
                    {paying ? "Opening payment…" : "Pay"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {summary?.payments?.length ? (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Payments</div>
              <div className="mt-2 space-y-2">
                {summary.payments.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] p-3 text-sm">
                    <div>
                      <div className="font-semibold text-[var(--foreground)]">{pounds(p.amount)}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{new Date(p.receivedAtISO).toLocaleString("en-GB")} • {p.provider.toUpperCase()} • {p.status}</div>
                    </div>
                    <Link href={`/api/client/invoices/${inv.token}/receipts/${p.id}/pdf`} target="_blank" rel="noreferrer">
                      <Button type="button" variant="secondary">Receipt PDF</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <p className="mt-4 text-xs text-[var(--muted-foreground)]">
            {isPaid
              ? `Paid${inv.paidAtISO ? ` on ${new Date(inv.paidAtISO).toLocaleString("en-GB")}` : ""}.`
              : "Payment due. Once paid, you’ll see an updated balance and can download the receipt PDF."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
