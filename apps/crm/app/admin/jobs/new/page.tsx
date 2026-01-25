"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import { apiRequest, getApiErrorMessage, requireOk } from "@/lib/apiClient";

type Job = { id: string };
type Client = { id: string; name: string; email: string };

export default function AdminJobNewPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // From quote
  const [quoteId, setQuoteId] = useState("");
  
  // Manual creation
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"quote" | "manual">("quote");

  const loadClients = useCallback(async () => {
    try {
      const data = await apiRequest<{ ok: boolean; clients: Client[] }>("/api/admin/clients", { cache: "no-store" });
      if (data.ok && Array.isArray(data.clients)) {
        setClients(data.clients);
      }
    } catch (error) {
      console.error("Failed to load clients:", error);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  async function createFromQuote() {
    const nextQuote = quoteId.trim();
    if (!nextQuote) {
      toast({ title: "Missing quote", description: "Enter a quote ID to create a job.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const data = await apiRequest<{ ok: boolean; job: Job; error?: string }>("/api/admin/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quoteId: nextQuote }),
      });
      requireOk(data);
      toast({ title: "Job created", description: "Job created from quote.", variant: "success" });
      router.push(`/admin/jobs/${data.job.id}`);
    } catch (error) {
      toast({ title: "Could not create job", description: getApiErrorMessage(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function createManual() {
    if (!selectedClientId) {
      toast({ title: "Missing client", description: "Select a client for this job.", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Missing title", description: "Enter a job title.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const data = await apiRequest<{ ok: boolean; job: Job; error?: string }>("/api/admin/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          title: title.trim(),
          description: description.trim() || undefined,
          siteAddress: siteAddress.trim() || undefined,
          manual: true,
        }),
      });
      requireOk(data);
      toast({ title: "Job created", description: "Manual job created.", variant: "success" });
      router.push(`/admin/jobs/${data.job.id}`);
    } catch (error) {
      toast({ title: "Could not create job", description: getApiErrorMessage(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell role="admin" title="Create job" subtitle="Create a job from a quote or manually." hideNav>
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
            Manual Job
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
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Quote ID</span>
                  <input
                    className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                    placeholder="e.g. 8f3c…"
                    value={quoteId}
                    onChange={(e) => setQuoteId(e.target.value)}
                  />
                </label>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
                  Tip: copy the quote ID from Quotes → Open → header.
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => router.push("/admin/jobs")}>Back</Button>
                  <Button type="button" onClick={createFromQuote} disabled={busy}>
                    {busy ? "Creating…" : "Create job"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Create manual job</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Client *</span>
                  <select
                    className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm text-[var(--foreground)]"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                  >
                    <option value="" className="text-[var(--muted-foreground)]">Select a client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Job Title *</span>
                  <input
                    className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                    placeholder="e.g. Kitchen rewire"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Site Address</span>
                  <input
                    className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                    placeholder="e.g. 10 Downing Street, London"
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Description</span>
                  <textarea
                    className="min-h-[80px] rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                    placeholder="Job details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => router.push("/admin/jobs")}>Back</Button>
                  <Button type="button" onClick={createManual} disabled={busy}>
                    {busy ? "Creating…" : "Create job"}
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
              <li className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">Assign an engineer & schedule the job.</li>
              <li className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">Track costs & time as work progresses.</li>
              <li className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">Issue staged invoices from the job page.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
