"use client";

import { useState, useCallback } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { ResultsPanel } from "@/components/tools/ResultsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { maxDemandInputSchema, type MaxDemandOutput } from "@/lib/tools/max-demand/schema";
import { calculateMaxDemand } from "@/lib/tools/max-demand/engine";
import { maxDemandAssumptions, maxDemandDefaults } from "@/lib/tools/max-demand/assumptions";

interface LoadRow {
  description: string;
  connectedLoad: string;
  quantity: string;
  diversityFactor: string;
}

export default function MaxDemandPage() {
  const [profile, setProfile] = useState<"domestic" | "commercial" | "industrial" | "custom">(maxDemandDefaults.profile);
  const [supplyVoltage, setSupplyVoltage] = useState(String(maxDemandDefaults.supplyVoltage));
  const [loads, setLoads] = useState<LoadRow[]>(
    maxDemandDefaults.loads.map((l) => ({
      description: l.description,
      connectedLoad: String(l.connectedLoad),
      quantity: String(l.quantity),
      diversityFactor: "",
    }))
  );
  const [result, setResult] = useState<MaxDemandOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateLoad = (idx: number, field: keyof LoadRow, value: string) => {
    setLoads((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };
  const addLoad = () => setLoads((prev) => [...prev, { description: "", connectedLoad: "1000", quantity: "1", diversityFactor: "" }]);
  const removeLoad = (idx: number) => setLoads((prev) => prev.filter((_, i) => i !== idx));

  const handleCalculate = useCallback(() => {
    setError(null);
    const parsed = maxDemandInputSchema.safeParse({
      profile,
      supplyVoltage: Number(supplyVoltage),
      loads: loads.map((l) => ({
        description: l.description,
        connectedLoad: Number(l.connectedLoad),
        quantity: Number(l.quantity),
        diversityFactor: l.diversityFactor ? Number(l.diversityFactor) : undefined,
      })),
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      setResult(null);
      return;
    }
    setResult(calculateMaxDemand(parsed.data));
  }, [profile, supplyVoltage, loads]);

  const handleReset = () => {
    setProfile(maxDemandDefaults.profile);
    setSupplyVoltage(String(maxDemandDefaults.supplyVoltage));
    setLoads(maxDemandDefaults.loads.map((l) => ({ description: l.description, connectedLoad: String(l.connectedLoad), quantity: String(l.quantity), diversityFactor: "" })));
    setResult(null);
    setError(null);
  };

  const resultRows = result
    ? [
        { label: "Total Connected", value: `${(result.totalConnected / 1000).toFixed(1)} kW` },
        { label: "After Diversity", value: `${(result.totalAfterDiversity / 1000).toFixed(1)} kW`, highlight: true },
        { label: "Max Demand", value: `${result.maxDemandAmps} A`, highlight: true },
        { label: "Overall Diversity", value: `${(result.overallDiversity * 100).toFixed(0)}%` },
        { label: "Suggested Supply", value: `${result.suggestedSupply} A` },
      ]
    : [];

  return (
    <ToolPage slug="max-demand">
      <HowItWorks>
        <p>Estimates maximum demand by applying diversity factors to connected loads.</p>
        <p>Select a profile (Domestic 60%, Commercial 70%, Industrial 80%) or set custom diversity per item.</p>
      </HowItWorks>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Load Schedule</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Diversity Profile</label>
                <div className="flex flex-wrap gap-2">
                  {(["domestic", "commercial", "industrial", "custom"] as const).map((p) => (
                    <Button key={p} variant={profile === p ? "default" : "secondary"} size="sm" onClick={() => setProfile(p)}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Supply Voltage (V)</label>
                <Input type="number" value={supplyVoltage} onChange={(e) => setSupplyVoltage(e.target.value)} min={0} step={1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Loads</label>
                <div className="space-y-2">
                  {loads.map((load, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <Input value={load.description} onChange={(e) => updateLoad(idx, "description", e.target.value)} placeholder="Description" className="flex-1 text-xs" />
                      <Input type="number" value={load.connectedLoad} onChange={(e) => updateLoad(idx, "connectedLoad", e.target.value)} placeholder="W" className="w-20 text-xs" />
                      <span className="text-xs text-[var(--muted-foreground)]">×</span>
                      <Input type="number" value={load.quantity} onChange={(e) => updateLoad(idx, "quantity", e.target.value)} className="w-14 text-xs" />
                      {loads.length > 1 && <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeLoad(idx)}>✕</Button>}
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-1" onClick={addLoad}>+ Add load</Button>
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
          <ResultsPanel rows={resultRows} notes={result ? maxDemandAssumptions : undefined} />
          {result && (
            <Card>
              <CardHeader><CardTitle className="text-base">Load Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-[var(--muted-foreground)]">
                        <th className="pb-2 pr-2">Load</th>
                        <th className="pb-2 pr-2">Connected</th>
                        <th className="pb-2 pr-2">Div.</th>
                        <th className="pb-2">After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.loads.map((l, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-1 pr-2 text-xs">{l.description}</td>
                          <td className="py-1 pr-2">{l.totalConnected}W</td>
                          <td className="py-1 pr-2">{(l.diversityFactor * 100).toFixed(0)}%</td>
                          <td className="py-1">{l.afterDiversity}W</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ToolPage>
  );
}
