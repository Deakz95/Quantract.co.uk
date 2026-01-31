"use client";

import { useState, useCallback } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { ResultsPanel } from "@/components/tools/ResultsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { voltageDropInputSchema, type VoltageDropOutput } from "@/lib/tools/voltage-drop";
import { calculateVoltageDrop } from "@/lib/tools/voltage-drop";
import { voltageDropAssumptions, voltageDropDefaults } from "@/lib/tools/voltage-drop";

export default function VoltageDropPage() {
  const [current, setCurrent] = useState(String(voltageDropDefaults.current));
  const [length, setLength] = useState(String(voltageDropDefaults.length));
  const [mvPerAm, setMvPerAm] = useState(String(voltageDropDefaults.mvPerAm));
  const [supplyVoltage, setSupplyVoltage] = useState(String(voltageDropDefaults.supplyVoltage));
  const [maxDropPercent, setMaxDropPercent] = useState(String(voltageDropDefaults.maxDropPercent));
  const [result, setResult] = useState<VoltageDropOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = useCallback(() => {
    setError(null);
    const parsed = voltageDropInputSchema.safeParse({
      current: Number(current),
      length: Number(length),
      mvPerAm: Number(mvPerAm),
      supplyVoltage: Number(supplyVoltage),
      maxDropPercent: Number(maxDropPercent),
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      setResult(null);
      return;
    }
    setResult(calculateVoltageDrop(parsed.data));
  }, [current, length, mvPerAm, supplyVoltage, maxDropPercent]);

  const handleReset = () => {
    setCurrent(String(voltageDropDefaults.current));
    setLength(String(voltageDropDefaults.length));
    setMvPerAm(String(voltageDropDefaults.mvPerAm));
    setSupplyVoltage(String(voltageDropDefaults.supplyVoltage));
    setMaxDropPercent(String(voltageDropDefaults.maxDropPercent));
    setResult(null);
    setError(null);
  };

  const resultRows = result
    ? [
        { label: "Voltage Drop", value: `${result.voltageDrop} V`, highlight: true },
        { label: "Drop Percentage", value: `${result.voltageDropPercent}%`, highlight: !result.compliant },
        { label: "Compliant", value: result.compliant ? "Yes" : "No — exceeds limit" },
        { label: "Max Permitted", value: `${result.maxDropVolts} V (${maxDropPercent}%)` },
        { label: "Margin", value: `${result.marginVolts} V` },
      ]
    : [];

  return (
    <ToolPage slug="voltage-drop">
      <HowItWorks>
        <p>Calculates voltage drop using the formula: <strong>VD = (mV/A/m × I × L) / 1000</strong></p>
        <p>The mV/A/m value comes from BS 7671 Appendix 4 tables for the specific cable type and size.</p>
        <p><strong>UK defaults:</strong> 230V single-phase, 400V three-phase. Limits: 3% lighting, 5% power circuits (Regulation 525.1).</p>
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
                <Input type="number" value={current} onChange={(e) => setCurrent(e.target.value)} min={0} step={0.1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Cable Length — one way (m)</label>
                <Input type="number" value={length} onChange={(e) => setLength(e.target.value)} min={0} step={0.1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">mV/A/m (from BS 7671 tables)</label>
                <Input type="number" value={mvPerAm} onChange={(e) => setMvPerAm(e.target.value)} min={0} step={0.01} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Supply Voltage (V)</label>
                <div className="flex gap-2">
                  <Button variant={supplyVoltage === "230" ? "default" : "secondary"} size="sm" onClick={() => setSupplyVoltage("230")}>
                    230V (1φ)
                  </Button>
                  <Button variant={supplyVoltage === "400" ? "default" : "secondary"} size="sm" onClick={() => setSupplyVoltage("400")}>
                    400V (3φ)
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Max Drop (%)</label>
                <div className="flex gap-2">
                  <Button variant={maxDropPercent === "3" ? "default" : "secondary"} size="sm" onClick={() => setMaxDropPercent("3")}>
                    3% (Lighting)
                  </Button>
                  <Button variant={maxDropPercent === "5" ? "default" : "secondary"} size="sm" onClick={() => setMaxDropPercent("5")}>
                    5% (Power)
                  </Button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-[var(--error)]/10 text-[var(--error)] text-sm">{error}</div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCalculate} className="flex-1">Calculate</Button>
                <Button variant="secondary" onClick={handleReset}>Reset</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <ResultsPanel
          rows={resultRows}
          notes={result ? voltageDropAssumptions : undefined}
        />
      </div>
    </ToolPage>
  );
}
