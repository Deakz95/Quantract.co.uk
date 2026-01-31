"use client";

import { useState, useCallback } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { ResultsPanel } from "@/components/tools/ResultsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import {
  cableSizingInputSchema,
  type CableSizingOutput,
} from "@/lib/tools/cable-sizing/schema";
import { calculateCableSizing } from "@/lib/tools/cable-sizing/engine";
import { cableSizingAssumptions, cableSizingDefaults } from "@/lib/tools/cable-sizing/assumptions";

export default function CableSizingPage() {
  const [designCurrent, setDesignCurrent] = useState(String(cableSizingDefaults.designCurrent));
  const [cableType, setCableType] = useState<"twin-earth" | "singles" | "swa" | "flex">(cableSizingDefaults.cableType);
  const [ca, setCa] = useState(String(cableSizingDefaults.ca));
  const [cg, setCg] = useState(String(cableSizingDefaults.cg));
  const [ci, setCi] = useState(String(cableSizingDefaults.ci));
  const [circuitType, setCircuitType] = useState<"power" | "lighting">(cableSizingDefaults.circuitType);
  const [supplyVoltage, setSupplyVoltage] = useState(String(cableSizingDefaults.supplyVoltage));
  const [length, setLength] = useState(String(cableSizingDefaults.length));
  const [result, setResult] = useState<CableSizingOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = useCallback(() => {
    setError(null);
    const parsed = cableSizingInputSchema.safeParse({
      designCurrent: Number(designCurrent),
      cableType,
      ca: Number(ca),
      cg: Number(cg),
      ci: Number(ci),
      circuitType,
      supplyVoltage: Number(supplyVoltage),
      length: length ? Number(length) : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      setResult(null);
      return;
    }
    setResult(calculateCableSizing(parsed.data));
  }, [designCurrent, cableType, ca, cg, ci, circuitType, supplyVoltage, length]);

  const handleReset = () => {
    setDesignCurrent(String(cableSizingDefaults.designCurrent));
    setCableType(cableSizingDefaults.cableType);
    setCa(String(cableSizingDefaults.ca));
    setCg(String(cableSizingDefaults.cg));
    setCi(String(cableSizingDefaults.ci));
    setCircuitType(cableSizingDefaults.circuitType);
    setSupplyVoltage(String(cableSizingDefaults.supplyVoltage));
    setLength(String(cableSizingDefaults.length));
    setResult(null);
    setError(null);
  };

  const resultRows = result
    ? [
        { label: "Required CCC", value: `${result.requiredCcc} A`, highlight: true },
        { label: "Correction Factor", value: `${result.correctionFactor}` },
        { label: "Recommended Size", value: result.recommendedSize ? `${result.recommendedSize} mm²` : "None compliant", highlight: true },
        { label: "Max Drop Allowed", value: `${result.maxDropPercent}%` },
      ]
    : [];

  return (
    <ToolPage slug="cable-sizing">
      <HowItWorks>
        <p>Selects minimum cable size based on design current, correction factors, and voltage drop.</p>
        <p><strong>Required CCC = I_b / (C_a × C_g × C_i)</strong></p>
        <p>Tables from BS 7671 Appendix 4. Voltage drop checked against Regulation 525.1 limits.</p>
      </HowItWorks>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Circuit Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Design Current (A)</label>
                <Input type="number" value={designCurrent} onChange={(e) => setDesignCurrent(e.target.value)} min={0} step={0.1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Cable Type</label>
                <div className="flex flex-wrap gap-2">
                  {(["twin-earth", "singles", "swa", "flex"] as const).map((t) => (
                    <Button key={t} variant={cableType === t ? "default" : "secondary"} size="sm" onClick={() => setCableType(t)}>
                      {t === "twin-earth" ? "T&E" : t === "singles" ? "Singles" : t === "swa" ? "SWA" : "Flex"}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Ca (temp)</label>
                  <Input type="number" value={ca} onChange={(e) => setCa(e.target.value)} min={0} max={2} step={0.01} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Cg (group)</label>
                  <Input type="number" value={cg} onChange={(e) => setCg(e.target.value)} min={0} max={2} step={0.01} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Ci (insul)</label>
                  <Input type="number" value={ci} onChange={(e) => setCi(e.target.value)} min={0} max={2} step={0.01} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Circuit Type</label>
                <div className="flex gap-2">
                  <Button variant={circuitType === "power" ? "default" : "secondary"} size="sm" onClick={() => setCircuitType("power")}>Power (5%)</Button>
                  <Button variant={circuitType === "lighting" ? "default" : "secondary"} size="sm" onClick={() => setCircuitType("lighting")}>Lighting (3%)</Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Supply Voltage (V)</label>
                <div className="flex gap-2">
                  <Button variant={supplyVoltage === "230" ? "default" : "secondary"} size="sm" onClick={() => setSupplyVoltage("230")}>230V (1φ)</Button>
                  <Button variant={supplyVoltage === "400" ? "default" : "secondary"} size="sm" onClick={() => setSupplyVoltage("400")}>400V (3φ)</Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Cable Length — one way (m)</label>
                <Input type="number" value={length} onChange={(e) => setLength(e.target.value)} min={0} step={0.1} />
              </div>

              {error && <div className="p-3 rounded-lg bg-[var(--error)]/10 text-[var(--error)] text-sm">{error}</div>}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCalculate} className="flex-1">Calculate</Button>
                <Button variant="secondary" onClick={handleReset}>Reset</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <ResultsPanel rows={resultRows} notes={result ? cableSizingAssumptions : undefined} />
          {result && result.options.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Cable Options</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-[var(--muted-foreground)]">
                        <th className="pb-2 pr-3">Size</th>
                        <th className="pb-2 pr-3">Rating</th>
                        <th className="pb-2 pr-3">Derated</th>
                        <th className="pb-2 pr-3">VD%</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.options.map((opt) => (
                        <tr key={opt.size} className={`border-b last:border-0 ${opt.size === result.recommendedSize ? "font-semibold" : ""}`}>
                          <td className="py-1.5 pr-3">{opt.size} mm²</td>
                          <td className="py-1.5 pr-3">{opt.currentRating} A</td>
                          <td className="py-1.5 pr-3">{opt.deratedRating} A</td>
                          <td className="py-1.5 pr-3">{opt.voltageDropPercent !== null ? `${opt.voltageDropPercent}%` : "—"}</td>
                          <td className="py-1.5">{opt.compliant ? "✓" : "✗"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ToolPage>
  );
}
