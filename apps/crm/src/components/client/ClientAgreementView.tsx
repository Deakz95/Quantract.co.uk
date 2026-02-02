"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type QuoteItem = { id: string; description: string; qty: number; unitPrice: number };
type Quote = {
  id: string;
  clientName: string;
  clientEmail: string;
  siteAddress?: string;
  notes?: string;
  vatRate: number;
  items: QuoteItem[];
};

type Agreement = {
  id: string;
  status: "draft" | "signed";
  templateVersion: string;
  quoteSnapshot: Quote;
  createdAtISO: string;
  signedAtISO?: string;
  signerName?: string;
};

function totals(q: Quote) {
  const subtotal = q.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const vat = subtotal * (q.vatRate ?? 0);
  return { subtotal, vat, total: subtotal + vat };
}

export default function ClientAgreementView({ token }: { token: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const canSign = signerName.trim().length > 0 && acceptedTerms && !busy;

  async function load() {
    setBusy(true);
    try {
      const res = await fetch(`/api/client/agreements/${token}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load agreement");
      setAgreement(data.agreement);
      setSignerName((data.agreement?.signerName as string) || "");
    } catch (e: any) {
      toast({ title: "Couldn't load agreement", description: "Please check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function sign() {
    if (!agreement || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/client/agreements/${token}/sign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signerName, signerEmail, acceptedTerms }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to sign");
      toast({ title: "Agreement signed", description: "Thanks — we’ll get you booked in." });
      await load();
    } catch (e: any) {
      toast({ title: "Couldn't sign", description: "Please try again. If this persists, contact the office." });
    } finally {
      setBusy(false);
    }
  }

  if (!agreement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{busy ? "Loading…" : "Agreement not found"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="secondary" onClick={load} disabled={busy}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const q = agreement.quoteSnapshot;
  const t = totals(q);

  return (
    <div className="grid gap-4">
      <Breadcrumbs />
      <Card>
        <CardHeader className="flex items-start justify-between gap-3 sm:flex-row">
          <div>
            <CardTitle>Works agreement</CardTitle>
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">
              Status: <span className="font-semibold text-[var(--foreground)]">{agreement.status}</span>
              {agreement.signedAtISO ? (
                <span className="ml-2 text-[var(--muted-foreground)]">Signed: {new Date(agreement.signedAtISO).toLocaleString()}</span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/api/client/agreements/${token}/pdf`} target="_blank" rel="noreferrer">
              <Button type="button" variant="secondary">Download PDF</Button>
            </a>
            {agreement.status === "signed" ? (
              <a href={`/client/agreements/${token}/certificate`}>
                <Button type="button" variant="secondary">Certificate</Button>
              </a>
            ) : null}
            <Button type="button" variant="secondary" onClick={load} disabled={busy}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4 text-xs text-[var(--muted-foreground)]">
            This agreement uses a secure token link. Keep it private so only authorised signers can access it.
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--foreground)]">
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Summary</div>
            <p className="mt-2">
              This agreement confirms Quantract will carry out the works described in the quote for <b>{q.clientName}</b>.
              By signing, you confirm you accept the scope and totals below.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-[var(--muted-foreground)]">Site</div>
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">{q.siteAddress || "—"}</div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
                <div className="text-xs font-semibold text-[var(--muted-foreground)]">Totals</div>
                <div className="mt-2 grid gap-1">
                  <div className="flex justify-between"><span>Subtotal</span><span>£{t.subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>VAT</span><span>£{t.vat.toFixed(2)}</span></div>
                  <div className="flex justify-between font-semibold text-[var(--foreground)]"><span>Total</span><span>£{t.total.toFixed(2)}</span></div>
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
                  {q.items.map((it) => (
                    <tr key={it.id} className="border-t border-[var(--border)]">
                      <td className="py-3 pr-3">{it.description}</td>
                      <td className="py-3 pr-3">{it.qty}</td>
                      <td className="py-3 pr-3">£{it.unitPrice.toFixed(2)}</td>
                      <td className="py-3 pr-0 text-right">£{(it.qty * it.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                  {q.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[var(--muted-foreground)]">
                        No items.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {q.notes ? (
              <div className="mt-4">
                <div className="text-xs font-semibold text-[var(--muted-foreground)]">Notes</div>
                <div className="mt-1 whitespace-pre-wrap rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)]">
                  {q.notes}
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sign</CardTitle>
        </CardHeader>
        <CardContent>
          {agreement.status === "signed" ? (
            <div className="space-y-2 text-sm text-[var(--muted-foreground)]">
              <div>
                Signed by <span className="font-semibold text-[var(--foreground)]">{agreement.signerName}</span>
                {agreement.signedAtISO ? ` on ${new Date(agreement.signedAtISO).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : ""}.
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 text-xs text-[var(--muted-foreground)]">
                Next up: download the signing certificate, and we’ll issue invoices when the job is scheduled.
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Full name</span>
                <input
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Email (optional)</span>
                <input
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                />
              </label>

              <label className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I confirm I’m authorised to accept this quote and I agree to the works being carried out as described.
                </span>
              </label>

              <div className="flex items-center gap-2">
                <Button type="button" onClick={sign} disabled={!canSign}>
                  Sign agreement
                </Button>
                <Button type="button" variant="secondary" onClick={load} disabled={busy}>
                  Refresh
                </Button>
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">
                Signature is recorded with timestamp and stored in the audit trail. After signing, you can access the certificate and invoices.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
