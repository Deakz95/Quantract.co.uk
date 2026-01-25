"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import { apiRequest, getApiErrorMessage } from "@/lib/apiClient";

type Invoice = { id: string };
type Quote = {
  id: string;
  clientName?: string;
  clientEmail?: string;
  status?: string;
  total?: number;
  createdAtISO?: string;
};
type Client = { id: string; name: string; email: string };

export default function AdminInvoiceNewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"quote" | "manual">("quote");

  // From quote
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");

  // Manual invoice
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [vat, setVat] = useState("");

  const total = useMemo(() => {
    const sub = Number(subtotal || 0);
    const vatValue = Number(vat || 0);
    if (!Number.isFinite(sub) || !Number.isFinite(vatValue)) return "";
    return (sub + vatValue).toFixed(2);
  }, [subtotal, vat]);

  const loadQuotes = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/quotes", { cache: "no-store" });
      const data = await res.json();
      if (data.ok && Array.isArray(data.quotes)) {
        // Show accepted quotes that can be invoiced
        setQuotes(data.quotes.filter((q: Quote) => q.status === "accepted" || q.status === "sent" || q.status === "draft"));
      }
    } catch {
      // ignore
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients", { cache: "no-store" });
      const data = await res.json();
      if (data.ok && Array.isArray(data.clients)) {
        setClients(data.clients);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadQuotes();
    loadClients();
  }, [loadQuotes, loadClients]);

  // Auto-fill client details when selecting client
  useEffect(() => {
    if (!selectedClientId) return;
    const c = clients.find((x) => x.id === selectedClientId);
    if (!c) return;
    setClientName(c.name);
    setClientEmail(c.email);
  }, [selectedClientId, clients]);

  async function createInvoice() {
    setBusy(true);
    try {
      if (mode === "quote") {
        if (!selectedQuoteId) {
          toast({ title: "Select a quote", description: "Choose a quote to create an invoice from.", variant: "destructive" });
          return;
        }
        const data = await apiRequest<{ ok?: boolean; invoice?: Invoice; error?: string }>("/api/admin/invoices", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ quoteId: selectedQuoteId }),
        });
        if (!data.invoice) throw new Error(data.error || "Could not create invoice");
        toast({ title: "Invoice created", description: "Created from quote.", variant: "success" });
        router.push(`/admin/invoices/${data.invoice.id}`);
        return;
      }

      // Manual invoice
      const payload = {
        clientId: selectedClientId || undefined,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim().toLowerCase(),
        subtotal: Number(subtotal || 0),
        vat: Number(vat || 0),
        total: Number(total || 0),
      };
      if (!payload.clientName || !payload.clientEmail) {
        toast({ title: "Missing client info", description: "Provide client name and email.", variant: "destructive" });
        return;
      }
      const data = await apiRequest<{ ok?: boolean; invoice?: Invoice; error?: string }>("/api/admin/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!data.invoice) throw new Error(data.error || "Could not create invoice");
      toast({ title: "Invoice created", description: "Manual invoice saved.", variant: "success" });
      router.push(`/admin/invoices/${data.invoice.id}`);
    } catch (error: any) {
      toast({ title: "Could not create invoice", description: getApiErrorMessage(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell role="admin" title="Create invoice" subtitle="Create from an accepted quote or manually." hideNav>
      <div className="mx-auto grid max-w-2xl gap-6">
        {/* Mode selector */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "quote" ? "default" : "secondary"}
            onClick={() => setMode("quote")}
          >
            From Quote
          </Button>
          <Button
            type="button"
            variant={mode === "manual" ? "default" : "secondary"}
            onClick={() => setMode("manual")}
          >
            Manual Invoice
          </Button>
        </div>

        {mode === "quote" ? (
          <Card>
            <CardHeader>
              <CardTitle>Create from quote</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Select quote</span>
                  <select
                    className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm text-[var(--foreground)]"
                    value={selectedQuoteId}
                    onChange={(e) => setSelectedQuoteId(e.target.value)}
                  >
                    <option value="">— Select a quote —</option>
                    {quotes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.clientName || q.clientEmail || "Unknown"} - £{(q.total || 0).toFixed(2)} ({q.status}) - {new Date(q.createdAtISO || "").toLocaleDateString("en-GB")}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
                  Client details and line items will be pulled from the selected quote.
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => router.push("/admin/invoices")}>Back</Button>
                  <Button type="button" onClick={createInvoice} disabled={busy || !selectedQuoteId}>
                    {busy ? "Creating…" : "Create invoice"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Create manual invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Select existing client (optional)</span>
                  <select
                    className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm text-[var(--foreground)]"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                  >
                    <option value="">— New / manual —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Client name *</span>
                  <input
                    className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm text-[var(--foreground)]"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. ACME Ltd"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Client email *</span>
                  <input
                    className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm text-[var(--foreground)]"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="client@email.com"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Subtotal</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm text-[var(--foreground)]"
                    value={subtotal}
                    onChange={(e) => setSubtotal(e.target.value)}
                    placeholder="0.00"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">VAT</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm text-[var(--foreground)]"
                    value={vat}
                    onChange={(e) => setVat(e.target.value)}
                    placeholder="0.00"
                  />
                </label>

                <div className="text-sm font-semibold text-[var(--foreground)]">Total: £{total || "0.00"}</div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => router.push("/admin/invoices")}>Back</Button>
                  <Button type="button" onClick={createInvoice} disabled={busy}>
                    {busy ? "Creating…" : "Create invoice"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>What happens next</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-[var(--foreground)]">
              <li className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">Review and send the invoice to your client.</li>
              <li className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">Track payment status and send reminders.</li>
              <li className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">Mark as paid when payment is received.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
