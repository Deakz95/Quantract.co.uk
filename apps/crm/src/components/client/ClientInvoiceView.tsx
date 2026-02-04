"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ChevronDown, ChevronUp, Download, Shield, CheckCircle2 } from "lucide-react";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";

type Invoice = {
  id: string;
  invoiceNumber?: string;
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

type LineItem = {
  description?: string;
  qty: number;
  unitPrice: number;
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
  return `\u00A3${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

export default function ClientInvoiceView({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [vatRate, setVatRate] = useState(0.2);
  const [paying, setPaying] = useState(false);
  const [amountInput, setAmountInput] = useState<string>("");
  const [showLineItems, setShowLineItems] = useState(false);
  const [fetchError, setFetchError] = useState<"not_found" | "error" | null>(null);
  const [payConfirm, setPayConfirm] = useState<"pending" | "succeeded" | null>(
    searchParams.get("paid") === "1" ? "pending" : null
  );

  const canPay = useMemo(() => {
    if (!inv) return false;
    if (inv.status === "paid") return false;
    return inv.status === "sent" || inv.status === "unpaid" || inv.status === "draft";
  }, [inv]);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/client/invoices/${token}`)
      .then((r) => {
        if (!r.ok) {
          if (mounted) setFetchError(r.status === 404 ? "not_found" : "error");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!mounted || !d) return;
        if (!d.invoice) { setFetchError("not_found"); return; }
        setInv(d.invoice ?? null);
        setSummary(d.paymentSummary ?? null);
        if (Array.isArray(d.lineItems)) setLineItems(d.lineItems);
        if (typeof d.vatRate === "number") setVatRate(d.vatRate);
        const bal = Number(d?.paymentSummary?.balanceDue ?? NaN);
        if (Number.isFinite(bal)) setAmountInput(bal.toFixed(2));
      })
      .catch(() => { if (mounted) setFetchError("error"); });
    return () => {
      mounted = false;
    };
  }, [token]);

  // CP-4C: When returning from Stripe (?paid=1), poll for payment confirmation
  useEffect(() => {
    if (payConfirm !== "pending") return;
    let cancelled = false;
    let attempts = 0;
    const poll = () => {
      attempts += 1;
      fetch(`/api/client/invoices/${token}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled || !d?.invoice) return;
          setInv(d.invoice);
          if (d.paymentSummary) setSummary(d.paymentSummary);
          if (d.invoice.status === "paid" || Number(d.paymentSummary?.balanceDue ?? NaN) <= 0) {
            setPayConfirm("succeeded");
            router.replace(`/client/invoices/${token}`);
          } else if (attempts < 10) {
            setTimeout(poll, 2000);
          } else {
            // Give up polling — webhook may be delayed, show what we have
            setPayConfirm("succeeded");
            router.replace(`/client/invoices/${token}`);
          }
        })
        .catch(() => {
          if (!cancelled && attempts < 10) setTimeout(poll, 2000);
        });
    };
    // Short initial delay to give webhook time to arrive
    const t = setTimeout(poll, 1500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [payConfirm, token, router]);

  async function startPay() {
    if (!inv || paying) return;

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

  if (fetchError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          {fetchError === "not_found" ? (
            <div className="text-center py-8">
              <p className="text-sm font-medium text-[var(--foreground)]">Invoice not found</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">This invoice link is invalid or has expired. Please contact your contractor for an updated link.</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm font-medium text-[var(--foreground)]">Something went wrong</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Please check your connection and try again.</p>
              <button type="button" onClick={() => window.location.reload()} className="mt-3 text-xs font-medium text-[var(--primary)] hover:underline">Retry</button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const loadingTimedOut = useLoadingTimeout(!inv && !fetchError);

  if (!inv) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTimedOut ? (
            <div className="text-center py-4">
              <p className="text-sm text-[var(--foreground)]">This is taking longer than expected.</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Try refreshing the page or contact your contractor if the problem persists.</p>
              <button type="button" onClick={() => window.location.reload()} className="mt-3 text-xs font-medium text-[var(--primary)] hover:underline">Refresh page</button>
            </div>
          ) : (
            <div className="text-sm text-[var(--muted-foreground)]">Loading...</div>
          )}
        </CardContent>
      </Card>
    );
  }

  const isPaid = inv.status === "paid";
  const totalPaid = Number(summary?.totalPaid ?? (isPaid ? inv.total : 0));
  const balanceDue = Number(summary?.balanceDue ?? (isPaid ? 0 : inv.total));
  const vatPercent = Math.round(vatRate * 100);

  return (
    <div className="mx-auto w-full max-w-2xl p-6 space-y-4">
      <Breadcrumbs />
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Invoice</CardTitle>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">{inv.invoiceNumber ? `Invoice ${inv.invoiceNumber}` : `Invoice #${inv.id.slice(0, 8)}`}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{STATUS_LABEL[inv.status]}</Badge>
              <Badge>{pounds(inv.total)}</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Security notice */}
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4 flex gap-3">
            <Shield size={16} strokeWidth={1.8} className="shrink-0 mt-0.5 text-[var(--muted-foreground)]" />
            <p className="text-xs text-[var(--muted-foreground)]">
              This invoice is accessed via a secure, unique link. Payments are processed through Stripe and your card details are never stored on our servers.
            </p>
          </div>

          {/* Billed to */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Billed To</div>
            <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{inv.clientName}</div>
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">{inv.clientEmail}</div>
          </div>

          {/* Line items — expandable */}
          {lineItems.length > 0 && (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowLineItems(!showLineItems)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-inset"
              >
                <span className="text-sm font-semibold text-[var(--foreground)]">What you're paying for</span>
                {showLineItems
                  ? <ChevronUp size={16} className="text-[var(--muted-foreground)]" />
                  : <ChevronDown size={16} className="text-[var(--muted-foreground)]" />
                }
              </button>
              {showLineItems && (
                <div className="px-4 pb-4">
                  <div className="border-t border-[var(--border)]" />
                  <table className="w-full mt-3 text-sm">
                    <thead>
                      <tr className="text-xs text-[var(--muted-foreground)]">
                        <th className="text-left font-medium pb-2">Description</th>
                        <th className="text-right font-medium pb-2 w-14">Qty</th>
                        <th className="text-right font-medium pb-2 w-20">Unit</th>
                        <th className="text-right font-medium pb-2 w-20">Line</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((li, idx) => {
                        const lineTotal = li.qty * li.unitPrice;
                        return (
                          <tr key={idx} className="border-t border-[var(--border)]">
                            <td className="py-2 text-[var(--foreground)]">{li.description || "Item"}</td>
                            <td className="py-2 text-right text-[var(--muted-foreground)]">{li.qty}</td>
                            <td className="py-2 text-right text-[var(--muted-foreground)]">{pounds(li.unitPrice)}</td>
                            <td className="py-2 text-right font-medium text-[var(--foreground)]">{pounds(lineTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
                    VAT is charged at {vatPercent}% on the subtotal of {pounds(inv.subtotal)}, adding {pounds(inv.vat)} to give a total of {pounds(inv.total)}.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Totals grid */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Subtotal</div>
              <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{pounds(inv.subtotal)}</div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">VAT ({vatPercent}%)</div>
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

          {/* Action buttons */}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/api/client/invoices/${inv.token}/pdf`} target="_blank" rel="noreferrer">
              <Button type="button" variant="secondary" className="inline-flex items-center gap-1.5 h-11 min-w-[44px]">
                <Download size={14} strokeWidth={1.8} />
                Download PDF
              </Button>
            </Link>
            {inv.paymentUrl ? (
              <Link href={inv.paymentUrl} target="_blank" rel="noreferrer">
                <Button type="button" className="h-11 min-w-[44px]">Open payment link</Button>
              </Link>
            ) : null}

            {Array.isArray(inv.attachments) && inv.attachments.length ? (
              <div className="flex flex-wrap gap-2">
                {inv.attachments.map((a) => (
                  <Link key={a.id} href={`/api/client/invoices/${inv.token}/attachments/${a.id}`} target="_blank" rel="noreferrer">
                    <Button type="button" variant="secondary" className="h-11 min-w-[44px]">
                      {a.name || "Attachment"}
                    </Button>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {/* Payment confirmation banner */}
          {payConfirm === "pending" && (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4 text-center">
              <div className="text-sm font-semibold text-[var(--foreground)]">Checking payment status&hellip;</div>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">This may take a moment. Please don&rsquo;t close this page.</div>
            </div>
          )}
          {payConfirm === "succeeded" && isPaid && (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
              <CheckCircle2 size={20} strokeWidth={1.8} className="shrink-0 text-green-600" />
              <div>
                <div className="text-sm font-semibold text-green-900">Payment received</div>
                <div className="text-xs text-green-700">Thank you — your invoice has been marked as paid.</div>
              </div>
            </div>
          )}

          {/* Pay section */}
          {!isPaid && canPay && payConfirm !== "pending" ? (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="text-sm font-semibold text-[var(--foreground)]">Pay invoice</div>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                We'll open a secure payment page in a new tab and return you here once it's complete.
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)]">Amount (GBP)</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm h-11"
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
                    className="h-11 min-w-[44px]"
                  >
                    Pay remaining
                  </Button>
                  <Button type="button" onClick={startPay} disabled={paying || balanceDue <= 0} className="h-11 min-w-[44px]">
                    {paying ? "Opening payment\u2026" : "Pay"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Payment history */}
          {summary?.payments?.length ? (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Payments</div>
              <div className="mt-2 space-y-2">
                {summary.payments.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] p-3 text-sm">
                    <div>
                      <div className="font-semibold text-[var(--foreground)]">{pounds(p.amount)}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{new Date(p.receivedAtISO).toLocaleString("en-GB")} &middot; {p.provider.toUpperCase()} &middot; {p.status}</div>
                    </div>
                    <Link href={`/api/client/invoices/${inv.token}/receipts/${p.id}/pdf`} target="_blank" rel="noreferrer">
                      <Button type="button" variant="secondary" className="h-11 min-w-[44px]">Receipt PDF</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Footer reassurance */}
          <p className="mt-4 text-xs text-[var(--muted-foreground)]">
            {isPaid
              ? `Paid${inv.paidAtISO ? ` on ${new Date(inv.paidAtISO).toLocaleString("en-GB")}` : ""}. Thank you for your payment.`
              : "Payment due. Once paid, you\u2019ll see an updated balance and can download the receipt PDF."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
