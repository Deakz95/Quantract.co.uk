"use client";

import { useState, useCallback } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { ResultsPanel } from "@/components/tools/ResultsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { lumenMethodInputSchema, type LumenMethodOutput } from "@/lib/tools/lumen-method/schema";
import { calculateLumenMethod } from "@/lib/tools/lumen-method/engine";
import { lumenMethodAssumptions, lumenMethodDefaults } from "@/lib/tools/lumen-method/assumptions";

export default function LumenMethodPage() {
  const [targetLux, setTargetLux] = useState(String(lumenMethodDefaults.targetLux));
  const [roomLength, setRoomLength] = useState(String(lumenMethodDefaults.roomLength));
  const [roomWidth, setRoomWidth] = useState(String(lumenMethodDefaults.roomWidth));
  const [luminaireLumens, setLuminaireLumens] = useState(String(lumenMethodDefaults.luminaireLumens));
  const [cu, setCu] = useState(String(lumenMethodDefaults.cu));
  const [mf, setMf] = useState(String(lumenMethodDefaults.mf));
  const [mountingHeight, setMountingHeight] = useState("");
  const [maxShr, setMaxShr] = useState(String(lumenMethodDefaults.maxShr));
  const [result, setResult] = useState<LumenMethodOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = useCallback(() => {
    setError(null);
    const parsed = lumenMethodInputSchema.safeParse({
      targetLux: Number(targetLux),
      roomLength: Number(roomLength),
      roomWidth: Number(roomWidth),
      luminaireLumens: Number(luminaireLumens),
      cu: Number(cu),
      mf: Number(mf),
      mountingHeight: mountingHeight ? Number(mountingHeight) : undefined,
      maxShr: Number(maxShr),
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      setResult(null);
      return;
    }
    setResult(calculateLumenMethod(parsed.data));
  }, [targetLux, roomLength, roomWidth, luminaireLumens, cu, mf, mountingHeight, maxShr]);

  const handleReset = () => {
    setTargetLux(String(lumenMethodDefaults.targetLux));
    setRoomLength(String(lumenMethodDefaults.roomLength));
    setRoomWidth(String(lumenMethodDefaults.roomWidth));
    setLuminaireLumens(String(lumenMethodDefaults.luminaireLumens));
    setCu(String(lumenMethodDefaults.cu));
    setMf(String(lumenMethodDefaults.mf));
    setMountingHeight("");
    setMaxShr(String(lumenMethodDefaults.maxShr));
    setResult(null);
    setError(null);
  };

  const resultRows = result
    ? [
        { label: "Luminaires Required", value: String(result.luminaireCount), highlight: true },
        { label: "Grid Layout", value: `${result.gridRows} × ${result.gridCols}` },
        { label: "Achieved Lux", value: `${result.achievedLux} lux`, highlight: true },
        { label: "Room Area", value: `${result.roomArea} m²` },
        ...(result.roomIndex !== null ? [{ label: "Room Index", value: String(result.roomIndex) }] : []),
        { label: "Spacing (L × W)", value: `${result.spacingLength}m × ${result.spacingWidth}m` },
        ...(result.actualShr !== null ? [
          { label: "SHR", value: `${result.actualShr} (${result.shrCompliant ? "OK" : "exceeds max"})`, highlight: !result.shrCompliant },
        ] : []),
      ]
    : [];

  return (
    <ToolPage slug="lumen-method">
      <HowItWorks>
        <p>Calculates number of luminaires needed using the lumen method.</p>
        <p><strong>N = (E × A) / (Φ × CU × MF)</strong> — per CIBSE SLL Code for Lighting.</p>
        <p>Typical lux levels: Office 500, Corridor 100, Warehouse 150, Retail 300.</p>
      </HowItWorks>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Room & Luminaire</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Target Lux</label>
                <Input type="number" value={targetLux} onChange={(e) => setTargetLux(e.target.value)} min={0} />
                <div className="flex flex-wrap gap-1 mt-1">
                  {[100, 200, 300, 500, 750].map((lx) => (
                    <Button key={lx} variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setTargetLux(String(lx))}>{lx}</Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Length (m)</label>
                  <Input type="number" value={roomLength} onChange={(e) => setRoomLength(e.target.value)} min={0} step={0.1} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Width (m)</label>
                  <Input type="number" value={roomWidth} onChange={(e) => setRoomWidth(e.target.value)} min={0} step={0.1} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Luminaire Lumens</label>
                <Input type="number" value={luminaireLumens} onChange={(e) => setLuminaireLumens(e.target.value)} min={0} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">CU (0-1)</label>
                  <Input type="number" value={cu} onChange={(e) => setCu(e.target.value)} min={0.1} max={1} step={0.01} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">MF (0-1)</label>
                  <Input type="number" value={mf} onChange={(e) => setMf(e.target.value)} min={0.1} max={1} step={0.01} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Mounting Height (m, optional)</label>
                <Input type="number" value={mountingHeight} onChange={(e) => setMountingHeight(e.target.value)} min={0} step={0.1} placeholder="For RI & SHR check" />
              </div>

              {error && <div className="p-3 rounded-lg bg-[var(--error)]/10 text-[var(--error)] text-sm">{error}</div>}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCalculate} className="flex-1">Calculate</Button>
                <Button variant="secondary" onClick={handleReset}>Reset</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <ResultsPanel rows={resultRows} notes={result ? lumenMethodAssumptions : undefined} />
      </div>
    </ToolPage>
  );
}
