"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import { apiRequest, getApiErrorMessage, requireOk } from "@/lib/apiClient";

type DealStage = {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  probability: number | null;
  isWon: boolean;
  isLost: boolean;
};

type Deal = {
  id: string;
  title: string;
  value: number;
  probability: number | null;
  expectedCloseDate: string | null;
  closedAt: string | null;
  lostReason: string | null;
  notes: string | null;
  source: string;
  stage: DealStage;
  stageId?: string;
  contactId?: string | null;
  clientId?: string | null;
  ownerId?: string | null;
  contact?: { id: string; firstName: string; lastName: string };
  client?: { id: string; name: string };
  owner?: { id: string; name: string };
};

type Client = {
  id: string;
  name: string;
};

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
};

type User = {
  id: string;
  name: string;
  email: string;
};

type DealFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  stages: DealStage[];
  onSuccess: () => void;
};

const emptyForm = {
  title: "",
  value: "",
  probability: "",
  expectedCloseDate: "",
  stageId: "",
  contactId: "",
  clientId: "",
  ownerId: "",
  notes: "",
  source: "",
};

export default function DealForm({ open, onOpenChange, deal, stages, onSuccess }: DealFormProps) {
  const { toast } = useToast();
  const isEditing = Boolean(deal);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Reset form when deal changes or dialog opens
  useEffect(() => {
    if (open) {
      if (deal) {
        setForm({
          title: deal.title || "",
          value: deal.value?.toString() || "",
          probability: deal.probability?.toString() || "",
          expectedCloseDate: deal.expectedCloseDate
            ? new Date(deal.expectedCloseDate).toISOString().split("T")[0]
            : "",
          stageId: deal.stage?.id || deal.stageId || "",
          contactId: deal.contact?.id || deal.contactId || "",
          clientId: deal.client?.id || deal.clientId || "",
          ownerId: deal.owner?.id || deal.ownerId || "",
          notes: deal.notes || "",
          source: deal.source || "",
        });
      } else {
        setForm({
          ...emptyForm,
          stageId: stages[0]?.id || "",
        });
      }
    }
  }, [open, deal, stages]);

  // Load dropdown options when dialog opens
  useEffect(() => {
    if (!open) return;

    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const [clientsRes, usersRes] = await Promise.all([
          apiRequest<{ ok: boolean; clients?: Client[]; error?: string }>("/api/admin/clients"),
          apiRequest<{ ok: boolean; users?: User[]; error?: string }>("/api/admin/users"),
        ]);

        if (clientsRes.ok && clientsRes.clients) {
          setClients(clientsRes.clients);
        }

        if (usersRes.ok && usersRes.users) {
          setUsers(usersRes.users);
        }

        // Try to load contacts if endpoint exists
        try {
          const contactsRes = await apiRequest<{ ok: boolean; contacts?: Contact[]; error?: string }>("/api/admin/contacts");
          if (contactsRes.ok && contactsRes.contacts) {
            setContacts(contactsRes.contacts);
          }
        } catch {
          // Contacts endpoint may not exist
        }
      } catch (error) {
        // Non-critical - just log
        console.error("Failed to load form options:", error);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, [open]);

  const handleChange = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    if (!form.stageId) {
      toast({ title: "Stage is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        value: form.value ? parseFloat(form.value) : 0,
        probability: form.probability ? parseInt(form.probability, 10) : null,
        expectedCloseDate: form.expectedCloseDate || null,
        stageId: form.stageId,
        contactId: form.contactId || null,
        clientId: form.clientId || null,
        ownerId: form.ownerId || null,
        notes: form.notes.trim() || null,
        source: form.source.trim() || null,
      };

      const url = isEditing ? `/api/admin/deals/${deal!.id}` : "/api/admin/deals";
      const method = isEditing ? "PATCH" : "POST";

      const res = await apiRequest<{ ok: boolean; error?: string }>(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      requireOk(res, `Failed to ${isEditing ? "update" : "create"} deal`);
      toast({ title: `Deal ${isEditing ? "updated" : "created"}`, variant: "success" });
      onSuccess();
    } catch (error) {
      toast({
        title: getApiErrorMessage(error, `Failed to ${isEditing ? "update" : "create"} deal`),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [form, isEditing, deal, toast, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Deal" : "Create Deal"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update deal details" : "Add a new deal to your pipeline"}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Deal title"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
              />
            </div>

            {/* Value & Probability */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
                  Value
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.value}
                  onChange={(e) => handleChange("value", e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
                  Probability (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.probability}
                  onChange={(e) => handleChange("probability", e.target.value)}
                  placeholder="50"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
              </div>
            </div>

            {/* Stage & Expected Close Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
                  Stage <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.stageId}
                  onChange={(e) => handleChange("stageId", e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                >
                  <option value="">Select stage</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
                  Expected Close
                </label>
                <input
                  type="date"
                  value={form.expectedCloseDate}
                  onChange={(e) => handleChange("expectedCloseDate", e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                />
              </div>
            </div>

            {/* Client */}
            <div>
              <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
                Client
              </label>
              <select
                value={form.clientId}
                onChange={(e) => handleChange("clientId", e.target.value)}
                disabled={loadingOptions}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
              >
                <option value="">Select client (optional)</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Contact (if available) */}
            {contacts.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
                  Contact
                </label>
                <select
                  value={form.contactId}
                  onChange={(e) => handleChange("contactId", e.target.value)}
                  disabled={loadingOptions}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                >
                  <option value="">Select contact (optional)</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.firstName} {contact.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Owner */}
            <div>
              <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
                Owner
              </label>
              <select
                value={form.ownerId}
                onChange={(e) => handleChange("ownerId", e.target.value)}
                disabled={loadingOptions}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
              >
                <option value="">Select owner (optional)</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Source */}
            <div>
              <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
                Source
              </label>
              <input
                type="text"
                value={form.source}
                onChange={(e) => handleChange("source", e.target.value)}
                placeholder="e.g., Website, Referral, Cold Call"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] resize-none"
              />
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
