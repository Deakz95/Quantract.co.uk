"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Textarea,
  Label,
} from "@quantract/ui";

interface ExtentAndLimitationsProps {
  data: {
    extentCovered: string;
    agreedLimitations: string;
    operationalLimitations: string;
    complianceConfirmed: boolean;
  };
  onChange: (data: ExtentAndLimitationsProps["data"]) => void;
}

export function ExtentAndLimitations({ data, onChange }: ExtentAndLimitationsProps) {
  const handleFieldChange = (field: keyof ExtentAndLimitationsProps["data"], value: string | boolean) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Extent and Limitations</CardTitle>
        <CardDescription>
          Extent of the installation covered and any limitations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="extentCovered">Extent of the Installation Covered</Label>
            <Textarea
              id="extentCovered"
              value={data.extentCovered}
              onChange={(e) => handleFieldChange("extentCovered", e.target.value)}
              placeholder="Describe the extent of the installation covered by this report..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="agreedLimitations">Agreed Limitations</Label>
            <Textarea
              id="agreedLimitations"
              value={data.agreedLimitations}
              onChange={(e) => handleFieldChange("agreedLimitations", e.target.value)}
              placeholder="Any agreed limitations on the inspection and testing..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="operationalLimitations">Operational Limitations</Label>
            <Textarea
              id="operationalLimitations"
              value={data.operationalLimitations}
              onChange={(e) => handleFieldChange("operationalLimitations", e.target.value)}
              placeholder="Any operational limitations preventing full inspection..."
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="complianceConfirmed"
              checked={data.complianceConfirmed}
              onChange={(e) => handleFieldChange("complianceConfirmed", e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] accent-[var(--primary)] cursor-pointer"
            />
            <Label htmlFor="complianceConfirmed" className="mb-0 cursor-pointer">
              I confirm the extent and limitations have been agreed with the client
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ExtentAndLimitations;
