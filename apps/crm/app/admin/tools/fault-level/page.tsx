"use client";

import { useState, useCallback } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { ResultsPanel } from "@/components/tools/ResultsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { faultLevelInputSchema, type FaultLevelOutput } from "@/lib/tools/fault-level/schema";
import { calculateFaultLevel } from "@/lib/tools/fault-level/engine";
import { faultLevelAssumptions, faultLevelDefaults } from "@/lib/tools/fault-level/assumptions";

export default function FaultLevelPage() {
  const [voltage, setVoltage] = useState(String(faultLevelDefaults.voltage));
  const [zs, setZs] = useState(String(faultLevelDefaults.zs));
  const [zpn, setZpn] = useState("");
  const [transformerImpedancePercent, setTransformerImpedancePercent] = useState("");
  const [transformerKva, setTransformerKva] = useState("");
  const [result, setResult] = useState<FaultLevelOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = useCallback(() => {
    setError(null);
    const parsed = faultLevelInputSchema.safeParse({
      voltage: Number(voltage),
      zs: Number(zs),
      zpn: zpn ? Number(zpn) : undefined,
      transformerImpedancePercent: transformerImpedancePercent ? Number(transformerImpedancePercent) : undefined,
      transformerKva: transformerKva ? Number(transformerKva) : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      setResult(null);
      return;
    }
    setResult(calculateFaultLevel(parsed.data));
  }, [voltage, zs, zpn, transformerImpedancePercent, transformerKva]);

  const handleReset = () => {
    setVoltage(String(faultLevelDefaults.voltage));
    setZs(String(faultLevelDefaults.zs));
    setZpn("");
    setTransformerImpedancePercent("");
    setTransformerKva("");
    setResult(null);
    setError(null);
  };

  const resultRows = result
    ? [
        { label: "PFC (L-E)", value: `${result.pfc_earth} A`, highlight: true },
        { label: "PFC (L-N)", value: `${result.pfc_neutral} A`, highlight: true },
        ...(result.pfc_transformer !== null ? [{ label: "PFC (Transformer)", value: `${result.pfc_transformer} A` }] : []),
        ...(result.faultLevelMva !== null ? [{ label: "Fault Level", value: `${result.faultLevelMva} MVA` }] : []),
        ...(result.warning ? [{ label: "Warning", value: result.warning, highlight: true }] : []),
      ]
    : [];

  return (
    <ToolPage slug="fault-level">
      <HowItWorks>
        <p>Estimates prospective fault current from earth fault loop impedance (Zs).</p>
        <p><strong>Ipf = Uo / Zs</strong> per BS 7671 Regulation 434. Estimator mode — not a substitute for formal IEC 60909 study.</p>
      </HowItWorks>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Fault Parameters</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Supply Voltage (V)</label>
                <div className="flex gap-2">
                  <Button variant={voltage === "230" ? "default" : "secondary"} size="sm" onClick={() => setVoltage("230")}>230V</Button>
                  <Button variant={voltage === "400" ? "default" : "secondary"} size="sm" onClick={() => setVoltage("400")}>400V</Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Earth Loop Impedance Zs (Ω)</label>
                <Input type="number" value={zs} onChange={(e) => setZs(e.target.value)} min={0} step={0.01} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Phase-Neutral Impedance Zpn (Ω, optional)</label>
                <Input type="number" value={zpn} onChange={(e) => setZpn(e.target.value)} min={0} step={0.01} placeholder="Defaults to Zs × 0.8" />
              </div>

              <div className="border-t pt-3">
                <p className="text-xs text-[var(--muted-foreground)] mb-2">Transformer (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Impedance (%)</label>
                    <Input type="number" value={transformerImpedancePercent} onChange={(e) => setTransformerImpedancePercent(e.target.value)} min={0} max={20} step={0.1} placeholder="e.g. 4.75" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Rating (kVA)</label>
                    <Input type="number" value={transformerKva} onChange={(e) => setTransformerKva(e.target.value)} min={0} step={1} placeholder="e.g. 500" />
                  </div>
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

        <ResultsPanel rows={resultRows} notes={result ? faultLevelAssumptions : undefined} />
      </div>
    </ToolPage>
  );
}
