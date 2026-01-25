"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Invoice = {
  id: string;
  token: string;
  quoteId?: string;
  total: number;
  status: "draft" | "sent" | "unpaid" | "paid";
  createdAtISO: string;
};

export default function ClientInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/client/inbox/invoices")
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        setInvoices(Array.isArray(d.invoices) ? d.invoices : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Invoices</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4 text-sm text-[var(--muted-foreground)]">
          Open an invoice to pay securely, download the PDF, or view receipts once payment is complete.
        </div>
        {loading ? (
          <div className="text-sm text-[var(--muted-foreground)]">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="text-sm text-[var(--muted-foreground)]">No invoices yet.</div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 sm:flex-row sm:items-center">
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">{inv.id}</div>
                  <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    {inv.quoteId ? `Quote: ${inv.quoteId}` : "Manual"} • {new Date(inv.createdAtISO).toLocaleString("en-GB")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{inv.status}</Badge>
                  <div className="text-sm font-semibold text-[var(--foreground)]">£{inv.total.toFixed(2)}</div>
                  <Link href={`/client/invoices/${inv.token}`}>
                    <Button variant="secondary">Open</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
