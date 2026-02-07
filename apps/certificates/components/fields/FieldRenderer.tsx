"use client";

import { Input, Label, NativeSelect, Textarea } from "@quantract/ui";

// ── Field configuration types ──

export interface FieldOption {
  value: string;
  label: string;
  description?: string;
}

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "checkboxGroup"
  | "date";

export interface FieldConfig {
  /** Unique field identifier — used as HTML id and data path */
  id: string;
  /** Display label */
  label: string;
  /** Input type */
  type: FieldType;
  /** Placeholder text (text/textarea/number) */
  placeholder?: string;
  /** Options for select, radio, or checkboxGroup */
  options?: FieldOption[];
  /** Grid column span (1-3, default 1) */
  colSpan?: 1 | 2 | 3;
  /** HTML input type override (e.g. "tel", "email") */
  inputType?: string;
  /** Show field only when condition is met: { field, value } */
  showWhen?: { field: string; value: unknown };
  /** Helper text below the input */
  helpText?: string;
}

// ── Field group (row of fields) ──

export interface FieldGroup {
  /** Grid columns for this row (default 2) */
  columns?: 1 | 2 | 3;
  /** Fields in this row */
  fields: FieldConfig[];
}

// ── Props ──

interface FieldRendererProps {
  field: FieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Full section data — used for showWhen conditional checks */
  allData?: Record<string, unknown>;
}

interface FieldGroupRendererProps {
  group: FieldGroup;
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}

// ── Component: Single Field ──

export function FieldRenderer({ field, value, onChange, allData }: FieldRendererProps) {
  // Conditional visibility
  if (field.showWhen && allData) {
    const conditionValue = allData[field.showWhen.field];
    if (conditionValue !== field.showWhen.value) return null;
  }

  switch (field.type) {
    case "text":
    case "number":
      return (
        <div>
          <Label htmlFor={field.id}>{field.label}</Label>
          <Input
            id={field.id}
            type={field.inputType ?? field.type}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
          {field.helpText && (
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{field.helpText}</p>
          )}
        </div>
      );

    case "date":
      return (
        <div>
          <Label htmlFor={field.id}>{field.label}</Label>
          <Input
            id={field.id}
            type="date"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.helpText && (
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{field.helpText}</p>
          )}
        </div>
      );

    case "textarea":
      return (
        <div>
          <Label htmlFor={field.id}>{field.label}</Label>
          <Textarea
            id={field.id}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="min-h-[80px]"
          />
          {field.helpText && (
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{field.helpText}</p>
          )}
        </div>
      );

    case "select":
      return (
        <div>
          <Label htmlFor={field.id}>{field.label}</Label>
          <NativeSelect
            id={field.id}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </NativeSelect>
          {field.helpText && (
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{field.helpText}</p>
          )}
        </div>
      );

    case "radio":
      return (
        <div className="space-y-3">
          <Label>{field.label}</Label>
          {field.options?.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                value === opt.value
                  ? "border-[var(--primary)] bg-[var(--primary)]/5"
                  : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
              }`}
            >
              <input
                type="radio"
                name={field.id}
                value={opt.value}
                checked={value === opt.value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-1 w-4 h-4 accent-[var(--primary)]"
              />
              <div>
                <p className="font-medium text-[var(--foreground)]">{opt.label}</p>
                {opt.description && (
                  <p className="text-xs text-[var(--muted-foreground)]">{opt.description}</p>
                )}
              </div>
            </label>
          ))}
          {field.helpText && (
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{field.helpText}</p>
          )}
        </div>
      );

    case "checkbox":
      return (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id={field.id}
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="w-5 h-5 rounded accent-[var(--primary)]"
          />
          <Label htmlFor={field.id} className="mb-0">
            {field.label}
          </Label>
        </div>
      );

    case "checkboxGroup":
      return (
        <div className="space-y-2">
          <Label>{field.label}</Label>
          <div className="grid md:grid-cols-3 gap-3">
            {field.options?.map((opt) => {
              const groupValue = (value ?? {}) as Record<string, boolean>;
              return (
                <div key={opt.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`${field.id}-${opt.value}`}
                    checked={Boolean(groupValue[opt.value])}
                    onChange={(e) =>
                      onChange({ ...groupValue, [opt.value]: e.target.checked })
                    }
                    className="w-4 h-4 rounded accent-[var(--primary)]"
                  />
                  <Label htmlFor={`${field.id}-${opt.value}`} className="mb-0 text-sm">
                    {opt.label}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      );

    default:
      return null;
  }
}

// ── Component: Field Group (row of fields in a grid) ──

export function FieldGroupRenderer({ group, data, onChange }: FieldGroupRendererProps) {
  const cols = group.columns ?? 2;
  const gridClass =
    cols === 1
      ? ""
      : cols === 2
        ? "grid md:grid-cols-2 gap-4"
        : "grid md:grid-cols-3 gap-4";

  // Check if all fields are hidden
  const visibleFields = group.fields.filter((f) => {
    if (!f.showWhen) return true;
    return data[f.showWhen.field] === f.showWhen.value;
  });

  if (visibleFields.length === 0) return null;

  // Single field or checkbox — no grid wrapper
  if (visibleFields.length === 1 && (visibleFields[0].type === "checkbox" || visibleFields[0].colSpan === 3)) {
    const f = visibleFields[0];
    return (
      <FieldRenderer
        field={f}
        value={data[f.id]}
        onChange={(v) => onChange(f.id, v)}
        allData={data}
      />
    );
  }

  return (
    <div className={gridClass}>
      {group.fields.map((f) => (
        <FieldRenderer
          key={f.id}
          field={f}
          value={data[f.id]}
          onChange={(v) => onChange(f.id, v)}
          allData={data}
        />
      ))}
    </div>
  );
}
