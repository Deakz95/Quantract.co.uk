"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/useToast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type Quote = {
  id: string;
  token: string;
  clientName: string;
  clientEmail: string;
  clientId?: string;
  siteAddress?: string;
  notes?: string;
  status: "draft" | "sent" | "accepted" | "rejected";
  totals: { subtotal: number; vat: number; total: number };
  shareUrl: string;
  items: { id: string; description: string; qty: number; unitPrice: number }[];
  agreement?: { id: string; status: "draft" | "signed"; shareUrl: string } | null;
  audit?: {
    quote: { id: string; action: string; actorRole: string; actor?: string; createdAtISO: string }[];
    agreement: { id: string; action: string; actorRole: string; actor?: string; createdAtISO: string }[];
  };
};

export default function QuoteDetailClient({ quoteId }: { quoteId: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [clients, setClients] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  async function loadClients() {
    try {
      const res = await fetch(`/api/admin/clients`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setClients(data.clients);
    } catch {
      // ignore
    }
  }

  async function load() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load quote");
      setQuote(data.quote);
    } catch (e: any) {
      toast({ title: "Couldn't load quote", description: e?.message || "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadClients();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId]);

  const shareLink = useMemo(() => {
    if (!quote) return "";
    if (typeof window === "undefined") return quote.shareUrl;
    return `${window.location.origin}${quote.shareUrl}`;
  }, [quote]);



async function attachClient(clientId: string) {
  if (!quote) return;
  setBusy(true);
  try {
    const res = await fetch(`/api/admin/quotes/${quoteId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Failed");
    setQuote(data.quote);
    toast({ title: "Client attached", variant: "success" });
  } catch (e: any) {
    toast({ title: "Couldn't attach client", description: e?.message || "Unknown error", variant: "destructive" });
  } finally {
    setBusy(false);
  }
}

  async function markSent() {
    if (!quote) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "sent" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed");
      setQuote(data.quote);
      toast({ title: "Marked as sent", variant: "success" });
    } catch (e: any) {
      toast({ title: "Couldn't update", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function sendEmail() {
    if (!quote) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/send`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed");
      toast({ title: "Email sent", description: `Link: ${data.shareUrlAbsolute || data.shareUrl}`, variant: "success" });
      await load();
    } catch (e: any) {
      toast({ title: "Couldn't send", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function rotateToken() {
    if (!quote) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/token`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed");
      setQuote(data.quote);
      toast({ title: "New client link generated", description: "Old link is now invalid.", variant: "success" });
    } catch (e: any) {
      toast({ title: "Couldn't rotate token", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
      setConfirmRevoke(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast({ title: "Copied link", variant: "success" });
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked clipboard access.", variant: "destructive" });
    }
  }

  async function acceptQuote() {
    if (!quote) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/accept`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) {
        if (data.error?.includes("already")) {
          throw new Error("This quote has already been accepted.");
        }
        throw new Error(data.error || "Failed to accept quote");
      }
      setQuote(data.quote);
      toast({
        title: "Quote accepted successfully",
        description: data.quote?.agreement
          ? "Agreement created. Client can now sign the works agreement."
          : "Quote accepted on behalf of client.",
        variant: "success"
      });
    } catch (e: any) {
      toast({
        title: "Unable to accept quote",
        description: e?.message || "An error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setBusy(false);
    }
  }

  async function rejectQuote() {
    if (!quote) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason || null })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to reject quote");
      setQuote(data.quote);
      toast({
        title: "Quote rejected",
        description: rejectReason ? `Reason: ${rejectReason}` : "Quote has been rejected.",
        variant: "success"
      });
      setConfirmReject(false);
      setRejectReason("");
    } catch (e: any) {
      toast({
        title: "Unable to reject quote",
        description: e?.message || "An error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setBusy(false);
    }
  }

  async function convertToJob() {
    if (!quote) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quote.id })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to create job");
      toast({
        title: "Job created from quote",
        description: `Redirecting to job detail...`,
        variant: "success"
      });
      // Redirect to job detail page
      window.location.href = `/admin/jobs/${data.job.id}`;
    } catch (e: any) {
      toast({
        title: "Unable to create job",
        description: e?.message || "An error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setBusy(false);
    }
  }

  if (!quote) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quote</CardTitle>
        </CardHeader>
        <CardContent>{busy ? "Loading…" : "Not found."}</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Breadcrumbs />
      <Card>
        <CardHeader className="flex items-start justify-between gap-3 sm:flex-row">
          <div>
            <CardTitle>Quote</CardTitle>
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">
              Status: <span className="font-semibold text-[var(--foreground)]">{quote.status}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/api/client/quotes/${quote.token}/pdf`} target="_blank" rel="noreferrer">
              <Button type="button" variant="secondary">Quote PDF</Button>
            </a>
            <Button type="button" variant="secondary" onClick={load} disabled={busy}>
              Refresh
            </Button>
            <Button type="button" variant="secondary" onClick={sendEmail} disabled={busy}>
              Send email
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirmRevoke(true)} disabled={busy}>
              Revoke link
            </Button>
            <Button type="button" onClick={markSent} disabled={busy || quote.status === "accepted"}>
              Mark sent
            </Button>
            {quote.status !== "accepted" && quote.status !== "rejected" && (
              <Button type="button" onClick={acceptQuote} disabled={busy} className="bg-green-600 hover:bg-green-700">
                ✓ Accept Quote
              </Button>
            )}
            {quote.status !== "accepted" && quote.status !== "rejected" && (
              <Button type="button" variant="destructive" onClick={() => setConfirmReject(true)} disabled={busy}>
                ✗ Reject Quote
              </Button>
            )}
            {quote.status === "accepted" && (
              <Button type="button" onClick={convertToJob} disabled={busy} className="bg-blue-600 hover:bg-blue-700">
                → Convert to Job
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Client</div>
              <div className="text-sm font-semibold text-[var(--foreground)]">{quote.clientName}</div>
              <div className="text-xs text-[var(--muted-foreground)]">{quote.clientEmail}</div>

              <div className="mt-3">
                <div className="text-xs font-semibold text-[var(--muted-foreground)]">Attach existing client</div>
                <select
                  className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  value={quote.clientId ?? ""}
                  onChange={(e) => e.target.value && attachClient(e.target.value)}
                  disabled={busy}
                >
                  <option value="">— Select —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">Selecting a client will overwrite name/email and site address from the client record.</div>
              </div>
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

          {quote.status === "accepted" && quote.agreement && (
            <div className="mt-4 rounded-2xl border-2 border-green-200 bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">✓</div>
                <div className="flex-1">
                  <div className="font-semibold text-green-900">Quote Accepted</div>
                  <div className="mt-1 text-sm text-green-800">
                    {quote.agreement.status === "signed" ? (
                      <span>Agreement signed. Ready to convert to job.</span>
                    ) : (
                      <span>Waiting for client to sign agreement.</span>
                    )}
                  </div>
                  {quote.agreement && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        quote.agreement.status === "signed"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        Agreement: {quote.agreement.status}
                      </span>
                      <a
                        href={quote.agreement.shareUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-green-700 underline hover:text-green-900"
                      >
                        View Agreement →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Client link</div>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                readOnly
                value={shareLink}
              />
              <Button type="button" variant="secondary" onClick={copyLink}>
                Copy
              </Button>
              <a className="text-sm font-semibold text-[var(--foreground)] underline" href={quote.shareUrl} target="_blank" rel="noreferrer">
                Open
              </a>
            </div>
            <div className="mt-2 text-xs text-[var(--muted-foreground)]">
              Share this link with the client to view/accept the quote (no login needed).
            </div>
          </div>

          {quote.agreement && quote.status !== "accepted" && (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Agreement link</div>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  readOnly
                  value={typeof window === "undefined" ? quote.agreement.shareUrl : `${window.location.origin}${quote.agreement.shareUrl}`}
                />
                <a
                  className="text-sm font-semibold text-[var(--foreground)] underline"
                  href={quote.agreement.shareUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
                <a href={`/api/client/agreements/${quote.agreement.shareUrl.split("/").pop()}/pdf`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[var(--foreground)] underline">
                  PDF
                </a>
                {quote.agreement.status === "signed" && (
                  <a href={`/client/agreements/${quote.agreement.shareUrl.split("/").pop()}/certificate`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[var(--foreground)] underline">
                    Certificate
                  </a>
                )}
              </div>
              <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                Agreement status: <span className="font-semibold text-[var(--foreground)]">{quote.agreement.status}</span>
              </div>
            </div>
          )}

          {quote.notes ? (
            <div className="mt-4">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Notes</div>
              <div className="mt-1 whitespace-pre-wrap rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)]">
                {quote.notes}
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Line items</div>
            <div className="mt-2 overflow-x-auto">
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
          </div>

          {quote.audit ? (
            <div className="mt-6">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Audit trail</div>
              <div className="mt-2 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--background)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--muted-foreground)]">
                      <th className="py-2 px-3">When</th>
                      <th className="py-2 px-3">Action</th>
                      <th className="py-2 px-3">Actor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...quote.audit.quote, ...quote.audit.agreement]
                      .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1))
                      .map((e) => (
                        <tr key={e.id} className="border-t border-[var(--border)]">
                          <td className="py-3 px-3 text-xs text-[var(--muted-foreground)]">{new Date(e.createdAtISO).toLocaleString()}</td>
                          <td className="py-3 px-3 font-semibold text-[var(--foreground)]">{e.action}</td>
                          <td className="py-3 px-3 text-xs text-[var(--muted-foreground)]">{e.actorRole}{e.actor ? ` • ${e.actor}` : ""}</td>
                        </tr>
                      ))}
                    {quote.audit.quote.length + quote.audit.agreement.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-[var(--muted-foreground)]">
                          No audit events yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmRevoke}
        title="Revoke client link?"
        description="The current share link will stop working. A new link will be generated."
        confirmLabel="Revoke link"
        onCancel={() => setConfirmRevoke(false)}
        onConfirm={rotateToken}
        busy={busy}
      />
      <ConfirmDialog
        open={confirmReject}
        title="Reject this quote?"
        description={
          <div className="space-y-3">
            <p>The quote will be marked as rejected. This action cannot be undone.</p>
            <div>
              <label className="text-xs font-semibold text-[var(--muted-foreground)]">Rejection reason (optional)</label>
              <textarea
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                rows={3}
                placeholder="e.g., Price too high, changed requirements, etc."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>
        }
        confirmLabel="Reject Quote"
        onCancel={() => {
          setConfirmReject(false);
          setRejectReason("");
        }}
        onConfirm={rejectQuote}
        busy={busy}
      />
    </div>
  );
}
