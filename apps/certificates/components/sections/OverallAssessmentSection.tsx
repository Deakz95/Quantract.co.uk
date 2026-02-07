"use client";

/**
 * Overall Assessment section.
 * Used by EICR ("overallAssessment"), FIRE ("overallCondition"), EML ("overallCondition").
 *
 * Renders overall condition select, retest date, retest interval, inspector comments.
 * No cert-type conditionals — adapts based on which fields are present in data.
 */

import { Input, Label, NativeSelect, Textarea } from "@quantract/ui";

interface OverallAssessmentSectionProps {
  /** Top-level certificate data (not section-scoped) */
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function OverallAssessmentSection({
  data,
  onChange,
}: OverallAssessmentSectionProps) {
  const update = (field: string, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-5">
      {/* Overall condition + Retest date */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="assessment-overallCondition">Overall Condition</Label>
          <NativeSelect
            id="assessment-overallCondition"
            value={str(data.overallCondition)}
            onChange={(e) => update("overallCondition", e.target.value)}
          >
            <option value="">Select...</option>
            <option value="satisfactory">Satisfactory</option>
            <option value="unsatisfactory">Unsatisfactory</option>
            <option value="further_investigation">Further Investigation Required</option>
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="assessment-recommendedRetestDate">Recommended Retest Date</Label>
          <Input
            id="assessment-recommendedRetestDate"
            type="date"
            value={str(data.recommendedRetestDate)}
            onChange={(e) => update("recommendedRetestDate", e.target.value)}
          />
        </div>
      </div>

      {/* Retest interval */}
      <div>
        <Label htmlFor="assessment-retestInterval">Retest Interval</Label>
        <NativeSelect
          id="assessment-retestInterval"
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

      {/* Inspector comments */}
      <div>
        <Label htmlFor="assessment-inspectorComments">Inspector Comments</Label>
        <Textarea
          id="assessment-inspectorComments"
          value={str(data.inspectorComments)}
          onChange={(e) => update("inspectorComments", e.target.value)}
          placeholder="Any additional comments by the inspector..."
          className="min-h-[100px]"
        />
      </div>
    </div>
  );
}
