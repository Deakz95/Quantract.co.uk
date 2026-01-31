"use client";

import { useState, useCallback } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { ResultsPanel } from "@/components/tools/ResultsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { transformerSizingInputSchema, type TransformerSizingOutput } from "@/lib/tools/transformer-sizing/schema";
import { calculateTransformerSizing } from "@/lib/tools/transformer-sizing/engine";
import { transformerSizingAssumptions, transformerSizingDefaults } from "@/lib/tools/transformer-sizing/assumptions";

export default function TransformerSizingPage() {
  const [loadKw, setLoadKw] = useState(String(transformerSizingDefaults.loadKw));
  const [powerFactor, setPowerFactor] = useState(String(transformerSizingDefaults.powerFactor));
  const [primaryVoltage, setPrimaryVoltage] = useState(String(transformerSizingDefaults.primaryVoltage));
  const [secondaryVoltage, setSecondaryVoltage] = useState(String(transformerSizingDefaults.secondaryVoltage));
  const [growthAllowance, setGrowthAllowance] = useState(String(transformerSizingDefaults.growthAllowance));
  const [result, setResult] = useState<TransformerSizingOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = useCallback(() => {
    setError(null);
    const parsed = transformerSizingInputSchema.safeParse({
      loadKw: Number(loadKw),
      powerFactor: Number(powerFactor),
      primaryVoltage: Number(primaryVoltage),
      secondaryVoltage: Number(secondaryVoltage),
      growthAllowance: Number(growthAllowance),
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      setResult(null);
      return;
    }
    setResult(calculateTransformerSizing(parsed.data));
  }, [loadKw, powerFactor, primaryVoltage, secondaryVoltage, growthAllowance]);

  const handleReset = () => {
    setLoadKw(String(transformerSizingDefaults.loadKw));
    setPowerFactor(String(transformerSizingDefaults.powerFactor));
    setPrimaryVoltage(String(transformerSizingDefaults.primaryVoltage));
    setSecondaryVoltage(String(transformerSizingDefaults.secondaryVoltage));
    setGrowthAllowance(String(transformerSizingDefaults.growthAllowance));
    setResult(null);
    setError(null);
  };

  const resultRows = result
    ? [
        { label: "Required kVA", value: `${result.requiredKva} kVA` },
        { label: "With Growth", value: `${result.requiredKvaWithGrowth} kVA` },
        { label: "Recommended Size", value: `${result.recommendedKva} kVA`, highlight: true },
        { label: "Loading", value: `${result.loadingPercent}%` },
        { label: "Primary Current", value: `${result.primaryCurrent} A` },
        { label: "Secondary Current", value: `${result.secondaryCurrent} A`, highlight: true },
      ]
    : [];

  return (
    <ToolPage slug="transformer-sizing">
      <HowItWorks>
        <p>Sizes a transformer based on load kW, power factor, and growth allowance.</p>
        <p><strong>kVA = kW / PF</strong>. Selects next standard IEC 60076 transformer size up.</p>
      </HowItWorks>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Load & Transformer</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Total Load (kW)</label>
                <Input type="number" value={loadKw} onChange={(e) => setLoadKw(e.target.value)} min={0} step={1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Power Factor</label>
                <Input type="number" value={powerFactor} onChange={(e) => setPowerFactor(e.target.value)} min={0.5} max={1} step={0.01} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Primary (V)</label>
                  <Input type="number" value={primaryVoltage} onChange={(e) => setPrimaryVoltage(e.target.value)} min={0} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Secondary (V)</label>
                  <Input type="number" value={secondaryVoltage} onChange={(e) => setSecondaryVoltage(e.target.value)} min={0} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Growth Allowance</label>
                <div className="flex gap-2">
                  {[0.1, 0.2, 0.3].map((g) => (
                    <Button key={g} variant={growthAllowance === String(g) ? "default" : "secondary"} size="sm" onClick={() => setGrowthAllowance(String(g))}>
                      {g * 100}%
                    </Button>
                  ))}
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

        <ResultsPanel rows={resultRows} notes={result ? transformerSizingAssumptions : undefined} />
      </div>
    </ToolPage>
  );
}
