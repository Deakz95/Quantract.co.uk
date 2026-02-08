"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription, Input, Label } from "@quantract/ui";
import { SignatureField } from "./signatures/SignatureField";
import type { SignatureValue } from "@quantract/shared/certificate-types";

interface SignatoryBlock {
  name: string;
  qualifications: string;
  registrationNumber: string;
  dateSigned: string;
  complianceConfirmed: boolean;
}

interface EICSignatorySectionProps {
  designSection: SignatoryBlock;
  constructionSection: SignatoryBlock;
  inspectionSection: SignatoryBlock;
  sameAsDesigner: boolean;
  designSignature: SignatureValue | null;
  constructionSignature: SignatureValue | null;
  inspectionSignature: SignatureValue | null;
  onDesignChange: (data: SignatoryBlock) => void;
  onConstructionChange: (data: SignatoryBlock) => void;
  onInspectionChange: (data: SignatoryBlock) => void;
  onSameAsDesignerChange: (value: boolean) => void;
  onDesignSignatureChange: (value: SignatureValue | null) => void;
  onConstructionSignatureChange: (value: SignatureValue | null) => void;
  onInspectionSignatureChange: (value: SignatureValue | null) => void;
}

function SignatoryBlockForm({
  title,
  description,
  complianceText,
  data,
  onChange,
  signatureValue,
  onSignatureChange,
  disabled,
  signatureId,
}: {
  title: string;
  description: string;
  complianceText: string;
  data: SignatoryBlock;
  onChange: (data: SignatoryBlock) => void;
  signatureValue: SignatureValue | null;
  onSignatureChange: (value: SignatureValue | null) => void;
  disabled?: boolean;
  signatureId: string;
}) {
  const update = (field: keyof SignatoryBlock, value: string | boolean) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <Card className={disabled ? "opacity-60 pointer-events-none" : ""}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Name</Label>
            <Input
              value={data.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div>
            <Label>Qualifications</Label>
            <Input
              value={data.qualifications}
              onChange={(e) => update("qualifications", e.target.value)}
              placeholder="e.g. C&G 2391, 18th Edition"
            />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Registration Number</Label>
            <Input
              value={data.registrationNumber}
              onChange={(e) => update("registrationNumber", e.target.value)}
              placeholder="Scheme registration number"
            />
          </div>
          <div>
            <Label>Date Signed</Label>
            <Input
              type="date"
              value={data.dateSigned}
              onChange={(e) => update("dateSigned", e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30">
          <input
            type="checkbox"
            checked={data.complianceConfirmed}
            onChange={(e) => update("complianceConfirmed", e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-[var(--primary)]"
          />
          <p className="text-sm text-[var(--foreground)]">{complianceText}</p>
        </div>
        <SignatureField
          signatureId={signatureId}
          label={`${title} Signature`}
          value={signatureValue}
          onChange={onSignatureChange}
        />
      </CardContent>
    </Card>
  );
}

export function EICSignatorySection({
  designSection,
  constructionSection,
  inspectionSection,
  sameAsDesigner,
  designSignature,
  constructionSignature,
  inspectionSignature,
  onDesignChange,
  onConstructionChange,
  onInspectionChange,
  onSameAsDesignerChange,
  onDesignSignatureChange,
  onConstructionSignatureChange,
  onInspectionSignatureChange,
}: EICSignatorySectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Design, Construction & Inspection</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Per BS 7671, the EIC requires separate declarations from the designer, constructor, and inspector
        </p>
      </div>

      {/* Same as designer toggle */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <input
          type="checkbox"
          id="sameAsDesigner"
          checked={sameAsDesigner}
          onChange={(e) => {
            const checked = e.target.checked;
            onSameAsDesignerChange(checked);
            if (checked) {
              onConstructionChange({ ...designSection });
              onInspectionChange({ ...designSection });
              onConstructionSignatureChange(designSignature);
              onInspectionSignatureChange(designSignature);
            }
          }}
          className="w-5 h-5 rounded accent-[var(--primary)]"
        />
        <div>
          <Label htmlFor="sameAsDesigner" className="mb-0 font-medium">Same person for all roles</Label>
          <p className="text-xs text-[var(--muted-foreground)]">
            Check this if one person is responsible for design, construction, and inspection
          </p>
        </div>
      </div>

      <SignatoryBlockForm
        title="Design"
        description="Details of the person responsible for the design of the electrical installation"
        complianceText="I being the person responsible for the design of the electrical installation (as indicated by my signature), particulars of which are described above, having exercised reasonable skill and care when carrying out the design, hereby CERTIFY that the design work for which I have been responsible is to the best of my knowledge and belief in accordance with BS 7671:2018+A2:2022, except for the departures, if any, stated in this certificate."
        data={designSection}
        onChange={(data) => {
          onDesignChange(data);
          if (sameAsDesigner) {
            onConstructionChange({ ...data });
            onInspectionChange({ ...data });
          }
        }}
        signatureValue={designSignature}
        onSignatureChange={(sig) => {
          onDesignSignatureChange(sig);
          if (sameAsDesigner) {
            onConstructionSignatureChange(sig);
            onInspectionSignatureChange(sig);
          }
        }}
        signatureId="designer"
      />

      <SignatoryBlockForm
        title="Construction (Installation)"
        description="Details of the person responsible for the construction of the electrical installation"
        complianceText="I being the person responsible for the construction of the electrical installation (as indicated by my signature), particulars of which are described above, having exercised reasonable skill and care when carrying out the construction, hereby CERTIFY that the construction work for which I have been responsible is to the best of my knowledge and belief in accordance with BS 7671:2018+A2:2022, except for the departures, if any, stated in this certificate."
        data={constructionSection}
        onChange={onConstructionChange}
        signatureValue={constructionSignature}
        onSignatureChange={onConstructionSignatureChange}
        disabled={sameAsDesigner}
        signatureId="installer"
      />

      <SignatoryBlockForm
        title="Inspection & Testing"
        description="Details of the person responsible for the inspection and testing of the electrical installation"
        complianceText="I being the person responsible for the inspection and testing of the electrical installation (as indicated by my signature), particulars of which are described above, having exercised reasonable skill and care when carrying out the inspection and testing, hereby CERTIFY that the inspection and testing for which I have been responsible is to the best of my knowledge and belief in accordance with BS 7671:2018+A2:2022, except for the departures, if any, stated in this certificate."
        data={inspectionSection}
        onChange={onInspectionChange}
        signatureValue={inspectionSignature}
        onSignatureChange={onInspectionSignatureChange}
        disabled={sameAsDesigner}
        signatureId="inspector"
      />
    </div>
  );
}
