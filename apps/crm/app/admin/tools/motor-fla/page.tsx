"use client";

import { useState, useCallback } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { ResultsPanel } from "@/components/tools/ResultsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { motorFlaInputSchema, type MotorFlaOutput } from "@/lib/tools/motor-fla/schema";
import { calculateMotorFla } from "@/lib/tools/motor-fla/engine";
import { motorFlaAssumptions, motorFlaDefaults } from "@/lib/tools/motor-fla/assumptions";

export default function MotorFlaPage() {
  const [powerKw, setPowerKw] = useState(String(motorFlaDefaults.powerKw));
  const [phase, setPhase] = useState<"single" | "three">(motorFlaDefaults.phase);
  const [voltage, setVoltage] = useState(String(motorFlaDefaults.voltage));
  const [powerFactor, setPowerFactor] = useState(String(motorFlaDefaults.powerFactor));
  const [efficiency, setEfficiency] = useState(String(motorFlaDefaults.efficiency));
  const [result, setResult] = useState<MotorFlaOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = useCallback(() => {
    setError(null);
    const parsed = motorFlaInputSchema.safeParse({
      powerKw: Number(powerKw),
      phase,
      voltage: Number(voltage),
      powerFactor: Number(powerFactor),
      efficiency: Number(efficiency),
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      setResult(null);
      return;
    }
    setResult(calculateMotorFla(parsed.data));
  }, [powerKw, phase, voltage, powerFactor, efficiency]);

  const handleReset = () => {
    setPowerKw(String(motorFlaDefaults.powerKw));
    setPhase(motorFlaDefaults.phase);
    setVoltage(String(motorFlaDefaults.voltage));
    setPowerFactor(String(motorFlaDefaults.powerFactor));
    setEfficiency(String(motorFlaDefaults.efficiency));
    setResult(null);
    setError(null);
  };

  const resultRows = result
    ? [
        { label: "Full Load Current", value: `${result.fla} A`, highlight: true },
        { label: "Starting Current (DOL)", value: `${result.startingCurrent} A` },
        { label: "Input Power", value: `${result.inputPowerKw} kW` },
        { label: "Apparent Power", value: `${result.apparentPowerKva} kVA` },
        ...(result.suggestedCable ? [{ label: "Suggested Cable", value: `${result.suggestedCable} mm²` }] : []),
        ...(result.suggestedProtection ? [{ label: "Suggested Protection", value: `${result.suggestedProtection} A` }] : []),
      ]
    : [];

  return (
    <ToolPage slug="motor-fla">
      <HowItWorks>
        <p>Calculates motor full-load current from power rating, power factor and efficiency.</p>
        <p><strong>Single-phase:</strong> I = P / (V × PF × η). <strong>Three-phase:</strong> I = P / (√3 × V × PF × η).</p>
      </HowItWorks>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Motor Parameters</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Motor Power (kW)</label>
                <Input type="number" value={powerKw} onChange={(e) => setPowerKw(e.target.value)} min={0} step={0.1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Phase</label>
                <div className="flex gap-2">
                  <Button variant={phase === "single" ? "default" : "secondary"} size="sm" onClick={() => { setPhase("single"); setVoltage("230"); }}>Single Phase</Button>
                  <Button variant={phase === "three" ? "default" : "secondary"} size="sm" onClick={() => { setPhase("three"); setVoltage("400"); }}>Three Phase</Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Supply Voltage (V)</label>
                <Input type="number" value={voltage} onChange={(e) => setVoltage(e.target.value)} min={0} step={1} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Power Factor</label>
                  <Input type="number" value={powerFactor} onChange={(e) => setPowerFactor(e.target.value)} min={0.5} max={1} step={0.01} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Efficiency</label>
                  <Input type="number" value={efficiency} onChange={(e) => setEfficiency(e.target.value)} min={0.5} max={1} step={0.01} />
                </div>
              </div>

              {error && <div className="p-3 rounded-lg bg-[var(--error)]/10 text-[var(--error)] text-sm">{error}</div>}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCalculate} className="flex-1">Calculate</Button>
                <Button variant="secondary" onClick={handleReset}>Reset</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <ResultsPanel rows={resultRows} notes={result ? motorFlaAssumptions : undefined} />
      </div>
    </ToolPage>
  );
}
