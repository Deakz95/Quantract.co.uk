"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { bulkDeleteWithSummary } from "@/lib/http/deleteWithMessage";
import { undoDelete, bulkUndoAll } from "@/lib/http/undoDelete";
import { ErrorState } from "@/components/ui/ErrorState";
import { DataTable, BulkActionBar, formatRelativeTime, type Column, type Action, type SortDirection } from "@/components/ui/DataTable";
import { TableSkeletonInline } from "@/components/ui/TableSkeleton";
import { FormField, FormInput, FormTextarea, LoadingSpinner } from "@/components/ui/FormField";
import { useFormValidation, type ValidationSchema } from "@/hooks/useFormValidation";
import { apiRequest, createAbortController, getApiErrorMessage, isAbortError, requireOk } from "@/lib/apiClient";
import { Users, SquarePen, Eye, UserCog, KeyRound, Trash2 } from "lucide-react";

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

// Validation schema for client form
const validationSchema: ValidationSchema = {
  name: { required: "Name is required" },
  email: { email: "Please enter a valid email address" },
};

export default function ClientsPageClient() {
  const { toast } = useToast();

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<string>("updatedAtISO");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<Partial<Client>>(empty);

  const [confirming, setConfirming] = useState<Client | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Form validation
  const { errors, touched, validateField, validateAll, setFieldTouched, clearErrors } = useFormValidation<Client>(validationSchema);

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
    let result = clients;
    const s = q.trim().toLowerCase();
    if (s) {
      result = clients.filter((c) =>
        [c.name, c.email, c.phone, displayAddress(c)].filter(Boolean).some((v) => String(v).toLowerCase().includes(s))
      );
    }

    // Apply sorting
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortKey];
        const bVal = (b as Record<string, unknown>)[sortKey];

        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        let comparison = 0;
        if (typeof aVal === "string" && typeof bVal === "string") {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === "number" && typeof bVal === "number") {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [clients, q, sortKey, sortDirection]);

  function startNew() {
    setEditing(null);
    setForm({ ...empty });
    clearErrors();
  }

  function startEdit(c: Client) {
    setEditing(c);
    setForm({ ...c });
    clearErrors();
  }

  const handleBlur = useCallback(
    (field: keyof Client) => {
      setFieldTouched(field);
      validateField(field, form[field]);
    },
    [form, setFieldTouched, validateField]
  );

  // Check if form is valid for submission
  const canSubmit = useMemo(() => {
    const name = (form.name ?? "").trim();
    const email = (form.email ?? "").trim();
    // Name is required, email must be valid if provided
    if (!name) return false;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    return true;
  }, [form.name, form.email]);

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

  const handleSort = (key: string, direction: SortDirection) => {
    setSortKey(key);
    setSortDirection(direction);
  };

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
    } catch (e: unknown) {
      toast({ title: "Error", description: getApiErrorMessage(e), variant: "destructive" });
    } finally {
      setPwSaving(false);
    }
  }

  async function save() {
    // Validate all fields on submit
    const formIsValid = validateAll(form as Client);
    if (!formIsValid) {
      toast({ title: "Please fix the errors before saving", variant: "destructive" });
      return;
    }

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

      if (!payload.name) {
        toast({ title: "Missing fields", description: "Name is required", variant: "destructive" });
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
    } catch (e: unknown) {
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
      const data = await apiRequest<{ ok: boolean; error?: string; undo?: { token: string; payload: any } }>(`/api/admin/clients/${confirming.id}`, { method: "DELETE" });
      requireOk(data, "Delete failed");

      const clientName = confirming.name;
      toast({
        title: "Client deleted", description: `${clientName} removed`, variant: "success",
        duration: data.undo ? 30_000 : undefined,
        action: data.undo ? { label: "Undo", onClick: () => { undoDelete(data.undo!).then(() => { toast({ title: "Restored", description: `${clientName} has been restored`, variant: "success" }); load(); }).catch(() => toast({ title: "Undo expired", description: "The undo window has closed", variant: "destructive" })); } } : undefined,
      });

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
      const r = await bulkDeleteWithSummary(selectedIds, (id) => `/api/admin/clients/${id}`);
      if (r.deleted > 0) {
        const label = `${r.deleted} client${r.deleted === 1 ? "" : "s"} deleted`;
        toast({
          title: "Clients deleted", description: label, variant: "success",
          duration: r.undos.length > 0 ? 30_000 : undefined,
          action: r.undos.length > 0 ? {
            label: "Undo",
            onClick: async () => {
              const result = await bulkUndoAll(r.undos);
              if (result.restored === result.total) {
                toast({ title: "Restored", description: `Restored ${result.restored} client${result.restored === 1 ? "" : "s"}.`, variant: "success" });
              } else if (result.restored > 0) {
                toast({ title: "Partially restored", description: `Restored ${result.restored}/${result.total}. ${result.failed} could not be restored (expired).`, type: "warning" });
              } else {
                toast({ title: "Undo expired", description: "The undo window has closed", variant: "destructive" });
              }
              if (result.restored > 0) load();
            },
          } : undefined,
        });
      }
      if (r.blocked > 0) toast({ title: "Error", description: r.messages[0] || `${r.blocked} could not be deleted (linked records).`, variant: "destructive" });
      await load();
      if (r.blocked === 0) setSelectedIds([]);
      if (r.blocked === 0 && editing && selectedIds.includes(editing.id)) startNew();
    } catch {
      toast({ title: "Error", description: "Failed to delete clients", variant: "destructive" });
    } finally {
      setBulkDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  const columns: Column<Client>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (client) => (
        <div>
          <Link href={`/admin/clients/${client.id}`} className="font-semibold text-[var(--primary)] hover:underline">{client.name}</Link>
          {client.phone && (
            <div className="mt-0.5 text-xs">
              <a href={`tel:${client.phone}`} className="text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:underline" onClick={(e) => e.stopPropagation()}>
                {client.phone}
              </a>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      render: (client) =>
        client.email ? (
          <a href={`mailto:${client.email}`} className="text-[var(--primary)] hover:underline" onClick={(e) => e.stopPropagation()}>
            {client.email}
          </a>
        ) : (
          <span className="text-[var(--muted-foreground)]">-</span>
        ),
    },
    {
      key: "address1",
      label: "Address",
      sortable: false,
      render: (client) => (
        <span className="text-[var(--muted-foreground)]">{displayAddress(client) || "-"}</span>
      ),
    },
    {
      key: "updatedAtISO",
      label: "Updated",
      sortable: true,
      render: (client) => (
        <span className="text-[var(--muted-foreground)]">{formatRelativeTime(client.updatedAtISO)}</span>
      ),
    },
  ];

  const actions: Action<Client>[] = [
    {
      label: "View Details",
      onClick: (client) => {
        window.location.href = `/admin/clients/${client.id}`;
      },
      icon: <Eye className="w-4 h-4" />,
    },
    {
      label: "Edit",
      onClick: startEdit,
      icon: <SquarePen className="w-4 h-4" />,
    },
    {
      label: "Impersonate",
      onClick: handleImpersonate,
      icon: <UserCog className="w-4 h-4" />,
    },
    {
      label: "Reset Password",
      onClick: startPasswordReset,
      icon: <KeyRound className="w-4 h-4" />,
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
              <CardTitle>Clients</CardTitle>
              <div className="flex items-center gap-2">
                <input
                  className="w-[260px] max-w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] text-sm"
                  placeholder="Search name, email, postcode..."
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
            {/* Bulk Action Bar */}
            <BulkActionBar
              selectedCount={selectedIds.length}
              onDelete={() => setBulkDeleteOpen(true)}
              onClearSelection={() => setSelectedIds([])}
              deleteLabel="Delete selected"
              className="mb-4"
            />

            {loading ? (
              <TableSkeletonInline columns={4} rows={5} />
            ) : loadError ? (
              <ErrorState title="Unable to load clients" description={loadError} onRetry={() => void load()} />
            ) : clients.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No clients yet"
                description="Clients are required before creating quotes, invoices, and jobs. Add your first client to get started with your CRM workflow."
                features={[
                  "Store client contact details and billing information",
                  "Track all quotes, invoices, and jobs per client",
                  "Manage payment terms and auto-chase settings",
                ]}
                primaryAction={{ label: "Add your first client", onClick: startNew }}
                secondaryAction={{ label: "Import from CSV", href: "/admin/import?type=clients" }}
              />
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No clients match your search</h3>
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
            <CardTitle>{editing ? "Edit client" : "Create client"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <FormField label="Name" required error={errors.name} touched={touched.name} htmlFor="client-name">
                <FormInput
                  id="client-name"
                  value={form.name ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  onBlur={() => handleBlur("name")}
                  hasError={Boolean(errors.name && touched.name)}
                />
              </FormField>

              <FormField label="Email" error={errors.email} touched={touched.email} htmlFor="client-email">
                <FormInput
                  id="client-email"
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  onBlur={() => handleBlur("email")}
                  hasError={Boolean(errors.email && touched.email)}
                />
              </FormField>

              <FormField label="Phone" htmlFor="client-phone">
                <FormInput
                  id="client-phone"
                  value={form.phone ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-3">
                <FormField label="Address line 1" htmlFor="client-address1">
                  <FormInput
                    id="client-address1"
                    value={form.address1 ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, address1: e.target.value }))}
                  />
                </FormField>

                <FormField label="Address line 2" htmlFor="client-address2">
                  <FormInput
                    id="client-address2"
                    value={form.address2 ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, address2: e.target.value }))}
                  />
                </FormField>

                <FormField label="City" htmlFor="client-city">
                  <FormInput
                    id="client-city"
                    value={form.city ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  />
                </FormField>

                <FormField label="County" htmlFor="client-county">
                  <FormInput
                    id="client-county"
                    value={form.county ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, county: e.target.value }))}
                  />
                </FormField>

                <FormField label="Postcode" htmlFor="client-postcode">
                  <FormInput
                    id="client-postcode"
                    value={form.postcode ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, postcode: e.target.value }))}
                  />
                </FormField>

                <FormField label="Country" htmlFor="client-country">
                  <FormInput
                    id="client-country"
                    value={form.country ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                  />
                </FormField>
              </div>

              <FormField label="Payment terms (days)" htmlFor="client-paymentTerms">
                <FormInput
                  id="client-paymentTerms"
                  type="number"
                  min={0}
                  value={form.paymentTermsDays ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      paymentTermsDays: e.target.value === "" ? undefined : Number(e.target.value),
                    }))
                  }
                  placeholder="e.g. 30 (blank = company default)"
                />
              </FormField>

              <label className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(form.disableAutoChase)}
                  onChange={(e) => setForm((p) => ({ ...p, disableAutoChase: e.target.checked }))}
                />
                <span className="text-[var(--foreground)]">Disable auto-chase</span>
              </label>

              <FormField label="Notes" htmlFor="client-notes">
                <FormTextarea
                  id="client-notes"
                  value={form.notes ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </FormField>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" type="button" onClick={startNew}>
                  Clear
                </Button>
                <Button type="button" onClick={save} disabled={busy || !canSubmit}>
                  {busy ? (
                    <>
                      <LoadingSpinner className="mr-2" />
                      Saving...
                    </>
                  ) : editing ? (
                    "Save"
                  ) : (
                    "Create"
                  )}
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
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] text-sm"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="Min 8 characters"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Confirm password</span>
                <input
                  type="password"
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] text-sm"
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
                  {pwSaving ? "Saving..." : "Save password"}
                </Button>
              </div>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(confirming)}
        title={confirming ? `Delete ${confirming.name}?` : "Delete client?"}
        description="The client will be removed from view. You can undo this action for a short time."
        confirmLabel="Delete client"
        onCancel={() => setConfirming(null)}
        onConfirm={confirmRemove}
        busy={busy}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.length} client${selectedIds.length === 1 ? "" : "s"}?`}
        description="Clients will be removed from view. You can undo this action for a short time."
        confirmLabel="Delete"
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        busy={bulkDeleting}
      />
    </div>
  );
}
