"use client";

/**
 * Circuit Details section.
 * Used by MWC ("circuitDetails").
 *
 * Renders circuit reference, protection details, cable specs.
 */

import { Input, Label, NativeSelect } from "@quantract/ui";

interface CircuitDetailsSectionProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function CircuitDetailsSection({
  data,
  onChange,
}: CircuitDetailsSectionProps) {
  const update = (field: string, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-5">
      {/* Circuit affected + reference */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="circuit-circuitAffected">Circuit Affected</Label>
          <Input
            id="circuit-circuitAffected"
            value={str(data.circuitAffected)}
            onChange={(e) => update("circuitAffected", e.target.value)}
            placeholder="e.g. Ring final circuit, Lighting circuit"
          />
        </div>
        <div>
          <Label htmlFor="circuit-circuitReference">Circuit Reference / Number</Label>
          <Input
            id="circuit-circuitReference"
            value={str(data.circuitReference)}
            onChange={(e) => update("circuitReference", e.target.value)}
            placeholder="e.g. Circuit 3, Ring 1"
          />
        </div>
      </div>

      {/* Location + means of protection */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="circuit-location">Location</Label>
          <Input
            id="circuit-location"
            value={str(data.location)}
            onChange={(e) => update("location", e.target.value)}
            placeholder="e.g. Kitchen, First floor"
          />
        </div>
        <div>
          <Label htmlFor="circuit-meansOfProtection">Means of Protection</Label>
          <NativeSelect
            id="circuit-meansOfProtection"
            value={str(data.meansOfProtection)}
            onChange={(e) => update("meansOfProtection", e.target.value)}
          >
            <option value="">Select...</option>
            <option value="MCB">MCB</option>
            <option value="RCBO">RCBO</option>
            <option value="Fuse_BS3036">Fuse BS 3036</option>
            <option value="Fuse_BS1361">Fuse BS 1361</option>
            <option value="Fuse_BS88">Fuse BS 88</option>
            <option value="Other">Other</option>
          </NativeSelect>
        </div>
      </div>

      {/* Protective device + rating */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="circuit-protectiveDevice">Protective Device Type</Label>
          <Input
            id="circuit-protectiveDevice"
            value={str(data.protectiveDevice)}
            onChange={(e) => update("protectiveDevice", e.target.value)}
            placeholder="e.g. MCB Type B"
          />
        </div>
        <div>
          <Label htmlFor="circuit-rating">Rating (A)</Label>
          <NativeSelect
            id="circuit-rating"
            value={str(data.rating)}
            onChange={(e) => update("rating", e.target.value)}
          >
            <option value="">Select...</option>
            <option value="6">6A</option>
            <option value="10">10A</option>
            <option value="16">16A</option>
            <option value="20">20A</option>
            <option value="32">32A</option>
            <option value="40">40A</option>
            <option value="45">45A</option>
            <option value="50">50A</option>
          </NativeSelect>
        </div>
      </div>

      {/* BS EN + cable reference */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="circuit-bsEnNumber">BS EN Number</Label>
          <Input
            id="circuit-bsEnNumber"
            value={str(data.bsEnNumber)}
            onChange={(e) => update("bsEnNumber", e.target.value)}
            placeholder="e.g. BS EN 60898"
          />
        </div>
        <div>
          <Label htmlFor="circuit-cableReference">Cable Reference</Label>
          <Input
            id="circuit-cableReference"
            value={str(data.cableReference)}
            onChange={(e) => update("cableReference", e.target.value)}
            placeholder="e.g. 6242Y T&E"
          />
        </div>
      </div>

      {/* Cable CSA */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="circuit-cableCsaLive">Cable CSA - Live (mm2)</Label>
          <Input
            id="circuit-cableCsaLive"
            value={str(data.cableCsaLive)}
            onChange={(e) => update("cableCsaLive", e.target.value)}
            placeholder="e.g. 2.5"
          />
        </div>
        <div>
          <Label htmlFor="circuit-cableCsaCpc">Cable CSA - CPC (mm2)</Label>
          <Input
            id="circuit-cableCsaCpc"
            value={str(data.cableCsaCpc)}
            onChange={(e) => update("cableCsaCpc", e.target.value)}
            placeholder="e.g. 1.5"
          />
        </div>
      </div>
    </div>
  );
}
