"use client";

import { useState, useCallback } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { ResultsPanel } from "@/components/tools/ResultsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { powerFactorInputSchema, type PowerFactorOutput } from "@/lib/tools/power-factor/schema";
import { calculatePowerFactor } from "@/lib/tools/power-factor/engine";
import { powerFactorAssumptions, powerFactorDefaults } from "@/lib/tools/power-factor/assumptions";

export default function PowerFactorPage() {
  const [activeKw, setActiveKw] = useState(String(powerFactorDefaults.activeKw));
  const [currentPf, setCurrentPf] = useState(String(powerFactorDefaults.currentPf));
  const [targetPf, setTargetPf] = useState(String(powerFactorDefaults.targetPf));
  const [voltage, setVoltage] = useState(String(powerFactorDefaults.voltage));
  const [result, setResult] = useState<PowerFactorOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = useCallback(() => {
    setError(null);
    const parsed = powerFactorInputSchema.safeParse({
      activeKw: Number(activeKw),
      currentPf: Number(currentPf),
      targetPf: Number(targetPf),
      voltage: Number(voltage),
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      setResult(null);
      return;
    }
    setResult(calculatePowerFactor(parsed.data));
  }, [activeKw, currentPf, targetPf, voltage]);

  const handleReset = () => {
    setActiveKw(String(powerFactorDefaults.activeKw));
    setCurrentPf(String(powerFactorDefaults.currentPf));
    setTargetPf(String(powerFactorDefaults.targetPf));
    setVoltage(String(powerFactorDefaults.voltage));
    setResult(null);
    setError(null);
  };

  const resultRows = result
    ? [
        { label: "Required Capacitor", value: `${result.requiredKvar} kVAR`, highlight: true },
        { label: "Current kVA", value: `${result.currentKva} kVA` },
        { label: "Corrected kVA", value: `${result.correctedKva} kVA` },
        { label: "kVA Reduction", value: `${result.kvaReduction} kVA` },
        { label: "Current (before)", value: `${result.currentAmps} A` },
        { label: "Current (after)", value: `${result.correctedAmps} A`, highlight: true },
        { label: "Current Reduction", value: `${result.currentReduction}%` },
      ]
    : [];

  return (
    <ToolPage slug="power-factor">
      <HowItWorks>
        <p>Calculates capacitor bank size needed to correct power factor.</p>
        <p><strong>kVAR = P × (tan φ₁ − tan φ₂)</strong>. UK DNOs require PF ≥ 0.95 to avoid reactive charges.</p>
      </HowItWorks>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Load Parameters</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Active Power (kW)</label>
                <Input type="number" value={activeKw} onChange={(e) => setActiveKw(e.target.value)} min={0} step={1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Current Power Factor</label>
                <Input type="number" value={currentPf} onChange={(e) => setCurrentPf(e.target.value)} min={0.3} max={0.99} step={0.01} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Target Power Factor</label>
                <div className="flex gap-2">
                  {[0.9, 0.95, 0.98, 1.0].map((pf) => (
                    <Button key={pf} variant={targetPf === String(pf) ? "default" : "secondary"} size="sm" onClick={() => setTargetPf(String(pf))}>
                      {pf}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Supply Voltage (V)</label>
                <Input type="number" value={voltage} onChange={(e) => setVoltage(e.target.value)} min={0} step={1} />
              </div>

              {error && <div className="p-3 rounded-lg bg-[var(--error)]/10 text-[var(--error)] text-sm">{error}</div>}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCalculate} className="flex-1">Calculate</Button>
                <Button variant="secondary" onClick={handleReset}>Reset</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <ResultsPanel rows={resultRows} notes={result ? powerFactorAssumptions : undefined} />
      </div>
    </ToolPage>
  );
}
