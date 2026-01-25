"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/useToast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { apiRequest, createAbortController, getApiErrorMessage, isAbortError, requireOk } from "@/lib/apiClient";

type Client = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  notes?: string;
  paymentTermsDays?: number;
  disableAutoChase?: boolean;
  createdAtISO: string;
  updatedAtISO: string;
};

function displayAddress(c: Client) {
  return [c.address1, c.address2, c.city, c.county, c.postcode, c.country].filter(Boolean).join(", ");
}

const empty: Partial<Client> = {
  name: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  county: "",
  postcode: "",
  country: "United Kingdom",
  notes: "",
  paymentTermsDays: undefined,
  disableAutoChase: false,
};

export default function ClientsPageClient() {
  const { toast } = useToast();

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");

  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<Partial<Client>>(empty);

  const [confirming, setConfirming] = useState<Client | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Password reset modal state
  const [pwTarget, setPwTarget] = useState<Client | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = createAbortController();
    abortRef.current = controller;

    setLoading(true);
    setLoadError(null);

    try {
      const data = await apiRequest<{ ok: boolean; clients: Client[]; error?: string }>("/api/admin/clients", {
        cache: "no-store",
        signal: controller.signal,
      });
      requireOk(data);
      setClients(Array.isArray(data.clients) ? data.clients : []);
    } catch (error) {
      if (isAbortError(error)) return;
      setLoadError(getApiErrorMessage(error, "Unable to load clients"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clients;
    return clients.filter((c) =>
      [c.name, c.email, c.phone, displayAddress(c)].filter(Boolean).some((v) => String(v).toLowerCase().includes(s))
    );
  }, [clients, q]);

  function startNew() {
    setEditing(null);
    setForm({ ...empty });
  }

  function startEdit(c: Client) {
    setEditing(c);
    setForm({ ...c });
  }

  function startPasswordReset(c: Client) {
    setPwTarget(c);
    setPw("");
    setPw2("");
    setPwOpen(true);
  }

  const handleImpersonate = useCallback(
    async (client: Client) => {
      try {
        const res = await apiRequest<{ ok: boolean; error?: string }>(`/api/admin/impersonate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId: client.id, role: "client" }),
        });

        if (!res.ok) throw new Error(res.error || "Failed to impersonate");

        toast({
          title: "Impersonating client",
          description: `Now viewing as ${client.name}`,
          variant: "success",
        });

        window.location.href = "/client";
      } catch (err) {
        toast({
          title: "Impersonation failed",
          description: err instanceof Error ? err.message : "Failed to impersonate client",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  async function savePasswordReset() {
    if (!pwTarget) return;

    if (!pw || pw.length < 8 || pw !== pw2) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 8 characters and match confirmation.",
        variant: "destructive",
      });
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch("/api/admin/users/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "client",
          email: pwTarget.email,
          password: pw,
          clientId: pwTarget.id,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "set_password_failed");

      toast({ title: "Password updated", description: `Password reset for ${pwTarget.email}`, variant: "success" });
      setPwOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: getApiErrorMessage(e), variant: "destructive" });
    } finally {
      setPwSaving(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      const payload = {
        name: String(form.name ?? "").trim(),
        email: String(form.email ?? "").trim().toLowerCase(),
        phone: form.phone ? String(form.phone).trim() : undefined,
        address1: form.address1 ? String(form.address1).trim() : undefined,
        address2: form.address2 ? String(form.address2).trim() : undefined,
        city: form.city ? String(form.city).trim() : undefined,
        county: form.county ? String(form.county).trim() : undefined,
        postcode: form.postcode ? String(form.postcode).trim() : undefined,
        country: form.country ? String(form.country).trim() : undefined,
        notes: form.notes ? String(form.notes).trim() : undefined,
        paymentTermsDays:
          form.paymentTermsDays != null && String(form.paymentTermsDays).trim() !== ""
            ? Number(form.paymentTermsDays)
            : undefined,
        disableAutoChase: Boolean(form.disableAutoChase),
      };

      if (!payload.name || !payload.email) {
        toast({ title: "Missing fields", description: "Name and email are required", variant: "destructive" });
        return;
      }

      const data = await apiRequest<{ ok: boolean; error?: string }>(
        editing ? `/api/admin/clients/${editing.id}` : "/api/admin/clients",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      requireOk(data, "Save failed");

      toast({ title: editing ? "Client updated" : "Client created", variant: "success" });
      await load();
      if (!editing) startNew();
    } catch (e: any) {
      toast({ title: "Could not save", description: getApiErrorMessage(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  function requestRemove(c: Client) {
    setConfirming(c);
  }

  async function confirmRemove() {
    if (!confirming) return;
    setBusy(true);
    try {
      const data = await apiRequest<{ ok: boolean; error?: string }>(`/api/admin/clients/${confirming.id}`, { method: "DELETE" });
      requireOk(data, "Delete failed");

      toast({ title: "Deleted", description: `${confirming.name} removed`, variant: "success" });

      await load();
      if (editing?.id === confirming.id) startNew();
    } catch (e: any) {
      toast({ title: "Could not delete", description: getApiErrorMessage(e), variant: "destructive" });
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Clients</CardTitle>
              <div className="flex items-center gap-2">
                <input
                  className="w-[260px] max-w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] text-sm"
                  placeholder="Search name, email, postcode…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <Button variant="secondary" type="button" onClick={startNew}>
                  New
                </Button>
                <Button variant="secondary" type="button" onClick={() => void load()} disabled={loading}>
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-5 items-center gap-4">
                    <LoadingSkeleton className="h-5" />
                    <LoadingSkeleton className="h-5" />
                    <LoadingSkeleton className="h-5" />
                    <LoadingSkeleton className="h-5" />
                    <LoadingSkeleton className="h-8" />
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <ErrorState title="Unable to load clients" description={loadError} onRetry={() => void load()} />
            ) : filtered.length === 0 ? (
              <EmptyState
                title="No clients yet"
                description="Create your first client to start quoting and invoicing."
                action={
                  <Button variant="secondary" type="button" onClick={startNew}>
                    Add client
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--muted-foreground)]">
                      <th className="py-2">Name</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">Address</th>
                      <th className="py-2">Updated</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} className="border-t border-[var(--border)]">
                        <td className="py-3">
                          <div className="font-semibold text-[var(--foreground)]">{c.name}</div>
                          {c.phone ? <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">{c.phone}</div> : null}
                        </td>
                        <td className="py-3">
                          <div className="text-[var(--foreground)]">{c.email}</div>
                        </td>
                        <td className="py-3">
                          <div className="text-[var(--muted-foreground)]">{displayAddress(c) || "—"}</div>
                        </td>
                        <td className="py-3">
                          <Badge>{new Date(c.updatedAtISO).toLocaleDateString("en-GB")}</Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex justify-end gap-2">
                            <Link href={`/admin/clients/${c.id}`}>
                              <Button variant="secondary" type="button">
                                Details
                              </Button>
                            </Link>
                            <Button variant="ghost" type="button" onClick={() => handleImpersonate(c)}>
                              Impersonate
                            </Button>
                            <Button variant="secondary" type="button" onClick={() => startEdit(c)}>
                              Edit
                            </Button>
                            <Button variant="secondary" type="button" onClick={() => startPasswordReset(c)}>
                              Reset password
                            </Button>
                            <Button variant="destructive" type="button" onClick={() => requestRemove(c)}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-4">
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit client" : "Create client"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Name</span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)].5 text-sm"
                  value={form.name ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Email</span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)].5 text-sm"
                  value={form.email ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Phone</span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)].5 text-sm"
                  value={form.phone ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </label>

              <div className="grid grid-cols-1 gap-3">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Address line 1</span>
                  <input
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)].5 text-sm"
                    value={form.address1 ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, address1: e.target.value }))}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Address line 2</span>
                  <input
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)].5 text-sm"
                    value={form.address2 ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, address2: e.target.value }))}
                  />
                </label>

                <label className="grid gap-1">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">City</span>
                    <input
                      className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)].5 text-sm"
                      value={form.city ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">County</span>
                    <input
                      className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)].5 text-sm"
                      value={form.county ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, county: e.target.value }))}
                    />
                  </label>

                <label className="grid gap-1">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Postcode</span>
                    <input
                      className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)].5 text-sm"
                      value={form.postcode ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, postcode: e.target.value }))}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Country</span>
                    <input
                      className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)].5 text-sm"
                      value={form.country ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                    />
                  </label>
              </div>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Payment terms (days)</span>
                <input
                  type="number"
                  min={0}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)].5 text-sm"
                  value={form.paymentTermsDays ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      paymentTermsDays: e.target.value === "" ? undefined : Number(e.target.value),
                    }))
                  }
                  placeholder="e.g. 30 (blank = company default)"
                />
              </label>

              <label className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)].5 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(form.disableAutoChase)}
                  onChange={(e) => setForm((p) => ({ ...p, disableAutoChase: e.target.checked }))}
                />
                <span className="text-[var(--foreground)]">Disable auto-chase</span>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Notes</span>
                <textarea
                  className="min-h-[80px] rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)].5 text-sm"
                  value={form.notes ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </label>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" type="button" onClick={startNew}>
                  Clear
                </Button>
                <Button type="button" onClick={save} disabled={busy}>
                  {busy ? "Saving…" : editing ? "Save" : "Create"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={pwOpen} onOpenChange={(open) => setPwOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset client password</DialogTitle>
            <DialogDescription>
              {pwTarget ? (
                <>
                  Set a new password for <span className="font-semibold">{pwTarget.email}</span>.
                </>
              ) : (
                "Choose a client first."
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">New password</span>
                <input
                  type="password"
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)].5 text-sm"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="Min 8 characters"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Confirm password</span>
                <input
                  type="password"
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)].5 text-sm"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  placeholder="Repeat password"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" type="button" onClick={() => setPwOpen(false)} disabled={pwSaving}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void savePasswordReset()} disabled={pwSaving || !pwTarget}>
                  {pwSaving ? "Saving…" : "Save password"}
                </Button>
              </div>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirming)}
        title={confirming ? `Delete ${confirming.name}?` : "Delete client?"}
        description="This action cannot be undone."
        confirmLabel="Delete client"
        onCancel={() => setConfirming(null)}
        onConfirm={confirmRemove}
        busy={busy}
      />
    </div>
  );
}
