"use client";

import { useState, useCallback } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { ResultsPanel } from "@/components/tools/ResultsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import {
  adiabaticInputSchema,
  type AdiabaticOutput,
} from "@/lib/tools/adiabatic/schema";
import { calculateAdiabatic } from "@/lib/tools/adiabatic/engine";
import { adiabaticAssumptions, adiabaticDefaults } from "@/lib/tools/adiabatic/assumptions";

export default function AdiabaticPage() {
  const [faultCurrent, setFaultCurrent] = useState(String(adiabaticDefaults.faultCurrent));
  const [disconnectionTime, setDisconnectionTime] = useState(String(adiabaticDefaults.disconnectionTime));
  const [material, setMaterial] = useState<"copper" | "aluminium">(adiabaticDefaults.material);
  const [kFactor, setKFactor] = useState("");
  const [result, setResult] = useState<AdiabaticOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = useCallback(() => {
    setError(null);
    const parsed = adiabaticInputSchema.safeParse({
      faultCurrent: Number(faultCurrent),
      disconnectionTime: Number(disconnectionTime),
      material,
      kFactor: kFactor ? Number(kFactor) : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      setResult(null);
      return;
    }
    setResult(calculateAdiabatic(parsed.data));
  }, [faultCurrent, disconnectionTime, material, kFactor]);

  const handleReset = () => {
    setFaultCurrent(String(adiabaticDefaults.faultCurrent));
    setDisconnectionTime(String(adiabaticDefaults.disconnectionTime));
    setMaterial(adiabaticDefaults.material);
    setKFactor("");
    setResult(null);
    setError(null);
  };

  const resultRows = result
    ? [
        { label: "Minimum CPC Size", value: `${result.minimumCsa} mm²`, highlight: true },
        { label: "Recommended Size", value: result.recommendedSize ? `${result.recommendedSize} mm²` : "—", highlight: true },
        { label: "k Factor Used", value: `${result.kFactor} (${result.kFactorSource})` },
        { label: "I²t (Let-through)", value: `${result.letThroughEnergy.toLocaleString()} A²s` },
      ]
    : [];

  return (
    <ToolPage slug="adiabatic">
      <HowItWorks>
        <p>Calculates minimum CPC (earth) size using the adiabatic equation from BS 7671.</p>
        <p><strong>S = √(I²t) / k</strong> — where I = fault current, t = disconnection time, k = material constant.</p>
        <p>Default k values: 115 (copper/PVC), 76 (aluminium/PVC). Override for XLPE or other insulation types.</p>
      </HowItWorks>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fault Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Prospective Fault Current (A)</label>
                <Input type="number" value={faultCurrent} onChange={(e) => setFaultCurrent(e.target.value)} min={0} step={1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Disconnection Time (s)</label>
                <Input type="number" value={disconnectionTime} onChange={(e) => setDisconnectionTime(e.target.value)} min={0} max={5} step={0.01} />
                <div className="flex flex-wrap gap-1 mt-1">
                  {[0.1, 0.2, 0.4, 1, 5].map((t) => (
                    <Button key={t} variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setDisconnectionTime(String(t))}>{t}s</Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Conductor Material</label>
                <div className="flex gap-2">
                  <Button variant={material === "copper" ? "default" : "secondary"} size="sm" onClick={() => setMaterial("copper")}>Copper</Button>
                  <Button variant={material === "aluminium" ? "default" : "secondary"} size="sm" onClick={() => setMaterial("aluminium")}>Aluminium</Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">k Factor (optional override)</label>
                <Input type="number" value={kFactor} onChange={(e) => setKFactor(e.target.value)} min={0} step={1} placeholder="Leave blank for default" />
              </div>

              {error && <div className="p-3 rounded-lg bg-[var(--error)]/10 text-[var(--error)] text-sm">{error}</div>}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCalculate} className="flex-1">Calculate</Button>
                <Button variant="secondary" onClick={handleReset}>Reset</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <ResultsPanel rows={resultRows} notes={result ? adiabaticAssumptions : undefined} />
      </div>
    </ToolPage>
  );
}
