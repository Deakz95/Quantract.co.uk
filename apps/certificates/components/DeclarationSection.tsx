"use client";

import { Input, Label } from "@quantract/ui";
import { SubCard } from "./ui/SubCard";
import { SignatureField } from "./signatures/SignatureField";
import type { SignatureValue } from "@quantract/shared/certificate-types";

interface DeclarationSectionProps {
  role: "inspector" | "installer" | "designer";
  data: {
    inspectorName: string;
    inspectorQualifications: string;
    inspectorPosition: string;
    inspectorDateSigned: string;
    complianceConfirmed: boolean;
  };
  onChange: (data: DeclarationSectionProps["data"]) => void;
  signatureValue?: SignatureValue | null;
  onSignatureChange?: (sig: SignatureValue | null) => void;
}

const ROLE_LABELS: Record<DeclarationSectionProps["role"], string> = {
  inspector: "Inspector",
  installer: "Installer",
  designer: "Designer",
};

const DECLARATION_TEXT =
  "I/We, being the person(s) responsible for the inspection and testing of the " +
  "electrical installation (as indicated by my/our signatures below), particulars of " +
  "which are described above, having exercised reasonable skill and care when carrying " +
  "out the inspection and testing, hereby declare that the information in this report, " +
  "including the observations and the attached schedules, provides an accurate assessment " +
  "of the condition of the electrical installation taking into account the stated extent " +
  "and limitations, in accordance with BS 7671 (Requirements for Electrical Installations) " +
  "as amended.";

export function DeclarationSection({
  role,
  data,
  onChange,
  signatureValue,
  onSignatureChange,
}: DeclarationSectionProps) {
  const updateField = <K extends keyof DeclarationSectionProps["data"]>(
    field: K,
    value: DeclarationSectionProps["data"][K],
  ) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Legal text */}
      <SubCard title="Legal Declaration" accentColor="#06b6d4">
        <p className="text-sm text-gray-400 leading-relaxed">
          {DECLARATION_TEXT}
        </p>
      </SubCard>

      {/* Signatory details */}
      <SubCard title="Signatory Details">
        <div className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${role}-name`}>Name</Label>
              <Input
                id={`${role}-name`}
                value={data.inspectorName}
                onChange={(e) => updateField("inspectorName", e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label htmlFor={`${role}-qualifications`}>Qualifications</Label>
              <Input
                id={`${role}-qualifications`}
                value={data.inspectorQualifications}
                onChange={(e) => updateField("inspectorQualifications", e.target.value)}
                placeholder="e.g. City & Guilds 2391"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${role}-position`}>Position</Label>
              <Input
                id={`${role}-position`}
                value={data.inspectorPosition}
                onChange={(e) => updateField("inspectorPosition", e.target.value)}
                placeholder="e.g. Qualified Supervisor"
              />
            </div>
            <div>
              <Label htmlFor={`${role}-dateSigned`}>Date Signed</Label>
              <Input
                id={`${role}-dateSigned`}
                type="date"
                value={data.inspectorDateSigned}
                onChange={(e) => updateField("inspectorDateSigned", e.target.value)}
              />
            </div>
          </div>

          {/* Compliance checkbox */}
          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id={`${role}-complianceConfirmed`}
              checked={data.complianceConfirmed}
              onChange={(e) => updateField("complianceConfirmed", e.target.checked)}
              className="w-5 h-5 rounded accent-blue-500"
            />
            <Label htmlFor={`${role}-complianceConfirmed`} className="mb-0">
              I confirm compliance with BS 7671
            </Label>
          </div>
        </div>
      </SubCard>

      {/* Signature */}
      {onSignatureChange && (
        <SignatureField
          signatureId={role}
          label={`${ROLE_LABELS[role]} Signature`}
          value={signatureValue}
          onChange={onSignatureChange}
        />
      )}
    </div>
  );
}

export type { DeclarationSectionProps };
