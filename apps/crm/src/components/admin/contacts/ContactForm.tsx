"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { FormField, FormInput, FormSelect, FormTextarea, LoadingSpinner } from "@/components/ui/FormField";
import { useFormValidation, type ValidationSchema } from "@/hooks/useFormValidation";

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

// Validation schema for contact form
const validationSchema: ValidationSchema = {
  firstName: { required: "First name is required" },
  lastName: { required: "Last name is required" },
  email: { email: "Please enter a valid email address" },
};

export function ContactForm({ form, setForm, clients, onSave, onClear, busy, isEditing }: ContactFormProps) {
  const { errors, touched, isValid, validateField, validateAll, setFieldTouched, clearErrors } = useFormValidation<Contact>(validationSchema);

  // Validate on form change to keep isValid updated
  useEffect(() => {
    // Only validate fields that have been touched
    if (touched.firstName) validateField("firstName", form.firstName);
    if (touched.lastName) validateField("lastName", form.lastName);
    if (touched.email) validateField("email", form.email);
  }, [form.firstName, form.lastName, form.email, touched, validateField]);

  const handleBlur = useCallback(
    (field: keyof Contact) => {
      setFieldTouched(field);
      validateField(field, form[field]);
    },
    [form, setFieldTouched, validateField]
  );

  const handleClear = useCallback(() => {
    clearErrors();
    onClear();
  }, [clearErrors, onClear]);

  const handleSave = useCallback(() => {
    const formIsValid = validateAll(form as Contact);
    if (formIsValid) {
      onSave();
    }
  }, [form, validateAll, onSave]);

  // Check if form is valid for submission
  const canSubmit = useMemo(() => {
    const firstName = (form.firstName ?? "").trim();
    const lastName = (form.lastName ?? "").trim();
    const email = (form.email ?? "").trim();

    // Required fields must be filled
    if (!firstName || !lastName) return false;

    // If email is provided, it must be valid
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;

    return true;
  }, [form.firstName, form.lastName, form.email]);

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="First name"
          required
          error={errors.firstName}
          touched={touched.firstName}
          htmlFor="firstName"
        >
          <FormInput
            id="firstName"
            value={form.firstName ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
            onBlur={() => handleBlur("firstName")}
            placeholder="John"
            hasError={Boolean(errors.firstName && touched.firstName)}
          />
        </FormField>

        <FormField
          label="Last name"
          required
          error={errors.lastName}
          touched={touched.lastName}
          htmlFor="lastName"
        >
          <FormInput
            id="lastName"
            value={form.lastName ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
            onBlur={() => handleBlur("lastName")}
            placeholder="Smith"
            hasError={Boolean(errors.lastName && touched.lastName)}
          />
        </FormField>
      </div>

      <FormField
        label="Email"
        error={errors.email}
        touched={touched.email}
        htmlFor="email"
      >
        <FormInput
          id="email"
          type="email"
          value={form.email ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          onBlur={() => handleBlur("email")}
          placeholder="john@example.com"
          hasError={Boolean(errors.email && touched.email)}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Phone" htmlFor="phone">
          <FormInput
            id="phone"
            type="tel"
            value={form.phone ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="020 1234 5678"
          />
        </FormField>

        <FormField label="Mobile" htmlFor="mobile">
          <FormInput
            id="mobile"
            type="tel"
            value={form.mobile ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
            placeholder="07700 123456"
          />
        </FormField>
      </div>

      <FormField label="Job title" htmlFor="jobTitle">
        <FormInput
          id="jobTitle"
          value={form.jobTitle ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))}
          placeholder="Project Manager"
        />
      </FormField>

      <FormField label="Client" htmlFor="clientId">
        <FormSelect
          id="clientId"
          value={form.clientId ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))}
        >
          <option value="">No client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </FormSelect>
      </FormField>

      <FormField label="Preferred contact method" htmlFor="preferredChannel">
        <FormSelect
          id="preferredChannel"
          value={form.preferredChannel ?? "email"}
          onChange={(e) => setForm((p) => ({ ...p, preferredChannel: e.target.value }))}
        >
          {preferredChannelOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </FormSelect>
      </FormField>

      <label className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(form.isPrimary)}
          onChange={(e) => setForm((p) => ({ ...p, isPrimary: e.target.checked }))}
        />
        <span className="text-[var(--foreground)]">Primary contact for client</span>
      </label>

      <FormField label="Notes" htmlFor="notes">
        <FormTextarea
          id="notes"
          value={form.notes ?? ""}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="Additional notes about this contact..."
        />
      </FormField>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={handleClear}>
          Clear
        </Button>
        <Button type="button" onClick={handleSave} disabled={busy || !canSubmit}>
          {busy ? (
            <>
              <LoadingSpinner className="mr-2" />
              Saving...
            </>
          ) : isEditing ? (
            "Save"
          ) : (
            "Create"
          )}
        </Button>
      </div>
    </div>
  );
}
