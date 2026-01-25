"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useToast } from "@/components/ui/useToast";
import { apiRequest, getApiErrorMessage, requireOk } from "@/lib/apiClient";

type QuoteRow = {
  id: string;
  clientName: string;
  clientEmail: string;
  status: "draft" | "sent" | "accepted";
  createdAtISO: string;
  totals: { subtotal: number; vat: number; total: number };
};

export default function QuotesListClient() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { toast } = useToast();
  const loadedRef = useRef(false);

  // Remove toast from dependencies to prevent infinite loop
  const load = useCallback(async () => {
    setBusy(true);
    setLoadError(null);
    try {
      const data = await apiRequest<{ ok: boolean; quotes: QuoteRow[]; error?: string }>("/api/admin/quotes", { cache: "no-store" });
      requireOk(data);
      setQuotes(Array.isArray(data.quotes) ? data.quotes : []);
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to load quotes");
      setLoadError(message);
    } finally {
      setBusy(false);
    }
  }, []);

  // Load only once on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return quotes;
    return quotes.filter((q) =>
      [q.id, q.clientName, q.clientEmail, q.status].filter(Boolean).some((v) => String(v).toLowerCase().includes(s))
    );
  }, [quotes, query]);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3 sm:flex-row">
        <CardTitle>Quotes</CardTitle>
        <div className="flex items-center gap-2">
          <input
            className="w-[240px] max-w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--foreground)]"
            placeholder="Search client, status…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button variant="secondary" type="button" onClick={load} disabled={busy}>
            Refresh
          </Button>
          <Link href="/admin/quotes/new">
            <Button type="button">New Quote</Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent>
        {busy ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-4 items-center gap-4 border-b border-[var(--border)] py-3">
                <LoadingSkeleton className="h-5" />
                <LoadingSkeleton className="h-5" />
                <LoadingSkeleton className="h-5" />
                <LoadingSkeleton className="h-5" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <ErrorState title="Failed to load" description={loadError} onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No quotes yet"
            description="Create your first quote to start building jobs and invoices."
            action={
              <Link href="/admin/quotes/new">
                <Button type="button">Create quote</Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--muted-foreground)]">
                  <th className="py-2">Client</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Created</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr key={q.id} className="border-t border-[var(--border)]">
                    <td className="py-3">
                      <div className="font-semibold text-[var(--foreground)]">{q.clientName}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{q.clientEmail}</div>
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          q.status === "accepted"
                            ? "bg-green-100 text-green-700"
                            : q.status === "sent"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 font-semibold text-[var(--foreground)]">£{q.totals.total.toFixed(2)}</td>
                    <td className="py-3 text-xs text-[var(--muted-foreground)]">{new Date(q.createdAtISO).toLocaleDateString("en-GB")}</td>
                    <td className="py-3 text-right">
                      <Link href={`/admin/quotes/${q.id}`}>
                        <Button variant="secondary" type="button">
                          Open
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
