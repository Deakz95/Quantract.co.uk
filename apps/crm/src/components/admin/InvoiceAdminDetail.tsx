"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/useToast";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";

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
  updatedAtISO: string;
  paidAtISO?: string;
  sentAtISO?: string;
  paymentProvider?: "stripe" | "demo";
  paymentUrl?: string;
};

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

const STATUS_LABEL: Record<Invoice["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  unpaid: "Unpaid",
  paid: "Paid",
};

export default function InvoiceAdminDetail({ invoiceId }: { invoiceId: string }) {
  const { toast } = useToast();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [busy, setBusy] = useState(false);

  const clientLink = useMemo(() => (inv ? `/client/invoices/${inv.token}` : ""), [inv]);

  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => [
    { label: "Dashboard", href: "/admin" },
    { label: "Invoices", href: "/admin/invoices" },
    { label: inv?.invoiceNumber ? `Invoice ${inv.invoiceNumber}` : `Invoice #${invoiceId.slice(0, 8)}` },
  ], [invoiceId, inv?.invoiceNumber]);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/admin/invoices/${invoiceId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        setInv(d.invoice ?? null);
        setLineItems(Array.isArray(d.lineItems) ? d.lineItems : []);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [invoiceId]);

  async function setStatus(status: Invoice["status"]) {
    if (!inv) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error ?? "failed");
      setInv(d.invoice);
      toast({ title: "Updated", description: `Invoice marked ${STATUS_LABEL[status]}.`, variant: "success" });
    } catch {
      toast({ title: "Error", description: "Could not update invoice.", variant: "destructive" });
    } finally {
      setBusy(false);
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
  const isPayable = inv.status === "sent" || inv.status === "unpaid";

  async function createPaymentLink() {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/invoices/${invoiceId}/payment-link`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error ?? "failed");
      setInv(d.invoice);
      toast({ title: "Payment link", description: "Payment link created.", variant: "success" });
    } catch {
      toast({ title: "Error", description: "Could not create payment link.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Breadcrumbs items={breadcrumbItems} />
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{inv.invoiceNumber ? `Invoice ${inv.invoiceNumber}` : "Invoice"}</CardTitle>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">Ref: #{inv.id.slice(0, 8)}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{STATUS_LABEL[inv.status]}</Badge>
              <Badge>£{inv.total.toFixed(2)}</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Client</div>
              <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{inv.clientName}</div>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">{inv.clientEmail}</div>
              {inv.quoteId ? (
                <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                  Quote:{" "}
                  <Link href={`/admin/quotes/${inv.quoteId}`} className="text-[var(--primary)] hover:underline">
                    #{inv.quoteId.slice(0, 8)}
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Totals</div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Subtotal</span>
                <span className="font-semibold text-[var(--foreground)]">£{inv.subtotal.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">VAT</span>
                <span className="font-semibold text-[var(--foreground)]">£{inv.vat.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Total</span>
                <span className="font-semibold text-[var(--foreground)]">£{inv.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Links</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link href={`/api/client/invoices/${inv.token}/pdf`} target="_blank">
                  <Button variant="secondary" type="button">PDF</Button>
                </Link>
                <Link href={clientLink} target="_blank">
                  <Button variant="secondary" type="button">Client view</Button>
                </Link>
              </div>
              <div className="mt-2 text-xs text-[var(--muted-foreground)]">Client URL: {clientLink}</div>
              {inv.paymentUrl ? (
                <div className="mt-2 text-xs text-[var(--muted-foreground)] break-all">Payment URL: {inv.paymentUrl}</div>
              ) : null}
            </div>
          </div>

          {lineItems.length > 0 && (
            <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--background)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <div className="text-xs font-semibold text-[var(--muted-foreground)]">Line Items</div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-xs text-[var(--muted-foreground)]">
                    <th className="px-4 py-2 text-left font-semibold">Description</th>
                    <th className="px-4 py-2 text-right font-semibold">Qty</th>
                    <th className="px-4 py-2 text-right font-semibold">Unit Price</th>
                    <th className="px-4 py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-2 text-[var(--foreground)]">{item.description || "—"}</td>
                      <td className="px-4 py-2 text-right text-[var(--muted-foreground)]">{item.quantity}</td>
                      <td className="px-4 py-2 text-right text-[var(--muted-foreground)]">£{item.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-[var(--foreground)]">£{(item.total > 0 ? item.total : item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" onClick={() => setStatus("draft")} disabled={busy || inv.status === "draft"}>Draft</Button>
            <Button variant="secondary" type="button" onClick={() => setStatus("sent")} disabled={busy || inv.status === "sent"}>Mark sent</Button>
            <Button variant="secondary" type="button" onClick={() => setStatus("unpaid")} disabled={busy || inv.status === "unpaid"}>Mark unpaid</Button>
            <Button variant="secondary" type="button" onClick={() => setStatus("paid")} disabled={busy || isPaid}>Mark paid</Button>
            <Button variant="secondary" type="button" onClick={createPaymentLink} disabled={busy || Boolean(inv.paymentUrl)}>
              {inv.paymentUrl ? "Payment link ready" : "Create payment link"}
            </Button>
          </div>

          <p className="mt-4 text-xs text-[var(--muted-foreground)]">
            {isPaid ? "Paid." : isPayable ? "Awaiting payment." : "Not issued yet."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
