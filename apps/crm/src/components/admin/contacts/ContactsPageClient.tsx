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
import { DataTable, BulkActionBar, formatRelativeTime, type Column, type Action, type SortDirection } from "@/components/ui/DataTable";
import { TableSkeletonInline } from "@/components/ui/TableSkeleton";
import { apiRequest, createAbortController, getApiErrorMessage, isAbortError, requireOk } from "@/lib/apiClient";
import { ContactForm } from "./ContactForm";
import { Users, SquarePen, Eye, Trash2 } from "lucide-react";

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<string>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
    } catch {
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
    let result = contacts;
    const s = q.trim().toLowerCase();
    if (s) {
      result = contacts.filter((c) =>
        [c.firstName, c.lastName, c.email, c.phone, c.mobile, c.jobTitle, c.client?.name]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(s))
      );
    }

    // Apply sorting
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let aVal: unknown;
        let bVal: unknown;

        // Handle computed/nested properties
        if (sortKey === "name") {
          aVal = `${a.firstName} ${a.lastName}`.trim();
          bVal = `${b.firstName} ${b.lastName}`.trim();
        } else if (sortKey === "clientName") {
          aVal = a.client?.name;
          bVal = b.client?.name;
        } else {
          aVal = (a as Record<string, unknown>)[sortKey];
          bVal = (b as Record<string, unknown>)[sortKey];
        }

        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        let comparison = 0;
        if (typeof aVal === "string" && typeof bVal === "string") {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === "number" && typeof bVal === "number") {
          comparison = aVal - bVal;
        } else if (typeof aVal === "boolean" && typeof bVal === "boolean") {
          comparison = aVal === bVal ? 0 : aVal ? -1 : 1;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [contacts, q, sortKey, sortDirection]);

  function startNew() {
    setEditing(null);
    setForm({ ...emptyForm, clientId: filterClientId || "" });
  }

  function startEdit(c: Contact) {
    setEditing(c);
    setForm({ ...c });
  }

  const handleSort = (key: string, direction: SortDirection) => {
    setSortKey(key);
    setSortDirection(direction);
  };

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
    } catch (e: unknown) {
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
      setSelectedIds((ids) => ids.filter((id) => id !== confirming.id));
    } catch (e: unknown) {
      toast({ title: "Could not delete", description: getApiErrorMessage(e), variant: "destructive" });
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await Promise.all(
        selectedIds.map((id) => apiRequest(`/api/admin/contacts/${id}`, { method: "DELETE" }))
      );
      toast({ title: "Deleted", description: `${selectedIds.length} contacts deleted`, variant: "success" });
      await load();
      setSelectedIds([]);
      if (editing && selectedIds.includes(editing.id)) startNew();
    } catch {
      toast({ title: "Error", description: "Failed to delete some contacts", variant: "destructive" });
    } finally {
      setBulkDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  function displayName(c: Contact) {
    return `${c.firstName} ${c.lastName}`.trim();
  }

  const columns: Column<Contact>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (contact) => (
        <div className="font-semibold text-[var(--foreground)]">{displayName(contact)}</div>
      ),
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      render: (contact) => <span className="text-[var(--foreground)]">{contact.email || "-"}</span>,
    },
    {
      key: "phone",
      label: "Phone",
      sortable: true,
      render: (contact) => (
        <span className="text-[var(--muted-foreground)]">{contact.phone || contact.mobile || "-"}</span>
      ),
    },
    {
      key: "jobTitle",
      label: "Job Title",
      sortable: true,
      render: (contact) => (
        <span className="text-[var(--muted-foreground)]">{contact.jobTitle || "-"}</span>
      ),
    },
    {
      key: "clientName",
      label: "Client",
      sortable: true,
      render: (contact) =>
        contact.client ? (
          <Link href={`/admin/clients/${contact.client.id}`} className="text-[var(--primary)] hover:underline">
            {contact.client.name}
          </Link>
        ) : (
          <span className="text-[var(--muted-foreground)]">-</span>
        ),
    },
    {
      key: "isPrimary",
      label: "Primary",
      sortable: true,
      render: (contact) => (contact.isPrimary ? <Badge variant="gradient">Primary</Badge> : null),
    },
    {
      key: "updatedAt",
      label: "Last Updated",
      sortable: true,
      render: (contact) => (
        <span className="text-[var(--muted-foreground)]">{formatRelativeTime(contact.updatedAt)}</span>
      ),
    },
  ];

  const actions: Action<Contact>[] = [
    {
      label: "View Details",
      onClick: (contact) => {
        window.location.href = `/admin/contacts/${contact.id}`;
      },
      icon: <Eye className="w-4 h-4" />,
    },
    {
      label: "Edit",
      onClick: startEdit,
      icon: <SquarePen className="w-4 h-4" />,
    },
    {
      label: "Delete",
      onClick: requestRemove,
      variant: "danger",
      icon: <Trash2 className="w-4 h-4" />,
    },
  ];

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
            {/* Bulk Action Bar */}
            <BulkActionBar
              selectedCount={selectedIds.length}
              onDelete={() => setBulkDeleteOpen(true)}
              onClearSelection={() => setSelectedIds([])}
              deleteLabel="Delete selected"
              className="mb-4"
            />

            {loading ? (
              <TableSkeletonInline columns={6} rows={5} />
            ) : loadError ? (
              <ErrorState title="Unable to load contacts" description={loadError} onRetry={() => void load()} />
            ) : contacts.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No contacts yet"
                description="Contacts are individual people associated with your clients. Track multiple contacts per client organisation for better relationship management."
                features={[
                  "Store phone, email, and job title for each contact",
                  "Designate primary contacts for client communications",
                  "Set preferred contact channel (email, phone, SMS)",
                ]}
                primaryAction={{ label: "Add your first contact", onClick: startNew }}
                secondaryAction={{ label: "Import from CSV", href: "/admin/import?type=contacts" }}
              />
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No contacts match your search</h3>
                <p className="text-[var(--muted-foreground)] mb-4">Try adjusting your search criteria</p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filtered}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                actions={actions}
                getRowId={(row) => row.id}
                onRowClick={startEdit}
              />
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

      {/* Single Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(confirming)}
        title={confirming ? `Delete ${displayName(confirming)}?` : "Delete contact?"}
        description="This action cannot be undone."
        confirmLabel="Delete contact"
        onCancel={() => setConfirming(null)}
        onConfirm={confirmRemove}
        busy={busy}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.length} contact${selectedIds.length === 1 ? "" : "s"}?`}
        description="This action cannot be undone. All selected contacts will be permanently deleted."
        confirmLabel="Delete"
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        busy={bulkDeleting}
      />
    </div>
  );
}
