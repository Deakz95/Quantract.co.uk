"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/useToast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { apiRequest, createAbortController, getApiErrorMessage, isAbortError, requireOk } from "@/lib/apiClient";
import { ContactForm } from "./ContactForm";

type Client = {
  id: string;
  name: string;
  email: string;
};

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  isPrimary: boolean;
  preferredChannel: string;
  notes?: string;
  clientId?: string;
  client?: Client;
  createdAt: string;
  updatedAt: string;
};

type ContactsPageClientProps = {
  initialClientId?: string;
};

const emptyForm: Partial<Contact> = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  mobile: "",
  jobTitle: "",
  isPrimary: false,
  preferredChannel: "email",
  notes: "",
  clientId: "",
};

export default function ContactsPageClient({ initialClientId }: ContactsPageClientProps = {}) {
  const { toast } = useToast();

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [filterClientId, setFilterClientId] = useState<string>(initialClientId || "");

  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<Partial<Contact>>({ ...emptyForm, clientId: initialClientId || "" });

  const [confirming, setConfirming] = useState<Contact | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const loadClients = useCallback(async () => {
    try {
      const data = await apiRequest<{ ok: boolean; clients: Client[]; error?: string }>("/api/admin/clients", {
        cache: "no-store",
      });
      requireOk(data);
      setClients(Array.isArray(data.clients) ? data.clients : []);
    } catch (error) {
      // silently fail for clients, not critical
    }
  }, []);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = createAbortController();
    abortRef.current = controller;

    setLoading(true);
    setLoadError(null);

    try {
      const params = new URLSearchParams();
      if (filterClientId) params.set("clientId", filterClientId);
      if (q.trim()) params.set("search", q.trim());

      const url = `/api/admin/contacts${params.toString() ? `?${params}` : ""}`;
      const data = await apiRequest<{ ok: boolean; contacts: Contact[]; error?: string }>(url, {
        cache: "no-store",
        signal: controller.signal,
      });
      requireOk(data);
      setContacts(Array.isArray(data.contacts) ? data.contacts : []);
    } catch (error) {
      if (isAbortError(error)) return;
      setLoadError(getApiErrorMessage(error, "Unable to load contacts"));
    } finally {
      setLoading(false);
    }
  }, [filterClientId, q]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return contacts;
    return contacts.filter((c) =>
      [c.firstName, c.lastName, c.email, c.phone, c.mobile, c.jobTitle, c.client?.name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s))
    );
  }, [contacts, q]);

  function startNew() {
    setEditing(null);
    setForm({ ...emptyForm, clientId: filterClientId || "" });
  }

  function startEdit(c: Contact) {
    setEditing(c);
    setForm({ ...c });
  }

  async function save() {
    setBusy(true);
    try {
      const payload = {
        firstName: String(form.firstName ?? "").trim(),
        lastName: String(form.lastName ?? "").trim(),
        email: form.email ? String(form.email).trim().toLowerCase() : undefined,
        phone: form.phone ? String(form.phone).trim() : undefined,
        mobile: form.mobile ? String(form.mobile).trim() : undefined,
        jobTitle: form.jobTitle ? String(form.jobTitle).trim() : undefined,
        isPrimary: Boolean(form.isPrimary),
        preferredChannel: form.preferredChannel || "email",
        notes: form.notes ? String(form.notes).trim() : undefined,
        clientId: form.clientId || undefined,
      };

      if (!payload.firstName || !payload.lastName) {
        toast({ title: "Missing fields", description: "First name and last name are required", variant: "destructive" });
        return;
      }

      const data = await apiRequest<{ ok: boolean; error?: string }>(
        editing ? `/api/admin/contacts/${editing.id}` : "/api/admin/contacts",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      requireOk(data, "Save failed");

      toast({ title: editing ? "Contact updated" : "Contact created", variant: "success" });
      await load();
      if (!editing) startNew();
    } catch (e: any) {
      toast({ title: "Could not save", description: getApiErrorMessage(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  function requestRemove(c: Contact) {
    setConfirming(c);
  }

  async function confirmRemove() {
    if (!confirming) return;
    setBusy(true);
    try {
      const data = await apiRequest<{ ok: boolean; error?: string }>(`/api/admin/contacts/${confirming.id}`, { method: "DELETE" });
      requireOk(data, "Delete failed");

      toast({ title: "Deleted", description: `${confirming.firstName} ${confirming.lastName} removed`, variant: "success" });

      await load();
      if (editing?.id === confirming.id) startNew();
    } catch (e: any) {
      toast({ title: "Could not delete", description: getApiErrorMessage(e), variant: "destructive" });
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  function displayName(c: Contact) {
    return `${c.firstName} ${c.lastName}`.trim();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Contacts</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="w-[200px] max-w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] text-sm"
                  placeholder="Search name, email..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <select
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] text-sm"
                  value={filterClientId}
                  onChange={(e) => setFilterClientId(e.target.value)}
                >
                  <option value="">All clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
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
                  <div key={i} className="grid grid-cols-6 items-center gap-4">
                    <LoadingSkeleton className="h-5" />
                    <LoadingSkeleton className="h-5" />
                    <LoadingSkeleton className="h-5" />
                    <LoadingSkeleton className="h-5" />
                    <LoadingSkeleton className="h-5" />
                    <LoadingSkeleton className="h-8" />
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <ErrorState title="Unable to load contacts" description={loadError} onRetry={() => void load()} />
            ) : filtered.length === 0 ? (
              <EmptyState
                title="No contacts yet"
                description="Create your first contact to start managing relationships."
                action={
                  <Button variant="secondary" type="button" onClick={startNew}>
                    Add contact
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
                      <th className="py-2">Phone</th>
                      <th className="py-2">Job Title</th>
                      <th className="py-2">Client</th>
                      <th className="py-2">Primary</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} className="border-t border-[var(--border)]">
                        <td className="py-3">
                          <div className="font-semibold text-[var(--foreground)]">{displayName(c)}</div>
                        </td>
                        <td className="py-3">
                          <div className="text-[var(--foreground)]">{c.email || "—"}</div>
                        </td>
                        <td className="py-3">
                          <div className="text-[var(--muted-foreground)]">{c.phone || c.mobile || "—"}</div>
                        </td>
                        <td className="py-3">
                          <div className="text-[var(--muted-foreground)]">{c.jobTitle || "—"}</div>
                        </td>
                        <td className="py-3">
                          {c.client ? (
                            <Link href={`/admin/clients/${c.client.id}`} className="text-[var(--primary)] hover:underline">
                              {c.client.name}
                            </Link>
                          ) : (
                            <span className="text-[var(--muted-foreground)]">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          {c.isPrimary ? (
                            <Badge variant="gradient">Primary</Badge>
                          ) : null}
                        </td>
                        <td className="py-3">
                          <div className="flex justify-end gap-2">
                            <Link href={`/admin/contacts/${c.id}`}>
                              <Button variant="secondary" type="button">
                                Details
                              </Button>
                            </Link>
                            <Button variant="secondary" type="button" onClick={() => startEdit(c)}>
                              Edit
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
            <CardTitle>{editing ? "Edit contact" : "Create contact"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ContactForm
              form={form}
              setForm={setForm}
              clients={clients}
              onSave={save}
              onClear={startNew}
              busy={busy}
              isEditing={!!editing}
            />
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(confirming)}
        title={confirming ? `Delete ${displayName(confirming)}?` : "Delete contact?"}
        description="This action cannot be undone."
        confirmLabel="Delete contact"
        onCancel={() => setConfirming(null)}
        onConfirm={confirmRemove}
        busy={busy}
      />
    </div>
  );
}
