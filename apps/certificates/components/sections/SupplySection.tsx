"use client";

/**
 * Supply Characteristics section.
 * Used by EICR ("supply"), EIC ("supply").
 *
 * Renders supply type, voltages, protective devices, etc.
 * No cert-type conditionals — driven by data shape.
 */

import { Input, Label, NativeSelect } from "@quantract/ui";

interface SupplySectionProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function bool(v: unknown): boolean {
  return Boolean(v);
}

export function SupplySection({ data, onChange }: SupplySectionProps) {
  const update = (field: string, value: string | boolean) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-5">
      {/* System type + Phases + Nature */}
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="supply-systemType">System Type (Earthing)</Label>
          <NativeSelect
            id="supply-systemType"
            value={str(data.systemType)}
            onChange={(e) => update("systemType", e.target.value)}
          >
            <option value="">Select...</option>
            <option value="TN-C-S">TN-C-S (PME)</option>
            <option value="TN-S">TN-S</option>
            <option value="TT">TT</option>
            <option value="IT">IT</option>
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="supply-numberOfPhases">Number of Phases</Label>
          <NativeSelect
            id="supply-numberOfPhases"
            value={str(data.numberOfPhases)}
            onChange={(e) => update("numberOfPhases", e.target.value)}
          >
            <option value="">Select...</option>
            <option value="single">Single Phase</option>
            <option value="three">Three Phase</option>
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="supply-natureOfSupply">Nature of Supply</Label>
          <NativeSelect
            id="supply-natureOfSupply"
            value={str(data.natureOfSupply)}
            onChange={(e) => update("natureOfSupply", e.target.value)}
          >
            <option value="">Select...</option>
            <option value="AC">AC</option>
            <option value="DC">DC</option>
          </NativeSelect>
        </div>
      </div>

      {/* Voltages + Frequency */}
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="supply-nominalVoltageToEarth">Nominal Voltage to Earth (V)</Label>
          <Input
            id="supply-nominalVoltageToEarth"
            value={str(data.nominalVoltageToEarth)}
            onChange={(e) => update("nominalVoltageToEarth", e.target.value)}
            placeholder="230"
          />
        </div>
        <div>
          <Label htmlFor="supply-nominalVoltageBetweenPhases">Voltage Between Phases (V)</Label>
          <Input
            id="supply-nominalVoltageBetweenPhases"
            value={str(data.nominalVoltageBetweenPhases)}
            onChange={(e) => update("nominalVoltageBetweenPhases", e.target.value)}
            placeholder="400"
          />
        </div>
        <div>
          <Label htmlFor="supply-frequency">Frequency (Hz)</Label>
          <Input
            id="supply-frequency"
            value={str(data.frequency)}
            onChange={(e) => update("frequency", e.target.value)}
            placeholder="50"
          />
        </div>
      </div>

      {/* PFC + Ze */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="supply-prospectiveFaultCurrent">Prospective Fault Current (kA)</Label>
          <Input
            id="supply-prospectiveFaultCurrent"
            value={str(data.prospectiveFaultCurrent)}
            onChange={(e) => update("prospectiveFaultCurrent", e.target.value)}
            placeholder="e.g. 16"
          />
        </div>
        <div>
          <Label htmlFor="supply-externalLoopImpedance">External Ze (Ohm)</Label>
          <Input
            id="supply-externalLoopImpedance"
            value={str(data.externalLoopImpedance)}
            onChange={(e) => update("externalLoopImpedance", e.target.value)}
            placeholder="e.g. 0.35"
          />
        </div>
      </div>

      {/* Protective device */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="supply-supplyProtectiveDeviceType">Supply Protective Device Type</Label>
          <Input
            id="supply-supplyProtectiveDeviceType"
            value={str(data.supplyProtectiveDeviceType)}
            onChange={(e) => update("supplyProtectiveDeviceType", e.target.value)}
            placeholder="e.g. BS 88 Fuse"
          />
        </div>
        <div>
          <Label htmlFor="supply-supplyProtectiveDeviceRating">Supply Protective Device Rating (A)</Label>
          <Input
            id="supply-supplyProtectiveDeviceRating"
            value={str(data.supplyProtectiveDeviceRating)}
            onChange={(e) => update("supplyProtectiveDeviceRating", e.target.value)}
            placeholder="e.g. 100"
          />
        </div>
      </div>

      {/* Other sources of supply */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="supply-otherSourcesOfSupply"
          checked={bool(data.otherSourcesOfSupply)}
          onChange={(e) => update("otherSourcesOfSupply", e.target.checked)}
          className="w-5 h-5 rounded accent-[var(--primary)]"
        />
        <Label htmlFor="supply-otherSourcesOfSupply" className="mb-0">
          Other sources of supply (e.g. generator, solar PV)
        </Label>
      </div>
      {bool(data.otherSourcesOfSupply) && (
        <div>
          <Label htmlFor="supply-otherSourcesDetails">Other Sources Details</Label>
          <Input
            id="supply-otherSourcesDetails"
            value={str(data.otherSourcesDetails)}
            onChange={(e) => update("otherSourcesDetails", e.target.value)}
            placeholder="Describe other sources of supply"
          />
        </div>
      )}
    </div>
  );
}
