"use client";

/**
 * Next Inspection section.
 * Used by EIC ("nextInspection"), MWC ("nextInspection").
 *
 * Renders next inspection / retest date, interval, and reason.
 * Separate from OverallAssessmentSection which includes the overall condition select.
 */

import { Input, Label, NativeSelect, Textarea } from "@quantract/ui";

interface NextInspectionSectionProps {
  /** Top-level certificate data */
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function NextInspectionSection({
  data,
  onChange,
}: NextInspectionSectionProps) {
  const update = (field: string, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-5">
      {/* Date + Interval */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="nextInspection-nextInspectionDate">
            Recommended Next Inspection Date
          </Label>
          <Input
            id="nextInspection-nextInspectionDate"
            type="date"
            value={str(data.nextInspectionDate ?? data.recommendedRetestDate)}
            onChange={(e) => update("nextInspectionDate", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="nextInspection-retestInterval">Retest Interval</Label>
          <NativeSelect
            id="nextInspection-retestInterval"
            value={str(data.retestInterval)}
            onChange={(e) => update("retestInterval", e.target.value)}
          >
            <option value="">Select...</option>
            <option value="1">1 year</option>
            <option value="2">2 years</option>
            <option value="3">3 years</option>
            <option value="5">5 years</option>
            <option value="10">10 years</option>
          </NativeSelect>
        </div>
      </div>

      {/* Reason */}
      <div>
        <Label htmlFor="nextInspection-retestReason">Reason for Interval</Label>
        <Textarea
          id="nextInspection-retestReason"
          value={str(data.retestReason)}
          onChange={(e) => update("retestReason", e.target.value)}
          placeholder="Reason for the recommended retest interval..."
          className="min-h-[80px]"
        />
      </div>
    </div>
  );
}
