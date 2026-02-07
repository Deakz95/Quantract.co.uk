"use client";

/**
 * Test Results section (MWC-style inline test results).
 * Used by MWC ("testResults"), FIRE ("testResults"), EML ("testResults").
 *
 * For board-based cert types (EICR, EIC), test results live in the board
 * schedule circuits — not in this section.
 */

import { Input, Label, NativeSelect } from "@quantract/ui";

interface TestResultsSectionProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function bool(v: unknown): boolean {
  return Boolean(v);
}

export function TestResultsSection({ data, onChange }: TestResultsSectionProps) {
  const update = (field: string, value: string | boolean) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-5">
      {/* Continuity tests */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="test-continuity">Continuity of Protective Conductors (Ohm)</Label>
          <Input
            id="test-continuity"
            value={str(data.continuity ?? data.continuityOfProtectiveConductors)}
            onChange={(e) => update("continuity", e.target.value)}
            placeholder="e.g. 0.05"
          />
        </div>
        <div>
          <Label htmlFor="test-r1PlusR2">R1+R2 (Ohm)</Label>
          <Input
            id="test-r1PlusR2"
            value={str(data.r1PlusR2)}
            onChange={(e) => update("r1PlusR2", e.target.value)}
            placeholder="e.g. 0.45"
          />
        </div>
      </div>

      {/* Insulation resistance split */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="test-insulationResistanceLE">Insulation Resistance L-E (MOhm)</Label>
          <Input
            id="test-insulationResistanceLE"
            value={str(data.insulationResistanceLE ?? data.insulationResistance)}
            onChange={(e) => update("insulationResistanceLE", e.target.value)}
            placeholder="e.g. >200"
          />
        </div>
        <div>
          <Label htmlFor="test-insulationResistanceLN">Insulation Resistance L-N (MOhm)</Label>
          <Input
            id="test-insulationResistanceLN"
            value={str(data.insulationResistanceLN)}
            onChange={(e) => update("insulationResistanceLN", e.target.value)}
            placeholder="e.g. >200"
          />
        </div>
      </div>

      {/* Earth fault loop + Zs */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="test-earthFaultLoopImpedance">Earth Fault Loop Impedance Zs (Ohm)</Label>
          <Input
            id="test-earthFaultLoopImpedance"
            value={str(data.earthFaultLoopImpedance)}
            onChange={(e) => update("earthFaultLoopImpedance", e.target.value)}
            placeholder="e.g. 0.35"
          />
        </div>
        <div>
          <Label htmlFor="test-r2">R2 (Ohm)</Label>
          <Input
            id="test-r2"
            value={str(data.r2)}
            onChange={(e) => update("r2", e.target.value)}
            placeholder="e.g. 0.15"
          />
        </div>
      </div>

      {/* Polarity */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="test-polarityConfirmed"
          checked={bool(data.polarityConfirmed)}
          onChange={(e) => update("polarityConfirmed", e.target.checked)}
          className="w-5 h-5 rounded accent-[var(--primary)]"
        />
        <Label htmlFor="test-polarityConfirmed" className="mb-0">
          Polarity confirmed correct
        </Label>
      </div>

      {/* RCD tests */}
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="test-rcdOperatingCurrent">RCD Operating Current (mA)</Label>
          <Input
            id="test-rcdOperatingCurrent"
            value={str(data.rcdOperatingCurrent)}
            onChange={(e) => update("rcdOperatingCurrent", e.target.value)}
            placeholder="e.g. 30"
          />
        </div>
        <div>
          <Label htmlFor="test-rcdOperatingTime">RCD Operating Time (ms)</Label>
          <Input
            id="test-rcdOperatingTime"
            value={str(data.rcdOperatingTime)}
            onChange={(e) => update("rcdOperatingTime", e.target.value)}
            placeholder="e.g. 18"
          />
        </div>
        <div>
          <Label htmlFor="test-rcdType">RCD Type</Label>
          <NativeSelect
            id="test-rcdType"
            value={str(data.rcdType)}
            onChange={(e) => update("rcdType", e.target.value)}
          >
            <option value="">Select...</option>
            <option value="AC">AC</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="F">F</option>
          </NativeSelect>
        </div>
      </div>

      {/* Test button operates */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="test-rcdTestButtonOperates"
          checked={bool(data.rcdTestButtonOperates)}
          onChange={(e) => update("rcdTestButtonOperates", e.target.checked)}
          className="w-5 h-5 rounded accent-[var(--primary)]"
        />
        <Label htmlFor="test-rcdTestButtonOperates" className="mb-0">
          RCD test button operates correctly
        </Label>
      </div>

      {/* Ring circuit tests (conditional) */}
      <details className="border border-[var(--border)] rounded-xl overflow-hidden">
        <summary className="bg-[var(--muted)] px-4 py-3 cursor-pointer text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]/80 transition-colors select-none">
          Ring Circuit Tests (if applicable)
        </summary>
        <div className="p-4 space-y-3">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="test-ringR1">Ring R1 (Ohm)</Label>
              <Input
                id="test-ringR1"
                value={str(data.ringR1)}
                onChange={(e) => update("ringR1", e.target.value)}
                placeholder="e.g. 0.30"
              />
            </div>
            <div>
              <Label htmlFor="test-ringRn">Ring Rn (Ohm)</Label>
              <Input
                id="test-ringRn"
                value={str(data.ringRn)}
                onChange={(e) => update("ringRn", e.target.value)}
                placeholder="e.g. 0.30"
              />
            </div>
            <div>
              <Label htmlFor="test-ringR2">Ring R2 (Ohm)</Label>
              <Input
                id="test-ringR2"
                value={str(data.ringR2)}
                onChange={(e) => update("ringR2", e.target.value)}
                placeholder="e.g. 0.50"
              />
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
