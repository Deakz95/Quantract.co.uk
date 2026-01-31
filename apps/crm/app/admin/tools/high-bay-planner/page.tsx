"use client";

import { useState, useCallback } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { ResultsPanel } from "@/components/tools/ResultsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { highBayInputSchema, type HighBayOutput } from "@/lib/tools/high-bay-planner/schema";
import { calculateHighBay } from "@/lib/tools/high-bay-planner/engine";
import { highBayAssumptions, highBayDefaults } from "@/lib/tools/high-bay-planner/assumptions";

export default function HighBayPlannerPage() {
  const [areaLength, setAreaLength] = useState(String(highBayDefaults.areaLength));
  const [areaWidth, setAreaWidth] = useState(String(highBayDefaults.areaWidth));
  const [mountingHeight, setMountingHeight] = useState(String(highBayDefaults.mountingHeight));
  const [targetLux, setTargetLux] = useState(String(highBayDefaults.targetLux));
  const [luminaireLumens, setLuminaireLumens] = useState(String(highBayDefaults.luminaireLumens));
  const [targetShr, setTargetShr] = useState(String(highBayDefaults.targetShr));
  const [cu, setCu] = useState(String(highBayDefaults.cu));
  const [mf, setMf] = useState(String(highBayDefaults.mf));
  const [result, setResult] = useState<HighBayOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = useCallback(() => {
    setError(null);
    const parsed = highBayInputSchema.safeParse({
      areaLength: Number(areaLength),
      areaWidth: Number(areaWidth),
      mountingHeight: Number(mountingHeight),
      targetLux: Number(targetLux),
      luminaireLumens: Number(luminaireLumens),
      targetShr: Number(targetShr),
      cu: Number(cu),
      mf: Number(mf),
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      setResult(null);
      return;
    }
    setResult(calculateHighBay(parsed.data));
  }, [areaLength, areaWidth, mountingHeight, targetLux, luminaireLumens, targetShr, cu, mf]);

  const handleReset = () => {
    setAreaLength(String(highBayDefaults.areaLength));
    setAreaWidth(String(highBayDefaults.areaWidth));
    setMountingHeight(String(highBayDefaults.mountingHeight));
    setTargetLux(String(highBayDefaults.targetLux));
    setLuminaireLumens(String(highBayDefaults.luminaireLumens));
    setTargetShr(String(highBayDefaults.targetShr));
    setCu(String(highBayDefaults.cu));
    setMf(String(highBayDefaults.mf));
    setResult(null);
    setError(null);
  };

  const resultRows = result
    ? [
        { label: "Luminaires", value: String(result.luminaireCount), highlight: true },
        { label: "Grid Layout", value: `${result.gridRows} × ${result.gridCols}` },
        { label: "Achieved Lux", value: `${result.achievedLux} lux`, highlight: true },
        { label: "Area", value: `${result.area} m²` },
        { label: "Spacing (L × W)", value: `${result.spacingLength}m × ${result.spacingWidth}m` },
        { label: "SHR", value: `${result.actualShr} (${result.shrCompliant ? "OK" : "exceeds"})`, highlight: !result.shrCompliant },
      ]
    : [];

  return (
    <ToolPage slug="high-bay-planner">
      <HowItWorks>
        <p>Plans luminaire layout for warehouses and industrial spaces using lumen method with SHR constraints.</p>
        <p>Typical: Storage 100-150 lux, Picking 200-300, Detailed work 300-500 (CIBSE LG1).</p>
      </HowItWorks>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Space & Fittings</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Length (m)</label>
                  <Input type="number" value={areaLength} onChange={(e) => setAreaLength(e.target.value)} min={0} step={0.1} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Width (m)</label>
                  <Input type="number" value={areaWidth} onChange={(e) => setAreaWidth(e.target.value)} min={0} step={0.1} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Mounting Height (m)</label>
                <Input type="number" value={mountingHeight} onChange={(e) => setMountingHeight(e.target.value)} min={0} step={0.1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Target Lux</label>
                <Input type="number" value={targetLux} onChange={(e) => setTargetLux(e.target.value)} min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Luminaire Lumens</label>
                <Input type="number" value={luminaireLumens} onChange={(e) => setLuminaireLumens(e.target.value)} min={0} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">SHR</label>
                  <Input type="number" value={targetShr} onChange={(e) => setTargetShr(e.target.value)} min={0} max={2} step={0.1} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">CU</label>
                  <Input type="number" value={cu} onChange={(e) => setCu(e.target.value)} min={0.1} max={1} step={0.01} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">MF</label>
                  <Input type="number" value={mf} onChange={(e) => setMf(e.target.value)} min={0.1} max={1} step={0.01} />
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

        <div className="space-y-4">
          <ResultsPanel rows={resultRows} notes={result ? highBayAssumptions : undefined} />
          {result && result.recommendations.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Recommendations</CardTitle></CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm text-[var(--foreground)]">
                  {result.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ToolPage>
  );
}
