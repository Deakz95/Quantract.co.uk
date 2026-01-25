"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button, Card, CardHeader, CardTitle, CardContent, CardDescription, Input, Label, NativeSelect } from "@quantract/ui";

// BS 7671 Cable data - mV/A/m values at 70°C conductor temperature
// Reference: BS 7671 Appendix 4, Table 4Ab (voltage drop)
const CABLE_DATA = {
  // Twin & Earth (flat cables) - Reference Method C (clipped direct)
  "twin-earth": {
    name: "Twin & Earth (6242Y)",
    sizes: [
      { size: 1.0, currentRating: 14, mvAm: 44 },
      { size: 1.5, currentRating: 18, mvAm: 29 },
      { size: 2.5, currentRating: 24, mvAm: 18 },
      { size: 4, currentRating: 32, mvAm: 11 },
      { size: 6, currentRating: 40, mvAm: 7.3 },
      { size: 10, currentRating: 54, mvAm: 4.4 },
      { size: 16, currentRating: 73, mvAm: 2.8 },
    ],
  },
  // Singles in conduit/trunking - Reference Method B
  singles: {
    name: "Singles in Conduit (6491X)",
    sizes: [
      { size: 1.0, currentRating: 13.5, mvAm: 44 },
      { size: 1.5, currentRating: 17.5, mvAm: 29 },
      { size: 2.5, currentRating: 24, mvAm: 18 },
      { size: 4, currentRating: 32, mvAm: 11 },
      { size: 6, currentRating: 41, mvAm: 7.3 },
      { size: 10, currentRating: 57, mvAm: 4.4 },
      { size: 16, currentRating: 76, mvAm: 2.8 },
      { size: 25, currentRating: 101, mvAm: 1.75 },
      { size: 35, currentRating: 125, mvAm: 1.25 },
      { size: 50, currentRating: 151, mvAm: 0.93 },
    ],
  },
  // SWA Cable - Reference Method C (clipped direct)
  swa: {
    name: "SWA Cable (6944X)",
    sizes: [
      { size: 1.5, currentRating: 21, mvAm: 29 },
      { size: 2.5, currentRating: 28, mvAm: 18 },
      { size: 4, currentRating: 37, mvAm: 11 },
      { size: 6, currentRating: 47, mvAm: 7.3 },
      { size: 10, currentRating: 64, mvAm: 4.4 },
      { size: 16, currentRating: 85, mvAm: 2.8 },
      { size: 25, currentRating: 110, mvAm: 1.75 },
      { size: 35, currentRating: 135, mvAm: 1.25 },
      { size: 50, currentRating: 164, mvAm: 0.93 },
      { size: 70, currentRating: 203, mvAm: 0.63 },
      { size: 95, currentRating: 245, mvAm: 0.46 },
      { size: 120, currentRating: 283, mvAm: 0.36 },
    ],
  },
  // Flex Cable
  flex: {
    name: "Flexible Cable (3183Y)",
    sizes: [
      { size: 0.75, currentRating: 6, mvAm: 60 },
      { size: 1.0, currentRating: 10, mvAm: 44 },
      { size: 1.5, currentRating: 15, mvAm: 29 },
      { size: 2.5, currentRating: 20, mvAm: 18 },
      { size: 4, currentRating: 25, mvAm: 11 },
    ],
  },
};

type CableType = keyof typeof CABLE_DATA;

// Correction factors
const AMBIENT_TEMP_FACTORS: Record<number, number> = {
  25: 1.03,
  30: 1.0,
  35: 0.94,
  40: 0.87,
  45: 0.79,
  50: 0.71,
  55: 0.61,
  60: 0.5,
};

const GROUPING_FACTORS: Record<string, number> = {
  "1": 1.0,
  "2": 0.8,
  "3": 0.7,
  "4": 0.65,
  "5": 0.6,
  "6-7": 0.55,
  "8-9": 0.52,
  "10-12": 0.48,
  "13+": 0.45,
};

const INSULATION_FACTORS: Record<string, number> = {
  none: 1.0,
  "50mm": 0.89,
  "100mm": 0.81,
  "200mm": 0.68,
  "400mm": 0.55,
};

export default function CableCalculatorPage() {
  const [current, setCurrent] = useState<string>("20");
  const [length, setLength] = useState<string>("30");
  const [cableType, setCableType] = useState<CableType>("twin-earth");
  const [phaseType, setPhaseType] = useState<"single" | "three">("single");
  const [circuitType, setCircuitType] = useState<"lighting" | "power">("power");
  const [ambientTemp, setAmbientTemp] = useState<string>("30");
  const [grouping, setGrouping] = useState<string>("1");
  const [insulation, setInsulation] = useState<string>("none");

  const supplyVoltage = phaseType === "single" ? 230 : 400;
  const maxVoltageDrop = circuitType === "lighting" ? 3 : 5; // Percentage

  // Calculate results
  const results = useMemo(() => {
    const currentVal = parseFloat(current) || 0;
    const lengthVal = parseFloat(length) || 0;

    if (currentVal <= 0 || lengthVal <= 0) {
      return null;
    }

    // Get correction factors
    const Ca = AMBIENT_TEMP_FACTORS[parseInt(ambientTemp)] || 1.0;
    const Cg = GROUPING_FACTORS[grouping] || 1.0;
    const Ci = INSULATION_FACTORS[insulation] || 1.0;

    // Calculate design current with correction factors
    const correctionFactor = Ca * Cg * Ci;
    const designCurrent = currentVal / correctionFactor;

    // Find suitable cable size
    const cableData = CABLE_DATA[cableType];
    const suitableSizes = cableData.sizes.filter((s) => s.currentRating >= designCurrent);

    if (suitableSizes.length === 0) {
      return { error: "No suitable cable size found. Consider using a larger cable type." };
    }

    // For each suitable size, calculate voltage drop
    const calculations = suitableSizes.map((cable) => {
      // Voltage drop calculation: mV/A/m × I × L / 1000
      let voltageDrop = (cable.mvAm * currentVal * lengthVal) / 1000;

      // For 3-phase, multiply by sqrt(3) / 2 (approximately 0.866)
      if (phaseType === "three") {
        voltageDrop = voltageDrop * 0.866;
      }

      const voltageDropPercent = (voltageDrop / supplyVoltage) * 100;
      const isCompliant = voltageDropPercent <= maxVoltageDrop;

      return {
        size: cable.size,
        currentRating: cable.currentRating,
        correctedRating: Math.round(cable.currentRating * correctionFactor),
        voltageDrop: voltageDrop.toFixed(2),
        voltageDropPercent: voltageDropPercent.toFixed(2),
        isCompliant,
      };
    });

    // Find recommended cable (smallest that meets all requirements)
    const recommended = calculations.find((c) => c.isCompliant);

    return {
      designCurrent: designCurrent.toFixed(1),
      correctionFactor: correctionFactor.toFixed(3),
      calculations,
      recommended,
      maxVoltageDrop,
      supplyVoltage,
    };
  }, [current, length, cableType, phaseType, circuitType, ambientTemp, grouping, insulation, maxVoltageDrop, supplyVoltage]);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold">Cable Calculator</h1>
          <span className="text-sm text-[var(--muted-foreground)]">BS 7671</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Basic Parameters */}
            <Card>
              <CardHeader>
                <CardTitle>Circuit Parameters</CardTitle>
                <CardDescription>Enter the basic circuit details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="current">Design Current (A)</Label>
                    <Input
                      id="current"
                      type="number"
                      value={current}
                      onChange={(e) => setCurrent(e.target.value)}
                      placeholder="e.g. 20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="length">Cable Length (m)</Label>
                    <Input
                      id="length"
                      type="number"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      placeholder="e.g. 30"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="cableType">Cable Type</Label>
                  <NativeSelect
                    id="cableType"
                    value={cableType}
                    onChange={(e) => setCableType(e.target.value as CableType)}
                  >
                    {Object.entries(CABLE_DATA).map(([key, data]) => (
                      <option key={key} value={key}>
                        {data.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phaseType">Supply Type</Label>
                    <NativeSelect
                      id="phaseType"
                      value={phaseType}
                      onChange={(e) => setPhaseType(e.target.value as "single" | "three")}
                    >
                      <option value="single">Single Phase (230V)</option>
                      <option value="three">Three Phase (400V)</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor="circuitType">Circuit Type</Label>
                    <NativeSelect
                      id="circuitType"
                      value={circuitType}
                      onChange={(e) => setCircuitType(e.target.value as "lighting" | "power")}
                    >
                      <option value="power">Power Circuit (5% max VD)</option>
                      <option value="lighting">Lighting Circuit (3% max VD)</option>
                    </NativeSelect>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Correction Factors */}
            <Card>
              <CardHeader>
                <CardTitle>Correction Factors</CardTitle>
                <CardDescription>Apply derating factors per BS 7671</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="ambientTemp">Ambient Temperature (Ca)</Label>
                  <NativeSelect
                    id="ambientTemp"
                    value={ambientTemp}
                    onChange={(e) => setAmbientTemp(e.target.value)}
                  >
                    {Object.entries(AMBIENT_TEMP_FACTORS).map(([temp, factor]) => (
                      <option key={temp} value={temp}>
                        {temp}°C (Ca = {factor})
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div>
                  <Label htmlFor="grouping">Cable Grouping (Cg)</Label>
                  <NativeSelect
                    id="grouping"
                    value={grouping}
                    onChange={(e) => setGrouping(e.target.value)}
                  >
                    {Object.entries(GROUPING_FACTORS).map(([count, factor]) => (
                      <option key={count} value={count}>
                        {count} cable{count !== "1" ? "s" : ""} (Cg = {factor})
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div>
                  <Label htmlFor="insulation">Thermal Insulation (Ci)</Label>
                  <NativeSelect
                    id="insulation"
                    value={insulation}
                    onChange={(e) => setInsulation(e.target.value)}
                  >
                    {Object.entries(INSULATION_FACTORS).map(([depth, factor]) => (
                      <option key={depth} value={depth}>
                        {depth === "none" ? "No insulation" : `${depth} insulation`} (Ci = {factor})
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {results && !("error" in results) ? (
              <>
                {/* Recommended Cable */}
                {results.recommended ? (
                  <Card className="border-[var(--success)] bg-[var(--success)]/5">
                    <CardHeader>
                      <CardTitle className="text-[var(--success)]">Recommended Cable Size</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-black mb-2">{results.recommended.size}mm²</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-[var(--muted-foreground)]">Current Rating</div>
                          <div className="font-semibold">{results.recommended.currentRating}A (derated: {results.recommended.correctedRating}A)</div>
                        </div>
                        <div>
                          <div className="text-[var(--muted-foreground)]">Voltage Drop</div>
                          <div className="font-semibold">{results.recommended.voltageDrop}V ({results.recommended.voltageDropPercent}%)</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-[var(--warning)] bg-[var(--warning)]/5">
                    <CardHeader>
                      <CardTitle className="text-[var(--warning)]">No Compliant Cable</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        No cable size meets the voltage drop requirements ({results.maxVoltageDrop}% max).
                        Consider reducing cable length or splitting the circuit.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Calculation Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Calculation Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-[var(--muted-foreground)]">Combined Correction Factor</div>
                        <div className="font-semibold">{results.correctionFactor}</div>
                      </div>
                      <div>
                        <div className="text-[var(--muted-foreground)]">Tabulated Current Required</div>
                        <div className="font-semibold">{results.designCurrent}A</div>
                      </div>
                      <div>
                        <div className="text-[var(--muted-foreground)]">Supply Voltage</div>
                        <div className="font-semibold">{results.supplyVoltage}V</div>
                      </div>
                      <div>
                        <div className="text-[var(--muted-foreground)]">Max Voltage Drop</div>
                        <div className="font-semibold">{results.maxVoltageDrop}% ({(results.supplyVoltage * results.maxVoltageDrop / 100).toFixed(1)}V)</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* All Cable Options */}
                <Card>
                  <CardHeader>
                    <CardTitle>All Cable Options</CardTitle>
                    <CardDescription>Comparison of available sizes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="text-left py-2 font-semibold">Size</th>
                            <th className="text-left py-2 font-semibold">Rating</th>
                            <th className="text-left py-2 font-semibold">VD</th>
                            <th className="text-left py-2 font-semibold">VD %</th>
                            <th className="text-left py-2 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.calculations.map((calc) => (
                            <tr
                              key={calc.size}
                              className={`border-b border-[var(--border)] ${
                                results.recommended?.size === calc.size ? "bg-[var(--success)]/10" : ""
                              }`}
                            >
                              <td className="py-2 font-medium">{calc.size}mm²</td>
                              <td className="py-2">{calc.correctedRating}A</td>
                              <td className="py-2">{calc.voltageDrop}V</td>
                              <td className="py-2">{calc.voltageDropPercent}%</td>
                              <td className="py-2">
                                {calc.isCompliant ? (
                                  <span className="text-[var(--success)]">✓ OK</span>
                                ) : (
                                  <span className="text-[var(--error)]">✗ Exceeds</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : results && "error" in results ? (
              <Card className="border-[var(--error)] bg-[var(--error)]/5">
                <CardHeader>
                  <CardTitle className="text-[var(--error)]">Error</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{results.error}</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[var(--muted-foreground)]">
                    Enter circuit parameters to calculate cable size.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Reference Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Reference</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Calculations based on BS 7671:2018+A2:2022. Cable ratings from Appendix 4, Table 4D1A/4D2A.
                  Voltage drop values from Table 4Ab. For final installation, always verify with manufacturer data
                  and consult a qualified electrician.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
