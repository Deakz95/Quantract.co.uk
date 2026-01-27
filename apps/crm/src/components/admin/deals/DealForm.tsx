"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import { apiRequest, getApiErrorMessage, requireOk } from "@/lib/apiClient";
import { FormField, FormInput, FormSelect, FormTextarea, LoadingSpinner } from "@/components/ui/FormField";
import { useFormValidation, type ValidationSchema } from "@/hooks/useFormValidation";

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

type DealFormValues = {
  title: string;
  value: string;
  probability: string;
  expectedCloseDate: string;
  stageId: string;
  contactId: string;
  clientId: string;
  ownerId: string;
  notes: string;
  source: string;
};

const emptyForm: DealFormValues = {
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

// Validation schema for deal form
const validationSchema: ValidationSchema = {
  title: { required: "Title is required" },
  stageId: { required: "Stage is required" },
};

export default function DealForm({ open, onOpenChange, deal, stages, onSuccess }: DealFormProps) {
  const { toast } = useToast();
  const isEditing = Boolean(deal);

  const [form, setForm] = useState<DealFormValues>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const { errors, touched, validateField, validateAll, setFieldTouched, clearErrors } = useFormValidation<DealFormValues>(validationSchema);

  // Reset form when deal changes or dialog opens
  useEffect(() => {
    if (open) {
      clearErrors();
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
  }, [open, deal, stages, clearErrors]);

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

  const handleChange = useCallback((field: keyof DealFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleBlur = useCallback(
    (field: keyof DealFormValues) => {
      setFieldTouched(field);
      validateField(field, form[field]);
    },
    [form, setFieldTouched, validateField]
  );

  // Check if form is valid for submission
  const canSubmit = useMemo(() => {
    const title = form.title.trim();
    const stageId = form.stageId;
    return Boolean(title && stageId);
  }, [form.title, form.stageId]);

  const handleSubmit = useCallback(async () => {
    const formIsValid = validateAll(form);
    if (!formIsValid) {
      toast({ title: "Please fix the errors before saving", variant: "destructive" });
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
  }, [form, isEditing, deal, toast, onSuccess, validateAll]);

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
            <FormField
              label="Title"
              required
              error={errors.title}
              touched={touched.title}
              htmlFor="deal-title"
            >
              <FormInput
                id="deal-title"
                type="text"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                onBlur={() => handleBlur("title")}
                placeholder="Deal title"
                hasError={Boolean(errors.title && touched.title)}
                className="w-full"
              />
            </FormField>

            {/* Value & Probability */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Value" htmlFor="deal-value">
                <FormInput
                  id="deal-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.value}
                  onChange={(e) => handleChange("value", e.target.value)}
                  placeholder="0.00"
                  className="w-full"
                />
              </FormField>
              <FormField label="Probability (%)" htmlFor="deal-probability">
                <FormInput
                  id="deal-probability"
                  type="number"
                  min="0"
                  max="100"
                  value={form.probability}
                  onChange={(e) => handleChange("probability", e.target.value)}
                  placeholder="50"
                  className="w-full"
                />
              </FormField>
            </div>

            {/* Stage & Expected Close Date */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Stage"
                required
                error={errors.stageId}
                touched={touched.stageId}
                htmlFor="deal-stage"
              >
                <FormSelect
                  id="deal-stage"
                  value={form.stageId}
                  onChange={(e) => handleChange("stageId", e.target.value)}
                  onBlur={() => handleBlur("stageId")}
                  hasError={Boolean(errors.stageId && touched.stageId)}
                  className="w-full"
                >
                  <option value="">Select stage</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
              <FormField label="Expected Close" htmlFor="deal-expectedClose">
                <FormInput
                  id="deal-expectedClose"
                  type="date"
                  value={form.expectedCloseDate}
                  onChange={(e) => handleChange("expectedCloseDate", e.target.value)}
                  className="w-full"
                />
              </FormField>
            </div>

            {/* Client */}
            <FormField label="Client" htmlFor="deal-client">
              <FormSelect
                id="deal-client"
                value={form.clientId}
                onChange={(e) => handleChange("clientId", e.target.value)}
                disabled={loadingOptions}
                className="w-full"
              >
                <option value="">Select client (optional)</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </FormSelect>
            </FormField>

            {/* Contact (if available) */}
            {contacts.length > 0 && (
              <FormField label="Contact" htmlFor="deal-contact">
                <FormSelect
                  id="deal-contact"
                  value={form.contactId}
                  onChange={(e) => handleChange("contactId", e.target.value)}
                  disabled={loadingOptions}
                  className="w-full"
                >
                  <option value="">Select contact (optional)</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.firstName} {contact.lastName}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
            )}

            {/* Owner */}
            <FormField label="Owner" htmlFor="deal-owner">
              <FormSelect
                id="deal-owner"
                value={form.ownerId}
                onChange={(e) => handleChange("ownerId", e.target.value)}
                disabled={loadingOptions}
                className="w-full"
              >
                <option value="">Select owner (optional)</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </FormSelect>
            </FormField>

            {/* Source */}
            <FormField label="Source" htmlFor="deal-source">
              <FormInput
                id="deal-source"
                type="text"
                value={form.source}
                onChange={(e) => handleChange("source", e.target.value)}
                placeholder="e.g., Website, Referral, Cold Call"
                className="w-full"
              />
            </FormField>

            {/* Notes */}
            <FormField label="Notes" htmlFor="deal-notes">
              <FormTextarea
                id="deal-notes"
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                className="w-full resize-none"
              />
            </FormField>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !canSubmit}>
            {saving ? (
              <>
                <LoadingSpinner className="mr-2" />
                Saving...
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Create Deal"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
