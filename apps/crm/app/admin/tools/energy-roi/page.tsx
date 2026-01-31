"use client";

import { useState, useCallback } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { ResultsPanel } from "@/components/tools/ResultsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { energyRoiInputSchema, type EnergyRoiOutput } from "@/lib/tools/energy-roi/schema";
import { calculateEnergyRoi } from "@/lib/tools/energy-roi/engine";
import { energyRoiAssumptions, energyRoiDefaults } from "@/lib/tools/energy-roi/assumptions";

export default function EnergyRoiPage() {
  const [fittingCount, setFittingCount] = useState(String(energyRoiDefaults.fittingCount));
  const [existingWatts, setExistingWatts] = useState(String(energyRoiDefaults.existingWatts));
  const [replacementWatts, setReplacementWatts] = useState(String(energyRoiDefaults.replacementWatts));
  const [dailyHours, setDailyHours] = useState(String(energyRoiDefaults.dailyHours));
  const [daysPerYear, setDaysPerYear] = useState(String(energyRoiDefaults.daysPerYear));
  const [costPerKwh, setCostPerKwh] = useState(String(energyRoiDefaults.costPerKwh));
  const [costPerFitting, setCostPerFitting] = useState(String(energyRoiDefaults.costPerFitting));
  const [result, setResult] = useState<EnergyRoiOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = useCallback(() => {
    setError(null);
    const parsed = energyRoiInputSchema.safeParse({
      fittingCount: Number(fittingCount),
      existingWatts: Number(existingWatts),
      replacementWatts: Number(replacementWatts),
      dailyHours: Number(dailyHours),
      daysPerYear: Number(daysPerYear),
      costPerKwh: Number(costPerKwh),
      costPerFitting: Number(costPerFitting),
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      setResult(null);
      return;
    }
    setResult(calculateEnergyRoi(parsed.data));
  }, [fittingCount, existingWatts, replacementWatts, dailyHours, daysPerYear, costPerKwh, costPerFitting]);

  const handleReset = () => {
    setFittingCount(String(energyRoiDefaults.fittingCount));
    setExistingWatts(String(energyRoiDefaults.existingWatts));
    setReplacementWatts(String(energyRoiDefaults.replacementWatts));
    setDailyHours(String(energyRoiDefaults.dailyHours));
    setDaysPerYear(String(energyRoiDefaults.daysPerYear));
    setCostPerKwh(String(energyRoiDefaults.costPerKwh));
    setCostPerFitting(String(energyRoiDefaults.costPerFitting));
    setResult(null);
    setError(null);
  };

  const resultRows = result
    ? [
        { label: "Annual Saving", value: `£${result.annualSavingPounds.toFixed(2)}`, highlight: true },
        { label: "Payback Period", value: `${result.paybackMonths} months`, highlight: true },
        { label: "Project Cost", value: `£${result.totalProjectCost.toFixed(2)}` },
        { label: "Energy Saved", value: `${result.annualSavingKwh.toFixed(0)} kWh/year` },
        { label: "CO₂ Saved", value: `${result.annualCo2SavingKg.toFixed(0)} kg/year` },
        { label: "5-Year Net Saving", value: `£${result.fiveYearNetSaving.toFixed(2)}` },
        { label: "Wattage Reduction", value: `${result.wattageReduction}%` },
      ]
    : [];

  return (
    <ToolPage slug="energy-roi">
      <HowItWorks>
        <p>Calculates ROI for LED lighting upgrades based on energy savings.</p>
        <p>Compares existing vs replacement wattage, calculates payback period, annual savings and CO₂ reduction.</p>
      </HowItWorks>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Project Details</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Number of Fittings</label>
                <Input type="number" value={fittingCount} onChange={(e) => setFittingCount(e.target.value)} min={1} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Existing (W each)</label>
                  <Input type="number" value={existingWatts} onChange={(e) => setExistingWatts(e.target.value)} min={0} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">LED (W each)</label>
                  <Input type="number" value={replacementWatts} onChange={(e) => setReplacementWatts(e.target.value)} min={0} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Daily Hours</label>
                  <Input type="number" value={dailyHours} onChange={(e) => setDailyHours(e.target.value)} min={0} max={24} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Days/Year</label>
                  <Input type="number" value={daysPerYear} onChange={(e) => setDaysPerYear(e.target.value)} min={1} max={366} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Electricity Cost (p/kWh)</label>
                <Input type="number" value={costPerKwh} onChange={(e) => setCostPerKwh(e.target.value)} min={0} step={0.1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Cost per Fitting (£)</label>
                <Input type="number" value={costPerFitting} onChange={(e) => setCostPerFitting(e.target.value)} min={0} step={0.01} />
              </div>

              {error && <div className="p-3 rounded-lg bg-[var(--error)]/10 text-[var(--error)] text-sm">{error}</div>}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCalculate} className="flex-1">Calculate</Button>
                <Button variant="secondary" onClick={handleReset}>Reset</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <ResultsPanel rows={resultRows} notes={result ? energyRoiAssumptions : undefined} />
      </div>
    </ToolPage>
  );
}
