"use client";

import { useState, useCallback } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { ResultsPanel } from "@/components/tools/ResultsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import {
  conduitBendingInputSchema,
  type ConduitBendingOutput,
} from "@/lib/tools/conduit-bending/schema";
import { calculateConduitBending } from "@/lib/tools/conduit-bending/engine";
import { conduitBendingAssumptions, conduitBendingDefaults } from "@/lib/tools/conduit-bending/assumptions";

export default function ConduitBendingPage() {
  const [bendType, setBendType] = useState<"offset" | "saddle" | "ninety">(conduitBendingDefaults.bendType);
  const [offsetHeight, setOffsetHeight] = useState(String(conduitBendingDefaults.offsetHeight));
  const [bendAngle, setBendAngle] = useState(String(conduitBendingDefaults.bendAngle));
  const [conduitDiameter, setConduitDiameter] = useState(String(conduitBendingDefaults.conduitDiameter));
  const [result, setResult] = useState<ConduitBendingOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = useCallback(() => {
    setError(null);
    const parsed = conduitBendingInputSchema.safeParse({
      bendType,
      offsetHeight: Number(offsetHeight),
      bendAngle: Number(bendAngle),
      conduitDiameter: Number(conduitDiameter),
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      setResult(null);
      return;
    }
    setResult(calculateConduitBending(parsed.data));
  }, [bendType, offsetHeight, bendAngle, conduitDiameter]);

  const handleReset = () => {
    setBendType(conduitBendingDefaults.bendType);
    setOffsetHeight(String(conduitBendingDefaults.offsetHeight));
    setBendAngle(String(conduitBendingDefaults.bendAngle));
    setConduitDiameter(String(conduitBendingDefaults.conduitDiameter));
    setResult(null);
    setError(null);
  };

  const resultRows = result
    ? [
        { label: "Bend Type", value: result.description, highlight: true },
        { label: "Angle Used", value: `${result.angleUsed}°` },
        ...(result.markSpacing !== null ? [{ label: "Mark Spacing", value: `${result.markSpacing} mm` }] : []),
        ...(result.shrinkage !== null ? [{ label: "Shrinkage", value: `${result.shrinkage} mm` }] : []),
        ...(result.gain !== null ? [{ label: "Gain", value: `${result.gain} mm` }] : []),
      ]
    : [];

  return (
    <ToolPage slug="conduit-bending">
      <HowItWorks>
        <p>Calculates mark spacing, shrinkage, and gain for common conduit bends.</p>
        <p><strong>Offset:</strong> spacing = offset / sin(angle). <strong>Saddle:</strong> 3-bend technique. <strong>90°:</strong> take-up and gain.</p>
      </HowItWorks>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bend Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Bend Type</label>
                <div className="flex gap-2">
                  {(["offset", "saddle", "ninety"] as const).map((t) => (
                    <Button key={t} variant={bendType === t ? "default" : "secondary"} size="sm" onClick={() => setBendType(t)}>
                      {t === "offset" ? "Offset" : t === "saddle" ? "Saddle" : "90°"}
                    </Button>
                  ))}
                </div>
              </div>
              {bendType !== "ninety" && (
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Offset Height (mm)</label>
                  <Input type="number" value={offsetHeight} onChange={(e) => setOffsetHeight(e.target.value)} min={0} step={1} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Bend Angle (°)</label>
                <div className="flex flex-wrap gap-2">
                  {(bendType === "ninety" ? [90] : [10, 22.5, 30, 45, 60]).map((a) => (
                    <Button key={a} variant={bendAngle === String(a) ? "default" : "secondary"} size="sm" onClick={() => setBendAngle(String(a))}>
                      {a}°
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Conduit Diameter (mm)</label>
                <div className="flex gap-2">
                  {[20, 25, 32].map((d) => (
                    <Button key={d} variant={conduitDiameter === String(d) ? "default" : "secondary"} size="sm" onClick={() => setConduitDiameter(String(d))}>
                      {d}mm
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

        <div className="space-y-4">
          <ResultsPanel rows={resultRows} notes={result ? conduitBendingAssumptions : undefined} />
          {result && result.steps.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Step-by-Step</CardTitle></CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-1 text-sm text-[var(--foreground)]">
                  {result.steps.map((step, i) => <li key={i}>{step}</li>)}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ToolPage>
  );
}
