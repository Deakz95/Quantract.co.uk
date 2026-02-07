"use client";

/**
 * Installation Details section — overview / client / site info.
 * Used by EICR ("overview"), EIC ("overview"), MWC ("overview").
 *
 * Renders all overview fields generically — no cert-type conditionals.
 * Each cert type's Zod schema determines which fields exist in data;
 * this component renders them if present.
 */

import { Input, Label, NativeSelect, Textarea } from "@quantract/ui";

interface DetailsSectionProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

const PREMISES_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "domestic", label: "Domestic" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
  { value: "agricultural", label: "Agricultural" },
  { value: "public", label: "Public" },
  { value: "residential", label: "Residential" },
  { value: "educational", label: "Educational" },
  { value: "healthcare", label: "Healthcare" },
  { value: "other", label: "Other" },
];

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function bool(v: unknown): boolean {
  return Boolean(v);
}

export function DetailsSection({ data, onChange }: DetailsSectionProps) {
  const update = (field: string, value: string | boolean) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-5">
      {/* Reference + Date row */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="details-jobReference">Report Reference</Label>
          <Input
            id="details-jobReference"
            value={str(data.jobReference)}
            onChange={(e) => update("jobReference", e.target.value)}
            placeholder="e.g. EICR-2026-001"
          />
        </div>
        <div>
          <Label htmlFor="details-dateOfInspection">Date of Inspection</Label>
          <Input
            id="details-dateOfInspection"
            type="date"
            value={str(data.dateOfInspection)}
            onChange={(e) => update("dateOfInspection", e.target.value)}
          />
        </div>
      </div>

      {/* Client + Occupier */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="details-clientName">Client Name</Label>
          <Input
            id="details-clientName"
            value={str(data.clientName)}
            onChange={(e) => update("clientName", e.target.value)}
            placeholder="Client or company name"
          />
        </div>
        <div>
          <Label htmlFor="details-occupier">Occupier</Label>
          <Input
            id="details-occupier"
            value={str(data.occupier)}
            onChange={(e) => update("occupier", e.target.value)}
            placeholder="Occupier name (if different)"
          />
        </div>
      </div>

      {/* Address */}
      <div>
        <Label htmlFor="details-installationAddress">Installation Address</Label>
        <Textarea
          id="details-installationAddress"
          value={str(data.installationAddress)}
          onChange={(e) => update("installationAddress", e.target.value)}
          placeholder="Full address of the installation"
          className="min-h-[80px]"
        />
      </div>

      {/* Premises + Age of wiring */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="details-descriptionOfPremises">Description of Premises</Label>
          <NativeSelect
            id="details-descriptionOfPremises"
            value={str(data.descriptionOfPremises)}
            onChange={(e) => update("descriptionOfPremises", e.target.value)}
          >
            {PREMISES_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="details-estimatedAgeOfWiring">Estimated Age of Wiring</Label>
          <Input
            id="details-estimatedAgeOfWiring"
            value={str(data.estimatedAgeOfWiring)}
            onChange={(e) => update("estimatedAgeOfWiring", e.target.value)}
            placeholder="e.g. 15 years"
          />
        </div>
      </div>

      {/* Last inspection + Previous ref */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="details-dateOfLastInspection">Date of Last Inspection</Label>
          <Input
            id="details-dateOfLastInspection"
            type="date"
            value={str(data.dateOfLastInspection)}
            onChange={(e) => update("dateOfLastInspection", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="details-previousReportReference">Previous Report Reference</Label>
          <Input
            id="details-previousReportReference"
            value={str(data.previousReportReference)}
            onChange={(e) => update("previousReportReference", e.target.value)}
            placeholder="Reference of previous report"
          />
        </div>
      </div>

      {/* Purpose of report */}
      <div>
        <Label htmlFor="details-purposeOfReport">Purpose of Report</Label>
        <Input
          id="details-purposeOfReport"
          value={str(data.purposeOfReport)}
          onChange={(e) => update("purposeOfReport", e.target.value)}
          placeholder="e.g. Periodic inspection, Change of tenancy, Mortgage survey"
        />
      </div>

      {/* Evidence of alterations */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="details-evidenceOfAlterations"
          checked={bool(data.evidenceOfAlterations)}
          onChange={(e) => update("evidenceOfAlterations", e.target.checked)}
          className="w-5 h-5 rounded accent-[var(--primary)]"
        />
        <Label htmlFor="details-evidenceOfAlterations" className="mb-0">
          Evidence of alterations or additions
        </Label>
      </div>
      {bool(data.evidenceOfAlterations) && (
        <div>
          <Label htmlFor="details-alterationsDetails">Details of Alterations</Label>
          <Textarea
            id="details-alterationsDetails"
            value={str(data.alterationsDetails)}
            onChange={(e) => update("alterationsDetails", e.target.value)}
            placeholder="Describe any alterations or additions observed..."
            className="min-h-[60px]"
          />
        </div>
      )}

      {/* Records available */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="details-recordsAvailable"
          checked={bool(data.recordsAvailable)}
          onChange={(e) => update("recordsAvailable", e.target.checked)}
          className="w-5 h-5 rounded accent-[var(--primary)]"
        />
        <Label htmlFor="details-recordsAvailable" className="mb-0">
          Previous records available
        </Label>
      </div>
    </div>
  );
}
