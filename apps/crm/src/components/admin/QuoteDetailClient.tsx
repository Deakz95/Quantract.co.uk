"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/useToast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import NextActionPanel from "@/components/admin/NextActionPanel";
import { Phone, Navigation, ExternalLink, Ellipsis } from "lucide-react";

const AUDIT_LABELS: Record<string, string> = {
  "quote.created": "Quote created",
  "quote.sent": "Quote sent to client",
  "quote.accepted": "Quote accepted",
  "quote.rejected": "Quote rejected",
  "quote.revised": "Quote revised",
  "quote.expired": "Quote expired",
  "quote.viewed": "Quote viewed by client",
  "quote.updated": "Quote updated",
  "quote.deleted": "Quote deleted",
  "agreement.created": "Agreement created",
  "agreement.sent": "Agreement sent",
  "agreement.signed": "Agreement signed",
  "agreement.viewed": "Agreement viewed",
  "invoice.created": "Invoice created",
  "invoice.sent": "Invoice sent to client",
  "invoice.paid": "Invoice marked as paid",
  "invoice.viewed": "Invoice viewed",
  "job.created": "Job created",
  "job.completed": "Job completed",
};

function humanizeAuditAction(action: string): string {
  if (AUDIT_LABELS[action]) return AUDIT_LABELS[action];
  // Fallback: "quote.sent" → "Quote sent"
  return action.replace(/[._]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

type Quote = {
  id: string;
  token: string;
  quoteNumber?: string;
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
  const [clients, setClients] = useState<Array<{ id: string; name: string; email: string; phone?: string }>>([]);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

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

  const clientPhone = useMemo(() => {
    if (!quote?.clientId) return null;
    const c = clients.find((cl) => cl.id === quote.clientId);
    return c?.phone || null;
  }, [quote, clients]);

  const mapsUrl = useMemo(() => {
    if (!quote?.siteAddress) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(quote.siteAddress)}`;
  }, [quote]);

  async function shareQuoteLink() {
    if (!shareLink) return;
    const shareData = {
      title: `Quote for ${quote?.clientName || "client"}`,
      text: `View your quote from Quantract`,
      url: shareLink,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or API unavailable — fall through to clipboard
      }
    }
    await copyLink();
  }

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
    const priorStatus = quote.status;
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
      toast({
        type: "success",
        message: "Quote marked as sent.",
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            const ur = await fetch(`/api/admin/quotes/${quoteId}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ status: priorStatus }),
            });
            const ud = await ur.json();
            if (!ud.ok) throw new Error(ud.error || "Undo failed");
            setQuote(ud.quote);
            toast({ type: "success", message: "Reverted to draft." });
          },
        },
      });
    } catch (e: any) {
      toast({ type: "error", message: e?.message || "Couldn't update quote." });
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

  async function convertToInvoice() {
    if (!quote) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/invoice`, { method: "POST" });
      const data = await res.json();
      if (!data.invoice) throw new Error(data.error || "Failed to create invoice");
      toast({
        title: "Invoice created",
        description: "Redirecting to invoice...",
        variant: "success"
      });
      window.location.href = `/admin/invoices/${data.invoice.id}`;
    } catch (e: any) {
      toast({
        title: "Unable to create invoice",
        description: e?.message || "An error occurred.",
        variant: "destructive"
      });
    } finally {
      setBusy(false);
    }
  }

  async function duplicateQuote() {
    if (!quote) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to duplicate");
      toast({
        title: "Quote duplicated",
        description: "Redirecting to new quote...",
        variant: "success"
      });
      window.location.href = `/admin/quotes/${data.quote.id}`;
    } catch (e: any) {
      toast({
        title: "Unable to duplicate",
        description: e?.message || "An error occurred.",
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

  const [editingItems, setEditingItems] = useState(false);
  const [editItems, setEditItems] = useState<Array<{ id: string; description: string; qty: number; unitPrice: number }>>([]);

  function startEditItems() {
    if (!quote) return;
    setEditItems(quote.items.map((it) => ({ ...it })));
    setEditingItems(true);
  }

  function addItem() {
    setEditItems((prev) => [...prev, { id: `new-${Date.now()}`, description: "", qty: 1, unitPrice: 0 }]);
  }

  function removeItem(index: number) {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: string | number) {
    setEditItems((prev) => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  }

  async function saveItems() {
    if (!quote) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: editItems.map((it) => ({ description: it.description, qty: it.qty, unitPrice: it.unitPrice })) }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed");
      setQuote(data.quote);
      setEditingItems(false);
      toast({ title: "Line items updated", variant: "success" });
    } catch (e: any) {
      toast({ title: "Couldn't save items", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => [
    { label: "Dashboard", href: "/admin" },
    { label: "Quotes", href: "/admin/quotes" },
    { label: quote?.quoteNumber ? `Quote ${quote.quoteNumber}` : quote?.clientName ? `Quote — ${quote.clientName}` : "Quote" },
  ], [quoteId, quote?.quoteNumber, quote?.clientName]);

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
      <Breadcrumbs items={breadcrumbItems} />

      {quote.status === "draft" ? (
        <NextActionPanel
          headline="Next step: review and send"
          body="This quote is in draft. Review the line items and send it to the client when ready."
          actions={[{ label: "Send email", onClick: sendEmail }]}
        />
      ) : quote.status === "sent" ? (
        <NextActionPanel
          headline="Awaiting client response"
          body="The quote has been sent. The client can accept or decline via the share link."
        />
      ) : quote.status === "accepted" ? (
        <NextActionPanel
          headline="Quote accepted — create a job"
          body="The client accepted this quote. Convert it to a job to begin scheduling work."
          actions={[
            { label: "Convert to job", onClick: convertToJob },
            { label: "Convert to invoice", onClick: convertToInvoice },
          ]}
        />
      ) : quote.status === "rejected" ? (
        <NextActionPanel
          headline="Quote rejected"
          body="The client declined this quote. You can duplicate and revise it, or archive it."
          actions={[{ label: "Duplicate quote", onClick: duplicateQuote }]}
        />
      ) : null}

      <Card>
        <CardHeader className="flex items-start justify-between gap-3 sm:flex-row">
          <div>
            <CardTitle>{quote.quoteNumber ? `Quote ${quote.quoteNumber}` : quote.clientName ? `Quote — ${quote.clientName}` : "Quote"}</CardTitle>
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">
              Status: <span className="font-semibold text-[var(--foreground)]">{quote.status}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary actions — always visible */}
            <a href={`/api/client/quotes/${quote.token}/pdf`} target="_blank" rel="noreferrer">
              <Button type="button" variant="secondary" className="min-h-12 px-4 touch-manipulation">Quote PDF</Button>
            </a>
            <Button type="button" variant="secondary" className="min-h-12 px-4 touch-manipulation" onClick={sendEmail} disabled={busy}>
              Send email
            </Button>
            <Button type="button" className="min-h-12 px-4 touch-manipulation" onClick={markSent} disabled={busy || quote.status === "accepted"}>
              Mark sent
            </Button>
            {quote.status !== "accepted" && quote.status !== "rejected" && (
              <Button type="button" onClick={acceptQuote} disabled={busy} className="min-h-12 px-4 touch-manipulation bg-green-600 hover:bg-green-700">
                Accept
              </Button>
            )}
            {quote.status === "accepted" && (
              <>
                <Button type="button" onClick={convertToJob} disabled={busy} className="min-h-12 px-4 touch-manipulation bg-blue-600 hover:bg-blue-700">
                  Convert to Job
                </Button>
                <Button type="button" onClick={convertToInvoice} disabled={busy} className="min-h-12 px-4 touch-manipulation bg-emerald-600 hover:bg-emerald-700">
                  Convert to Invoice
                </Button>
              </>
            )}

            {/* Secondary actions — hidden behind overflow on tablet, inline on desktop */}
            <div className="hidden md:contents">
              <Button type="button" variant="secondary" className="min-h-12 px-4 touch-manipulation" onClick={duplicateQuote} disabled={busy}>
                Duplicate
              </Button>
              <Button type="button" variant="secondary" className="min-h-12 px-4 touch-manipulation" onClick={load} disabled={busy}>
                Refresh
              </Button>
              <Button type="button" variant="secondary" className="min-h-12 px-4 touch-manipulation" onClick={() => setConfirmRevoke(true)} disabled={busy}>
                Revoke link
              </Button>
              {quote.status !== "accepted" && quote.status !== "rejected" && (
                <Button type="button" variant="destructive" className="min-h-12 px-4 touch-manipulation" onClick={() => setConfirmReject(true)} disabled={busy}>
                  Reject
                </Button>
              )}
            </div>

            {/* Overflow menu — visible only on < md screens */}
            <div className="relative md:hidden">
              <Button
                type="button"
                variant="secondary"
                className="min-h-12 min-w-12 px-2 touch-manipulation"
                onClick={() => setMoreOpen((v) => !v)}
              >
                <Ellipsis size={18} />
              </Button>
              {moreOpen && (
                <div className="absolute right-0 top-full mt-1 z-30 min-w-[180px] rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg">
                  <button onClick={() => { duplicateQuote(); setMoreOpen(false); }} disabled={busy} className="w-full text-left px-4 py-3 text-sm text-[var(--foreground)] hover:bg-[var(--primary)]/10 touch-manipulation">
                    Duplicate
                  </button>
                  <button onClick={() => { load(); setMoreOpen(false); }} disabled={busy} className="w-full text-left px-4 py-3 text-sm text-[var(--foreground)] hover:bg-[var(--primary)]/10 border-t border-[var(--border)] touch-manipulation">
                    Refresh
                  </button>
                  <button onClick={() => { setConfirmRevoke(true); setMoreOpen(false); }} disabled={busy} className="w-full text-left px-4 py-3 text-sm text-[var(--foreground)] hover:bg-[var(--primary)]/10 border-t border-[var(--border)] touch-manipulation">
                    Revoke link
                  </button>
                  {quote.status !== "accepted" && quote.status !== "rejected" && (
                    <button onClick={() => { setConfirmReject(true); setMoreOpen(false); }} disabled={busy} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 border-t border-[var(--border)] touch-manipulation">
                      Reject quote
                    </button>
                  )}
                </div>
              )}
            </div>
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
                  className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm min-h-12 touch-manipulation"
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

              {/* Quick actions: call, navigate, share */}
              <div className="mt-3 flex flex-wrap gap-2">
                {clientPhone && (
                  <a href={`tel:${encodeURIComponent(clientPhone)}`} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--primary)]/10 transition-colors min-h-10 touch-manipulation">
                    <Phone size={14} />
                    Call client
                  </a>
                )}
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--primary)]/10 transition-colors min-h-10 touch-manipulation">
                    <Navigation size={14} />
                    Navigate to site
                  </a>
                )}
                <button onClick={shareQuoteLink} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--primary)]/10 transition-colors min-h-10 touch-manipulation">
                  <ExternalLink size={14} />
                  Share quote
                </button>
              </div>
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

          {quote.agreement && (
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
                  Client PDF
                </a>
                <a href={`/api/admin/agreements/${quote.agreement.id}/pdf`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[var(--foreground)] underline">
                  Audit PDF
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
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-[var(--muted-foreground)]">Line items</div>
              {(quote.status === "draft" || quote.status === "sent") && !editingItems && (
                <Button type="button" variant="secondary" className="min-h-12 px-4 touch-manipulation" onClick={startEditItems} disabled={busy}>
                  Edit Line Items
                </Button>
              )}
            </div>
            {editingItems ? (
              <div className="mt-2 space-y-2">
                {editItems.map((it, idx) => (
                  <div key={it.id} className="flex flex-wrap gap-2 items-start">
                    <input
                      className="flex-1 min-w-[200px] rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm min-h-12 touch-manipulation"
                      placeholder="Description"
                      value={it.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                    />
                    <input
                      className="w-24 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm min-h-12 touch-manipulation"
                      type="number"
                      placeholder="Qty"
                      value={it.qty}
                      onChange={(e) => updateItem(idx, "qty", Number(e.target.value))}
                    />
                    <input
                      className="w-32 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm min-h-12 touch-manipulation"
                      type="number"
                      step="0.01"
                      placeholder="Unit price"
                      value={it.unitPrice}
                      onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))}
                    />
                    <div className="w-24 py-3 text-sm text-right text-[var(--foreground)]">
                      £{(it.qty * it.unitPrice).toFixed(2)}
                    </div>
                    <Button type="button" variant="ghost" onClick={() => removeItem(idx)} className="text-red-500 px-2 min-h-12 min-w-12 touch-manipulation">
                      ✕
                    </Button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button type="button" variant="secondary" className="min-h-12 px-4 touch-manipulation" onClick={addItem}>+ Add item</Button>
                  <Button type="button" className="min-h-12 px-4 touch-manipulation" onClick={saveItems} disabled={busy}>Save items</Button>
                  <Button type="button" variant="ghost" className="min-h-12 px-4 touch-manipulation" onClick={() => setEditingItems(false)} disabled={busy}>Cancel</Button>
                </div>
              </div>
            ) : (
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
                    {quote.items.map((it, idx) => (
                      <tr key={it.id || idx} className="border-t border-[var(--border)]">
                        <td className="py-3 pr-3">{it.description}</td>
                        <td className="py-3 pr-3">{it.qty}</td>
                        <td className="py-3 pr-3">£{Number(it.unitPrice || 0).toFixed(2)}</td>
                        <td className="py-3 pr-0 text-right">£{(Number(it.qty || 0) * Number(it.unitPrice || 0)).toFixed(2)}</td>
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
            )}
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
                          <td className="py-3 px-3 font-semibold text-[var(--foreground)]">{humanizeAuditAction(e.action)}</td>
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
            <p>The quote will be marked as rejected. You can duplicate and revise it later if needed.</p>
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
