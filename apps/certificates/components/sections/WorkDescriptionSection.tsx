"use client";

/**
 * Work Description section.
 * Used by MWC ("workDescription").
 *
 * Renders extent of work dropdown and free-text work description.
 */

import { Label, NativeSelect, Textarea } from "@quantract/ui";

interface WorkDescriptionSectionProps {
  /** Top-level certificate data */
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

const EXTENT_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "addition_to_circuit", label: "Addition to an existing circuit" },
  { value: "repair", label: "Repair to an existing circuit" },
  { value: "replacement", label: "Like-for-like replacement" },
  { value: "other", label: "Other" },
];

export function WorkDescriptionSection({
  data,
  onChange,
}: WorkDescriptionSectionProps) {
  const update = (field: string, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="work-extentOfWork">Extent of Work</Label>
        <NativeSelect
          id="work-extentOfWork"
          value={str(data.extentOfWork)}
          onChange={(e) => update("extentOfWork", e.target.value)}
        >
          {EXTENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div>
        <Label htmlFor="work-workDescription">Work Description</Label>
        <Textarea
          id="work-workDescription"
          value={str(data.workDescription)}
          onChange={(e) => update("workDescription", e.target.value)}
          placeholder="Describe the work carried out, e.g. Installation of additional socket outlet, replacement of light fitting..."
          className="min-h-[150px]"
        />
      </div>
    </div>
  );
}
