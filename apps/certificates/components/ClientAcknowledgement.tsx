"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Label,
} from "@quantract/ui";
import { SignatureCapture } from "./SignatureCapture";

interface ClientAcknowledgementProps {
  data: {
    clientName: string;
    clientDateSigned: string;
  };
  onChange: (data: ClientAcknowledgementProps["data"]) => void;
  signatureValue?: string | null;
  onSignatureChange?: (sig: string | null) => void;
}

const ACKNOWLEDGEMENT_TEXT =
  "I acknowledge receipt of this Electrical Installation Condition Report, " +
  "which forms part of my records for the electrical installation at the address " +
  "detailed within this report. I have been advised that the observations recorded " +
  "may require remedial action. I understand that any observations classified as C1 " +
  "(Danger present) require urgent attention and that those classified as C2 " +
  "(Potentially dangerous) require attention as a matter of urgency. I have been " +
  "informed that it is recommended the installation is further inspected and tested " +
  "by the date indicated within this report.";

export function ClientAcknowledgement({
  data,
  onChange,
  signatureValue,
  onSignatureChange,
}: ClientAcknowledgementProps) {
  const updateField = <K extends keyof ClientAcknowledgementProps["data"]>(
    field: K,
    value: ClientAcknowledgementProps["data"][K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Acknowledgement</CardTitle>
        <CardDescription>
          Client confirmation of receipt and understanding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Static acknowledgement text */}
        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed border-l-2 border-[var(--border)] pl-4">
          {ACKNOWLEDGEMENT_TEXT}
        </p>

        {/* Client fields */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="client-name">Client Name</Label>
            <Input
              id="client-name"
              value={data.clientName}
              onChange={(e) => updateField("clientName", e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div>
            <Label htmlFor="client-dateSigned">Date Signed</Label>
            <Input
              id="client-dateSigned"
              type="date"
              value={data.clientDateSigned}
              onChange={(e) => updateField("clientDateSigned", e.target.value)}
            />
          </div>
        </div>

        {/* Signature */}
        {onSignatureChange && (
          <SignatureCapture
            label="Client Signature"
            value={signatureValue ?? null}
            onChange={onSignatureChange}
          />
        )}
      </CardContent>
    </Card>
  );
}

export type { ClientAcknowledgementProps };
