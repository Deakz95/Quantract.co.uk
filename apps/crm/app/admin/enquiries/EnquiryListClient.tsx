"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/useToast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { apiRequest, requireOk } from "@/lib/apiClient";
import Link from "next/link";

type Enquiry = {
  id: string;
  companyId: string;
  stageId: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  stageName: string;
  stageColor?: string;
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  valueEstimate?: number;
  quoteId?: string;
  createdAt: string;
  updatedAt: string;
};

type Stage = {
  id: string;
  name: string;
  color?: string;
  sortOrder: number;
};

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

export function EnquiryListClient() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Enquiry | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
    valueEstimate: "",
    stageId: "",
    ownerId: "",
  });

  const [confirmingDelete, setConfirmingDelete] = useState<Enquiry | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const [enquiriesRes, stagesRes, usersRes] = await Promise.all([
        apiRequest<{ ok: boolean; enquiries: Enquiry[] }>("/api/admin/enquiries", { cache: "no-store" }),
        apiRequest<{ ok: boolean; data: Stage[] }>("/api/admin/stages", { cache: "no-store" }),
        apiRequest<{ ok: boolean; data: User[] }>("/api/admin/users", { cache: "no-store" }),
      ]);

      requireOk(enquiriesRes);
      requireOk(stagesRes);
      requireOk(usersRes);

      setEnquiries(enquiriesRes.enquiries || []);
      setStages(stagesRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error: any) {
      setLoadError(error?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateDialog = () => {
    setEditing(null);
    const firstStage = stages[0];
    setForm({
      name: "",
      email: "",
      phone: "",
      notes: "",
      valueEstimate: "",
      stageId: firstStage?.id || "",
      ownerId: "",
    });
    setEditDialogOpen(true);
  };

  const openEditDialog = (enquiry: Enquiry) => {
    setEditing(enquiry);
    setForm({
      name: enquiry.name || "",
      email: enquiry.email || "",
      phone: enquiry.phone || "",
      notes: enquiry.notes || "",
      valueEstimate: enquiry.valueEstimate ? String(enquiry.valueEstimate) : "",
      stageId: enquiry.stageId,
      ownerId: enquiry.ownerId || "",
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.stageId) {
      toast({ title: "Error", description: "Please select a stage", variant: "destructive" });
      return;
    }

    setBusy(true);

    try {
      const payload: any = {
        stageId: form.stageId,
        name: form.name || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
        valueEstimate: form.valueEstimate ? Number(form.valueEstimate) : undefined,
        ownerId: form.ownerId || undefined,
      };

      if (editing) {
        const res = await apiRequest<{ ok: boolean; enquiry: Enquiry }>(`/api/admin/enquiries/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        });
        requireOk(res);
        toast({ title: "Success", description: "Enquiry updated successfully" });
      } else {
        const res = await apiRequest<{ ok: boolean; enquiry: Enquiry }>("/api/admin/enquiries", {
          method: "POST",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        });
        requireOk(res);
        toast({ title: "Success", description: "Enquiry created successfully" });
      }

      setEditDialogOpen(false);
      void loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to save enquiry", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (enquiry: Enquiry) => {
    setBusy(true);

    try {
      await apiRequest(`/api/admin/enquiries/${enquiry.id}`, { method: "DELETE" });
      toast({ title: "Success", description: "Enquiry deleted successfully" });
      setConfirmingDelete(null);
      void loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to delete enquiry", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (loadError) {
    const isDbError = loadError.toLowerCase().includes("database") ||
                      loadError.toLowerCase().includes("table") ||
                      loadError.toLowerCase().includes("does not exist");
    return (
      <ErrorState
        title="Unable to load enquiries"
        description={isDbError
          ? "This feature requires database configuration. The enquiries table may not be set up yet."
          : loadError
        }
        helpText="Contact support if this persists: support@quantract.co.uk"
        onRetry={loadData}
        showSupport={true}
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <div />
        <Button onClick={openCreateDialog}>+ New Enquiry</Button>
      </div>

      {enquiries.length === 0 ? (
        <EmptyState
          title="No enquiries yet"
          description="Create your first enquiry to start tracking leads"
          actionLabel="New Enquiry"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="grid gap-4">
          {enquiries.map((enq) => (
            <Card key={enq.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      <Link href={`/admin/enquiries/${enq.id}`} className="hover:underline">
                        {enq.name || enq.email || "Unnamed Enquiry"}
                      </Link>
                    </CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge style={{ backgroundColor: enq.stageColor || "#6b7280", color: "#fff" }}>
                        {enq.stageName || "Unknown"}
                      </Badge>
                      {enq.ownerName && (
                        <Badge variant="outline">Owner: {enq.ownerName}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(enq)}>
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmingDelete(enq)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  {enq.email && <div>Email: {enq.email}</div>}
                  {enq.phone && <div>Phone: {enq.phone}</div>}
                  {enq.valueEstimate && <div>Value: £{enq.valueEstimate}</div>}
                  {enq.notes && <div className="text-muted-foreground">{enq.notes}</div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Enquiry" : "New Enquiry"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">Stage *</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={form.stageId}
                onChange={(e) => setForm({ ...form, stageId: e.target.value })}
              >
                <option value="">Select stage...</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Owner</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={form.ownerId}
                onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
              >
                <option value="">No owner</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="w-full border rounded px-3 py-2"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                className="w-full border rounded px-3 py-2"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Value Estimate (£)</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={form.valueEstimate}
                onChange={(e) => setForm({ ...form, valueEstimate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                className="w-full border rounded px-3 py-2"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={busy}>
              {busy ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmingDelete !== null}
        onCancel={() => setConfirmingDelete(null)}
        title="Delete Enquiry"
        description={`Are you sure you want to delete "${confirmingDelete?.name || confirmingDelete?.email || "this enquiry"}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => confirmingDelete && handleDelete(confirmingDelete)}
        busy={busy}
      />
    </>
  );
}
