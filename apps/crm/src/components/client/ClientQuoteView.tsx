"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";

type Quote = {
  id: string;
  token: string;
  clientName: string;
  clientEmail: string;
  siteAddress?: string;
  notes?: string;
  status: "draft" | "sent" | "accepted";
  createdAtISO: string;
  acceptedAtISO?: string;
  totals: { subtotal: number; vat: number; total: number };
  agreement?: { status: "draft" | "signed"; shareUrl: string } | null;
  variations?: Array<{ id: string; token?: string; title: string; status: string; subtotal: number; vat: number; total: number; createdAtISO: string }>;
  items: { id: string; description: string; qty: number; unitPrice: number }[];
};

export default function ClientQuoteView({ token }: { token: string }) {
  const { toast } = useToast();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/client/quotes/${token}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load quote");
      setQuote(data.quote);
      setError(null);
    } catch (e: any) {
      const errorMsg = e?.message || "Unable to load quote";
      setError(errorMsg);
      toast({
        title: "Error Loading Quote",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function accept() {
    setBusy(true);
    try {
      const res = await fetch(`/api/client/quotes/${token}/accept`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) {
        if (data.error?.includes("already")) {
          throw new Error("This quote has already been accepted.");
        }
        throw new Error(data.error || "Failed to accept quote");
      }
      setQuote(data.quote);
      toast({
        title: "✓ Quote Accepted Successfully",
        description: data.quote?.agreement
          ? "Next step: please sign the works agreement to proceed."
          : "Thank you! We'll be in touch soon to schedule the works.",
      });
    } catch (e: any) {
      toast({
        title: "Unable to Accept Quote",
        description: e?.message || "An error occurred. Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setBusy(false);
    }
  }

  const canAccept = quote && quote.status !== "accepted";
  const loadingTimedOut = useLoadingTimeout(loading);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Quote...</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTimedOut ? (
            <div className="text-center py-4">
              <p className="text-sm text-[var(--foreground)]">This is taking longer than expected.</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Try refreshing the page or contact support if the problem persists.</p>
              <button type="button" onClick={() => window.location.reload()} className="mt-3 text-xs font-medium text-[var(--primary)] hover:underline">Refresh page</button>
            </div>
          ) : (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-[var(--muted)] rounded w-3/4"></div>
              <div className="h-4 bg-[var(--muted)] rounded w-1/2"></div>
              <div className="h-32 bg-[var(--muted)] rounded"></div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (error || !quote) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to Load Quote</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-rose-50 border border-rose-200 p-4">
              <div className="font-semibold text-rose-900 mb-2">Error</div>
              <div className="text-sm text-rose-800">{error}</div>
            </div>
          )}
          <div className="text-sm text-[var(--muted-foreground)]">
            This quote may have been removed or the link may be invalid. Please contact support if you continue to experience issues.
          </div>
          <Button type="button" variant="secondary" onClick={load} disabled={busy}>
            {busy ? "Retrying..." : "Try Again"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <Breadcrumbs />
      <Card>
      <CardHeader className="flex items-start justify-between gap-3 sm:flex-row">
        <div>
          <CardTitle>Your quote</CardTitle>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">
            Status: <span className="font-semibold text-[var(--foreground)]">{quote.status}</span>
            {quote.acceptedAtISO ? (
              <span className="ml-2 text-[var(--muted-foreground)]">Accepted: {new Date(quote.acceptedAtISO).toLocaleString()}</span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/client/quotes/${token}/pdf`} target="_blank" rel="noreferrer">
            <Button type="button" variant="secondary">Download PDF</Button>
          </a>
          <Button type="button" variant="secondary" onClick={load} disabled={busy}>
            Refresh
          </Button>
          <Button type="button" onClick={accept} disabled={!canAccept || busy}>
            {quote.status === "accepted" ? "Accepted" : "Accept quote"}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4 text-xs text-[var(--muted-foreground)]">
          This is a private, token-secured link. Don’t forward it unless you want someone else to access your quote.
        </div>

        {quote.status === "accepted" && quote.agreement ? (
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Next step</div>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[var(--muted-foreground)]">
                Please sign the works agreement to confirm the scope.
              </div>
              <a
                href={quote.agreement.shareUrl}
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                Open agreement
              </a>
            </div>
          </div>
        ) : quote.status !== "accepted" ? (
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">What happens next</div>
            <div className="mt-1 text-sm text-[var(--muted-foreground)]">
              Review the quote, download the PDF for your records, then accept it to unlock the agreement signing step.
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Client</div>
            <div className="text-sm font-semibold text-[var(--foreground)]">{quote.clientName}</div>
            <div className="text-xs text-[var(--muted-foreground)]">{quote.clientEmail}</div>
            {quote.siteAddress ? <div className="mt-2 text-xs text-[var(--muted-foreground)]">{quote.siteAddress}</div> : null}
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Totals</div>
            <div className="mt-2 grid gap-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>£{quote.totals.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>VAT</span><span>£{quote.totals.vat.toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold text-[var(--foreground)]"><span>Total</span><span>£{quote.totals.total.toFixed(2)}</span></div>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
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
              {quote.items.map((it) => (
                <tr key={it.id} className="border-t border-[var(--border)]">
                  <td className="py-3 pr-3">{it.description}</td>
                  <td className="py-3 pr-3">{it.qty}</td>
                  <td className="py-3 pr-3">£{it.unitPrice.toFixed(2)}</td>
                  <td className="py-3 pr-0 text-right">£{(it.qty * it.unitPrice).toFixed(2)}</td>
                </tr>
              ))}
              {quote.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[var(--muted-foreground)]">
                    No items.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {quote.notes ? (
          <div className="mt-4">
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Notes</div>
            <div className="mt-1 whitespace-pre-wrap rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)]">
              {quote.notes}
            </div>
          </div>
        ) : null}

        {quote.variations && quote.variations.length ? (
          <div className="mt-5">
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Variations</div>
            <div className="mt-2 space-y-2">
              {quote.variations.map((v) => (
                <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--foreground)]">{v.title}</div>
                    <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">{v.status} • £{v.total.toFixed(2)}</div>
                  </div>
                  {v.token ? (
                    <a className="text-sm font-semibold text-[var(--foreground)] hover:underline" href={`/client/variations/${v.token}`} target="_blank" rel="noreferrer">
                      View / Approve
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

      </CardContent>
    </Card>
    </div>
  );
}
