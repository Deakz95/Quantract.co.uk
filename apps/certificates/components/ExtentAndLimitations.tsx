"use client";

import { Label, Textarea } from "@quantract/ui";
import { SubCard } from "./ui/SubCard";

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
    <div className="space-y-4">
      <SubCard title="Extent">
        <div className="space-y-1.5">
          <Label htmlFor="extentCovered">Extent of the Installation Covered</Label>
          <Textarea
            id="extentCovered"
            value={data.extentCovered}
            onChange={(e) => handleFieldChange("extentCovered", e.target.value)}
            placeholder="Describe the extent of the installation covered by this report..."
          />
        </div>
      </SubCard>

      <SubCard title="Limitations">
        <div className="space-y-4">
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
        </div>
      </SubCard>

      <SubCard title="Confirmation" accentColor="#06b6d4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="complianceConfirmed"
            checked={data.complianceConfirmed}
            onChange={(e) => handleFieldChange("complianceConfirmed", e.target.checked)}
            className="h-4 w-4 rounded border-white/10 text-blue-500 accent-blue-500 cursor-pointer"
          />
          <Label htmlFor="complianceConfirmed" className="mb-0 cursor-pointer">
            I confirm the extent and limitations have been agreed with the client
          </Label>
        </div>
      </SubCard>
    </div>
  );
}

export default ExtentAndLimitations;
