"use client";

/**
 * Earthing Arrangements section.
 * Used by EICR ("earthing"), EIC ("earthing").
 *
 * Renders means of earthing, electrode type, conductor details,
 * bonding checklist, supplementary bonding.
 * No cert-type conditionals.
 */

import { Input, Label, NativeSelect } from "@quantract/ui";

interface EarthingSectionProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function bool(v: unknown): boolean {
  return Boolean(v);
}

const BONDING_ITEMS = [
  { key: "bondingToWater", label: "Water" },
  { key: "bondingToGas", label: "Gas" },
  { key: "bondingToOil", label: "Oil" },
  { key: "bondingToStructuralSteel", label: "Structural Steel" },
  { key: "bondingToLightningProtection", label: "Lightning Protection" },
  { key: "bondingToOther", label: "Other" },
];

export function EarthingSection({ data, onChange }: EarthingSectionProps) {
  const update = (field: string, value: string | boolean) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-5">
      {/* Means of earthing + Electrode type */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="earthing-meansOfEarthing">Means of Earthing</Label>
          <NativeSelect
            id="earthing-meansOfEarthing"
            value={str(data.meansOfEarthing)}
            onChange={(e) => update("meansOfEarthing", e.target.value)}
          >
            <option value="">Select...</option>
            <option value="supply_distributor">Supply Distributor</option>
            <option value="earth_electrode">Earth Electrode</option>
            <option value="other">Other</option>
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="earthing-earthElectrodeType">Earth Electrode Type</Label>
          <NativeSelect
            id="earthing-earthElectrodeType"
            value={str(data.earthElectrodeType)}
            onChange={(e) => update("earthElectrodeType", e.target.value)}
          >
            <option value="">Select...</option>
            <option value="rod">Rod</option>
            <option value="tape">Tape</option>
            <option value="plate">Plate</option>
            <option value="ring">Ring</option>
            <option value="foundation">Foundation</option>
            <option value="other">Other</option>
          </NativeSelect>
        </div>
      </div>

      {/* Conductor type + size */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="earthing-earthingConductorType">Earthing Conductor Type</Label>
          <Input
            id="earthing-earthingConductorType"
            value={str(data.earthingConductorType)}
            onChange={(e) => update("earthingConductorType", e.target.value)}
            placeholder="e.g. Copper"
          />
        </div>
        <div>
          <Label htmlFor="earthing-earthingConductorSize">Earthing Conductor Size (mm2)</Label>
          <Input
            id="earthing-earthingConductorSize"
            value={str(data.earthingConductorSize)}
            onChange={(e) => update("earthingConductorSize", e.target.value)}
            placeholder="e.g. 16"
          />
        </div>
      </div>

      {/* Main bonding type + size */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="earthing-mainProtectiveBondingType">Main Bonding Type</Label>
          <Input
            id="earthing-mainProtectiveBondingType"
            value={str(data.mainProtectiveBondingType)}
            onChange={(e) => update("mainProtectiveBondingType", e.target.value)}
            placeholder="e.g. Copper"
          />
        </div>
        <div>
          <Label htmlFor="earthing-mainProtectiveBondingSize">Main Bonding Size (mm2)</Label>
          <Input
            id="earthing-mainProtectiveBondingSize"
            value={str(data.mainProtectiveBondingSize)}
            onChange={(e) => update("mainProtectiveBondingSize", e.target.value)}
            placeholder="e.g. 10"
          />
        </div>
      </div>

      {/* Ze measured */}
      <div>
        <Label htmlFor="earthing-zeMeasured">Ze Measured (Ohm)</Label>
        <Input
          id="earthing-zeMeasured"
          value={str(data.zeMeasured)}
          onChange={(e) => update("zeMeasured", e.target.value)}
          placeholder="e.g. 0.35"
        />
      </div>

      {/* Bonding checklist */}
      <div className="border border-[var(--border)] rounded-sm p-4 space-y-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Main Protective Bonding Connected To:
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          {BONDING_ITEMS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`earthing-${key}`}
                checked={bool(data[key])}
                onChange={(e) => update(key, e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--primary)]"
              />
              <Label htmlFor={`earthing-${key}`} className="mb-0 text-sm">
                {label}
              </Label>
            </div>
          ))}
        </div>
        {bool(data.bondingToOther) && (
          <div>
            <Label htmlFor="earthing-bondingToOtherDetails">Other Bonding Details</Label>
            <Input
              id="earthing-bondingToOtherDetails"
              value={str(data.bondingToOtherDetails)}
              onChange={(e) => update("bondingToOtherDetails", e.target.value)}
              placeholder="Specify other bonding"
            />
          </div>
        )}
      </div>

      {/* Supplementary bonding */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="earthing-supplementaryBondingPresent"
          checked={bool(data.supplementaryBondingPresent)}
          onChange={(e) => update("supplementaryBondingPresent", e.target.checked)}
          className="w-5 h-5 rounded accent-[var(--primary)]"
        />
        <Label htmlFor="earthing-supplementaryBondingPresent" className="mb-0">
          Supplementary bonding present
        </Label>
      </div>
    </div>
  );
}
