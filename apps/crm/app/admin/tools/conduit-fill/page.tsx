"use client";

import { useState, useCallback } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { ResultsPanel } from "@/components/tools/ResultsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import {
  conduitFillInputSchema,
  type ConduitFillOutput,
} from "@/lib/tools/conduit-fill/schema";
import { calculateConduitFill } from "@/lib/tools/conduit-fill/engine";
import { conduitFillAssumptions, conduitFillDefaults } from "@/lib/tools/conduit-fill/assumptions";

interface CableRow {
  diameter: string;
  quantity: string;
}

export default function ConduitFillPage() {
  const [standard, setStandard] = useState<"bs7671" | "nec">(conduitFillDefaults.standard);
  const [conduitDiameter, setConduitDiameter] = useState(String(conduitFillDefaults.conduitDiameter));
  const [cables, setCables] = useState<CableRow[]>(
    conduitFillDefaults.cables.map((c) => ({ diameter: String(c.diameter), quantity: String(c.quantity) }))
  );
  const [result, setResult] = useState<ConduitFillOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateCable = (idx: number, field: keyof CableRow, value: string) => {
    setCables((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const addCable = () => setCables((prev) => [...prev, { diameter: "9.0", quantity: "1" }]);
  const removeCable = (idx: number) => setCables((prev) => prev.filter((_, i) => i !== idx));

  const handleCalculate = useCallback(() => {
    setError(null);
    const parsed = conduitFillInputSchema.safeParse({
      standard,
      conduitDiameter: Number(conduitDiameter),
      cables: cables.map((c) => ({ diameter: Number(c.diameter), quantity: Number(c.quantity) })),
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      setResult(null);
      return;
    }
    setResult(calculateConduitFill(parsed.data));
  }, [standard, conduitDiameter, cables]);

  const handleReset = () => {
    setStandard(conduitFillDefaults.standard);
    setConduitDiameter(String(conduitFillDefaults.conduitDiameter));
    setCables(conduitFillDefaults.cables.map((c) => ({ diameter: String(c.diameter), quantity: String(c.quantity) })));
    setResult(null);
    setError(null);
  };

  const resultRows = result
    ? [
        { label: "Fill Percentage", value: `${result.fillPercent}%`, highlight: !result.compliant },
        { label: "Max Fill Allowed", value: `${result.maxFillPercent}%` },
        { label: "Compliant", value: result.compliant ? "Yes" : "No — exceeds limit", highlight: !result.compliant },
        { label: "Total Cables", value: String(result.totalCables) },
        { label: "Cable Area", value: `${result.totalCableArea} mm²` },
        { label: "Conduit Area", value: `${result.conduitArea} mm²` },
        { label: "Space Factor", value: result.spaceFactor },
      ]
    : [];

  return (
    <ToolPage slug="conduit-fill">
      <HowItWorks>
        <p>Checks whether cables fit within a conduit based on cross-sectional area fill limits.</p>
        <p><strong>BS 7671:</strong> 45% max fill. <strong>NEC:</strong> 53% (1 cable), 31% (2), 40% (3+).</p>
      </HowItWorks>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conduit & Cables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Standard</label>
                <div className="flex gap-2">
                  <Button variant={standard === "bs7671" ? "default" : "secondary"} size="sm" onClick={() => setStandard("bs7671")}>BS 7671</Button>
                  <Button variant={standard === "nec" ? "default" : "secondary"} size="sm" onClick={() => setStandard("nec")}>NEC</Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Conduit Internal Diameter (mm)</label>
                <Input type="number" value={conduitDiameter} onChange={(e) => setConduitDiameter(e.target.value)} min={0} step={0.1} />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Cables</label>
                <div className="space-y-2">
                  {cables.map((cable, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={cable.diameter}
                        onChange={(e) => updateCable(idx, "diameter", e.target.value)}
                        min={0}
                        step={0.1}
                        className="flex-1"
                        placeholder="Ø mm"
                      />
                      <span className="text-sm text-[var(--muted-foreground)]">×</span>
                      <Input
                        type="number"
                        value={cable.quantity}
                        onChange={(e) => updateCable(idx, "quantity", e.target.value)}
                        min={1}
                        step={1}
                        className="w-20"
                      />
                      {cables.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeCable(idx)}>✕</Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-1" onClick={addCable}>+ Add cable size</Button>
              </div>

              {error && <div className="p-3 rounded-lg bg-[var(--error)]/10 text-[var(--error)] text-sm">{error}</div>}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCalculate} className="flex-1">Calculate</Button>
                <Button variant="secondary" onClick={handleReset}>Reset</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <ResultsPanel rows={resultRows} notes={result ? conduitFillAssumptions : undefined} />
      </div>
    </ToolPage>
  );
}
