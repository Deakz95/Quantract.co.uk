"use client";

import { Button } from "@/components/ui/button";

type Client = {
  id: string;
  name: string;
  email: string;
};

type Contact = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  isPrimary?: boolean;
  preferredChannel?: string;
  notes?: string;
  clientId?: string;
};

type ContactFormProps = {
  form: Partial<Contact>;
  setForm: React.Dispatch<React.SetStateAction<Partial<Contact>>>;
  clients: Client[];
  onSave: () => void;
  onClear: () => void;
  busy: boolean;
  isEditing: boolean;
};

const preferredChannelOptions = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
];

export function ContactForm({ form, setForm, clients, onSave, onClear, busy, isEditing }: ContactFormProps) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-[var(--muted-foreground)]">First name *</span>
          <input
            className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] text-sm"
            value={form.firstName ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
            placeholder="John"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-[var(--muted-foreground)]">Last name *</span>
          <input
            className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] text-sm"
            value={form.lastName ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
            placeholder="Smith"
          />
        </label>
      </div>

      <label className="grid gap-1">
        <span className="text-xs font-semibold text-[var(--muted-foreground)]">Email</span>
        <input
          type="email"
          className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] text-sm"
          value={form.email ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          placeholder="john@example.com"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-[var(--muted-foreground)]">Phone</span>
          <input
            type="tel"
            className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] text-sm"
            value={form.phone ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="020 1234 5678"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-[var(--muted-foreground)]">Mobile</span>
          <input
            type="tel"
            className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] text-sm"
            value={form.mobile ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
            placeholder="07700 123456"
          />
        </label>
      </div>

      <label className="grid gap-1">
        <span className="text-xs font-semibold text-[var(--muted-foreground)]">Job title</span>
        <input
          className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] text-sm"
          value={form.jobTitle ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))}
          placeholder="Project Manager"
        />
      </label>

      <label className="grid gap-1">
        <span className="text-xs font-semibold text-[var(--muted-foreground)]">Client</span>
        <select
          className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] text-sm"
          value={form.clientId ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))}
        >
          <option value="">No client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1">
        <span className="text-xs font-semibold text-[var(--muted-foreground)]">Preferred contact method</span>
        <select
          className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] text-sm"
          value={form.preferredChannel ?? "email"}
          onChange={(e) => setForm((p) => ({ ...p, preferredChannel: e.target.value }))}
        >
          {preferredChannelOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(form.isPrimary)}
          onChange={(e) => setForm((p) => ({ ...p, isPrimary: e.target.checked }))}
        />
        <span className="text-[var(--foreground)]">Primary contact for client</span>
      </label>

      <label className="grid gap-1">
        <span className="text-xs font-semibold text-[var(--muted-foreground)]">Notes</span>
        <textarea
          className="min-h-[80px] rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] text-sm"
          value={form.notes ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="Additional notes about this contact..."
        />
      </label>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onClear}>
          Clear
        </Button>
        <Button type="button" onClick={onSave} disabled={busy}>
          {busy ? "Saving..." : isEditing ? "Save" : "Create"}
        </Button>
      </div>
    </div>
  );
}
