"use client";

import { useState, useCallback } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { ResultsPanel } from "@/components/tools/ResultsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { residentialLoadInputSchema, type ResidentialLoadOutput } from "@/lib/tools/residential-load/schema";
import { calculateResidentialLoad } from "@/lib/tools/residential-load/engine";
import { residentialLoadAssumptions, residentialLoadDefaults } from "@/lib/tools/residential-load/assumptions";

export default function ResidentialLoadPage() {
  const [lightingPoints, setLightingPoints] = useState(String(residentialLoadDefaults.lightingPoints));
  const [lightingWattsPerPoint, setLightingWattsPerPoint] = useState(String(residentialLoadDefaults.lightingWattsPerPoint));
  const [ringMains, setRingMains] = useState(String(residentialLoadDefaults.ringMains));
  const [radialCircuits, setRadialCircuits] = useState(String(residentialLoadDefaults.radialCircuits));
  const [cookerWatts, setCookerWatts] = useState(String(residentialLoadDefaults.cookerWatts));
  const [showers, setShowers] = useState(String(residentialLoadDefaults.showers));
  const [showerWattsEach, setShowerWattsEach] = useState(String(residentialLoadDefaults.showerWattsEach));
  const [immersionWatts, setImmersionWatts] = useState(String(residentialLoadDefaults.immersionWatts));
  const [storageHeaterWatts, setStorageHeaterWatts] = useState(String(residentialLoadDefaults.storageHeaterWatts));
  const [evChargerWatts, setEvChargerWatts] = useState(String(residentialLoadDefaults.evChargerWatts));
  const [otherFixedWatts, setOtherFixedWatts] = useState(String(residentialLoadDefaults.otherFixedWatts));
  const [result, setResult] = useState<ResidentialLoadOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = useCallback(() => {
    setError(null);
    const parsed = residentialLoadInputSchema.safeParse({
      lightingPoints: Number(lightingPoints),
      lightingWattsPerPoint: Number(lightingWattsPerPoint),
      ringMains: Number(ringMains),
      radialCircuits: Number(radialCircuits),
      cookerWatts: Number(cookerWatts),
      showers: Number(showers),
      showerWattsEach: Number(showerWattsEach),
      immersionWatts: Number(immersionWatts),
      storageHeaterWatts: Number(storageHeaterWatts),
      evChargerWatts: Number(evChargerWatts),
      otherFixedWatts: Number(otherFixedWatts),
      supplyVoltage: 230,
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      setResult(null);
      return;
    }
    setResult(calculateResidentialLoad(parsed.data));
  }, [lightingPoints, lightingWattsPerPoint, ringMains, radialCircuits, cookerWatts, showers, showerWattsEach, immersionWatts, storageHeaterWatts, evChargerWatts, otherFixedWatts]);

  const handleReset = () => {
    setLightingPoints(String(residentialLoadDefaults.lightingPoints));
    setLightingWattsPerPoint(String(residentialLoadDefaults.lightingWattsPerPoint));
    setRingMains(String(residentialLoadDefaults.ringMains));
    setRadialCircuits(String(residentialLoadDefaults.radialCircuits));
    setCookerWatts(String(residentialLoadDefaults.cookerWatts));
    setShowers(String(residentialLoadDefaults.showers));
    setShowerWattsEach(String(residentialLoadDefaults.showerWattsEach));
    setImmersionWatts(String(residentialLoadDefaults.immersionWatts));
    setStorageHeaterWatts(String(residentialLoadDefaults.storageHeaterWatts));
    setEvChargerWatts(String(residentialLoadDefaults.evChargerWatts));
    setOtherFixedWatts(String(residentialLoadDefaults.otherFixedWatts));
    setResult(null);
    setError(null);
  };

  const resultRows = result
    ? [
        { label: "Total Connected", value: `${(result.totalConnected / 1000).toFixed(1)} kW` },
        { label: "After Diversity", value: `${(result.totalAfterDiversity / 1000).toFixed(1)} kW`, highlight: true },
        { label: "Max Demand", value: `${result.maxDemandAmps} A`, highlight: true },
        { label: "Suggested Service", value: `${result.suggestedServiceSize} A` },
      ]
    : [];

  return (
    <ToolPage slug="residential-load">
      <HowItWorks>
        <p>Estimates domestic maximum demand using IET On-Site Guide Table 1B diversity rules.</p>
        <p>Applies category-specific diversity: 66% lighting, tiered ring/radial, 10A+30% cooker, 100% showers/EV.</p>
      </HowItWorks>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Dwelling Details</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Lighting Points</label>
                  <Input type="number" value={lightingPoints} onChange={(e) => setLightingPoints(e.target.value)} min={0} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">W per Point</label>
                  <Input type="number" value={lightingWattsPerPoint} onChange={(e) => setLightingWattsPerPoint(e.target.value)} min={0} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Ring Mains</label>
                  <Input type="number" value={ringMains} onChange={(e) => setRingMains(e.target.value)} min={0} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Radial Circuits</label>
                  <Input type="number" value={radialCircuits} onChange={(e) => setRadialCircuits(e.target.value)} min={0} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Cooker (W)</label>
                <Input type="number" value={cookerWatts} onChange={(e) => setCookerWatts(e.target.value)} min={0} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Showers (qty)</label>
                  <Input type="number" value={showers} onChange={(e) => setShowers(e.target.value)} min={0} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Shower W (each)</label>
                  <Input type="number" value={showerWattsEach} onChange={(e) => setShowerWattsEach(e.target.value)} min={0} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Immersion Heater (W)</label>
                <Input type="number" value={immersionWatts} onChange={(e) => setImmersionWatts(e.target.value)} min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Storage Heaters (W total)</label>
                <Input type="number" value={storageHeaterWatts} onChange={(e) => setStorageHeaterWatts(e.target.value)} min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">EV Charger (W)</label>
                <Input type="number" value={evChargerWatts} onChange={(e) => setEvChargerWatts(e.target.value)} min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Other Fixed Loads (W)</label>
                <Input type="number" value={otherFixedWatts} onChange={(e) => setOtherFixedWatts(e.target.value)} min={0} />
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
          <ResultsPanel rows={resultRows} notes={result ? residentialLoadAssumptions : undefined} />
          {result && (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Diversity Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-[var(--muted-foreground)]">
                          <th className="pb-2 pr-2">Category</th>
                          <th className="pb-2 pr-2">Connected</th>
                          <th className="pb-2 pr-2">Diversity</th>
                          <th className="pb-2">After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.breakdown.map((b, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-1 pr-2 text-xs">{b.category}</td>
                            <td className="py-1 pr-2">{b.connected}W</td>
                            <td className="py-1 pr-2 text-xs">{b.diversityApplied}</td>
                            <td className="py-1">{b.afterDiversity}W</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              {result.serviceOptions.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Service Options</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {result.serviceOptions.map((opt) => (
                        <div key={opt.size} className={`flex justify-between text-sm ${opt.size === result.suggestedServiceSize ? "font-semibold" : ""}`}>
                          <span>{opt.size}A</span>
                          <span className="text-[var(--muted-foreground)]">{opt.headroom}% headroom</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </ToolPage>
  );
}
