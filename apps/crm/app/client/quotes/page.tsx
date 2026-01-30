// app/client/quotes/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Quote = {
  id: string;
  token: string;
  status: "draft" | "sent" | "accepted";
  createdAtISO: string;
  totals: { subtotal: number; vat: number; total: number };
};

const STATUS_LABEL: Record<Quote["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
};

export default function ClientQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/client/inbox/quotes")
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        setQuotes(Array.isArray(d.quotes) ? d.quotes : []);
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
        <CardTitle>My Quotes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4 text-sm text-[var(--muted-foreground)]">
          Review your quotes, download PDFs, and accept the scope. Once accepted, you’ll be guided to the secure agreement signing page.
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-[var(--muted-foreground)]">Loading…</div>
        ) : quotes.length === 0 ? (
          <div className="mt-4 text-sm text-[var(--muted-foreground)]">No quotes yet. We’ll email you when a new quote is ready.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {quotes.map((q) => (
              <div key={q.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 sm:flex-row sm:items-center">
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">Quote #{q.id.slice(0, 8)}</div>
                  <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    {new Date(q.createdAtISO).toLocaleString("en-GB")} • Total: £{q.totals.total.toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{STATUS_LABEL[q.status]}</Badge>
                  <Link href={`/client/quotes/${q.token}`}>
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
