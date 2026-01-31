"use client";

import { useState, useCallback } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { ResultsPanel } from "@/components/tools/ResultsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { ugrInputSchema, type UgrOutput } from "@/lib/tools/ugr-calculator/schema";
import { calculateUgr } from "@/lib/tools/ugr-calculator/engine";
import { ugrAssumptions, ugrDefaults } from "@/lib/tools/ugr-calculator/assumptions";

export default function UgrCalculatorPage() {
  const [roomLength, setRoomLength] = useState(String(ugrDefaults.roomLength));
  const [roomWidth, setRoomWidth] = useState(String(ugrDefaults.roomWidth));
  const [luminaireHeight, setLuminaireHeight] = useState(String(ugrDefaults.luminaireHeight));
  const [luminaireLumens, setLuminaireLumens] = useState(String(ugrDefaults.luminaireLumens));
  const [numberOfLuminaires, setNumberOfLuminaires] = useState(String(ugrDefaults.numberOfLuminaires));
  const [luminaireArea, setLuminaireArea] = useState(String(ugrDefaults.luminaireArea));
  const [backgroundLuminance, setBackgroundLuminance] = useState(String(ugrDefaults.backgroundLuminance));
  const [result, setResult] = useState<UgrOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = useCallback(() => {
    setError(null);
    const parsed = ugrInputSchema.safeParse({
      roomLength: Number(roomLength),
      roomWidth: Number(roomWidth),
      luminaireHeight: Number(luminaireHeight),
      luminaireLumens: Number(luminaireLumens),
      numberOfLuminaires: Number(numberOfLuminaires),
      luminaireArea: Number(luminaireArea),
      backgroundLuminance: Number(backgroundLuminance),
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      setResult(null);
      return;
    }
    setResult(calculateUgr(parsed.data));
  }, [roomLength, roomWidth, luminaireHeight, luminaireLumens, numberOfLuminaires, luminaireArea, backgroundLuminance]);

  const handleReset = () => {
    setRoomLength(String(ugrDefaults.roomLength));
    setRoomWidth(String(ugrDefaults.roomWidth));
    setLuminaireHeight(String(ugrDefaults.luminaireHeight));
    setLuminaireLumens(String(ugrDefaults.luminaireLumens));
    setNumberOfLuminaires(String(ugrDefaults.numberOfLuminaires));
    setLuminaireArea(String(ugrDefaults.luminaireArea));
    setBackgroundLuminance(String(ugrDefaults.backgroundLuminance));
    setResult(null);
    setError(null);
  };

  const resultRows = result
    ? [
        { label: "UGR Value", value: String(result.ugr), highlight: true },
        { label: "Rating", value: result.rating },
        { label: "Office Limit (≤19)", value: result.ugr <= 19 ? "OK" : "Exceeds", highlight: result.ugr > 19 },
        { label: "Industrial Limit (≤22)", value: result.ugr <= 22 ? "OK" : "Exceeds", highlight: result.ugr > 22 },
        { label: "Corridor Limit (≤25)", value: result.ugr <= 25 ? "OK" : "Exceeds", highlight: result.ugr > 25 },
      ]
    : [];

  return (
    <ToolPage slug="ugr-calculator">
      <HowItWorks>
        <p>Estimates Unified Glare Rating (UGR) — a measure of discomfort glare from luminaires. <strong>Estimator Mode</strong> — uses simplified assumptions.</p>
        <p><strong>UGR = 8 × log₁₀((0.25/Lb) × Σ(L²ω/p²))</strong></p>
        <p>Limits: Offices ≤19, Industrial ≤22, Corridors ≤25.</p>
      </HowItWorks>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Glare Parameters</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Room Length (m)</label>
                  <Input type="number" value={roomLength} onChange={(e) => setRoomLength(e.target.value)} min={0} step={0.1} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Room Width (m)</label>
                  <Input type="number" value={roomWidth} onChange={(e) => setRoomWidth(e.target.value)} min={0} step={0.1} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Luminaire Height Above Eye (m)</label>
                <Input type="number" value={luminaireHeight} onChange={(e) => setLuminaireHeight(e.target.value)} min={0} step={0.1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Luminaire Lumens</label>
                <Input type="number" value={luminaireLumens} onChange={(e) => setLuminaireLumens(e.target.value)} min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Number of Luminaires</label>
                <Input type="number" value={numberOfLuminaires} onChange={(e) => setNumberOfLuminaires(e.target.value)} min={1} step={1} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Luminaire Area (m²)</label>
                  <Input type="number" value={luminaireArea} onChange={(e) => setLuminaireArea(e.target.value)} min={0} step={0.01} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Background Luminance (cd/m²)</label>
                  <Input type="number" value={backgroundLuminance} onChange={(e) => setBackgroundLuminance(e.target.value)} min={0} step={1} />
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
          <ResultsPanel rows={resultRows} notes={result ? ugrAssumptions : undefined} />
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
