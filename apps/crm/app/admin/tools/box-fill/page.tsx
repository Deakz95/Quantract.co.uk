"use client";

import { useState, useCallback } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { ResultsPanel } from "@/components/tools/ResultsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { boxFillInputSchema, type BoxFillOutput } from "@/lib/tools/box-fill/schema";
import { calculateBoxFill } from "@/lib/tools/box-fill/engine";
import { boxFillAssumptions, boxFillDefaults } from "@/lib/tools/box-fill/assumptions";

interface ItemRow {
  type: string;
  conductorSize: string;
  quantity: string;
}

export default function BoxFillPage() {
  const [standard, setStandard] = useState<"bs7671" | "nec">(boxFillDefaults.standard);
  const [boxVolume, setBoxVolume] = useState(String(boxFillDefaults.boxVolume));
  const [items, setItems] = useState<ItemRow[]>(
    boxFillDefaults.items.map((it) => ({
      type: it.type,
      conductorSize: "conductorSize" in it ? String(it.conductorSize) : "",
      quantity: String(it.quantity),
    }))
  );
  const [result, setResult] = useState<BoxFillOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateItem = (idx: number, field: keyof ItemRow, value: string) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, { type: "conductor", conductorSize: "2.5", quantity: "1" }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleCalculate = useCallback(() => {
    setError(null);
    const parsed = boxFillInputSchema.safeParse({
      standard,
      boxVolume: Number(boxVolume),
      items: items.map((it) => ({
        type: it.type,
        conductorSize: it.conductorSize ? Number(it.conductorSize) : undefined,
        quantity: Number(it.quantity),
      })),
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(". "));
      setResult(null);
      return;
    }
    setResult(calculateBoxFill(parsed.data));
  }, [standard, boxVolume, items]);

  const handleReset = () => {
    setStandard(boxFillDefaults.standard);
    setBoxVolume(String(boxFillDefaults.boxVolume));
    setItems(boxFillDefaults.items.map((it) => ({ type: it.type, conductorSize: "conductorSize" in it ? String(it.conductorSize) : "", quantity: String(it.quantity) })));
    setResult(null);
    setError(null);
  };

  const resultRows = result
    ? [
        { label: "Fill Percentage", value: `${result.fillPercent}%`, highlight: !result.compliant },
        { label: "Max Fill", value: `${result.maxFillPercent}%` },
        { label: "Compliant", value: result.compliant ? "Yes" : "No — exceeds limit", highlight: !result.compliant },
        { label: "Total Volume Used", value: `${result.totalVolume} ${result.unit}` },
        { label: "Box Volume", value: `${result.boxVolume} ${result.unit}` },
      ]
    : [];

  return (
    <ToolPage slug="box-fill">
      <HowItWorks>
        <p>Checks whether items fit within an electrical enclosure based on volume fill limits.</p>
        <p><strong>BS 7671:</strong> 80% practical fill. <strong>NEC 314.16:</strong> Volume allowances per conductor size.</p>
      </HowItWorks>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Box & Contents</CardTitle></CardHeader>
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
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Box Volume ({standard === "nec" ? "in³" : "cm³"})</label>
                <Input type="number" value={boxVolume} onChange={(e) => setBoxVolume(e.target.value)} min={0} step={0.1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Items</label>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <select value={item.type} onChange={(e) => updateItem(idx, "type", e.target.value)} className="flex-1 rounded-md border bg-[var(--background)] px-2 py-1.5 text-xs">
                        <option value="conductor">Conductor</option>
                        <option value="clamp">Clamp</option>
                        <option value="device">Device</option>
                        <option value="equipment_ground">Earth</option>
                        <option value="fitting">Fitting</option>
                      </select>
                      {item.type === "conductor" && (
                        <Input type="number" value={item.conductorSize} onChange={(e) => updateItem(idx, "conductorSize", e.target.value)} placeholder="mm²" className="w-16 text-xs" />
                      )}
                      <span className="text-xs text-[var(--muted-foreground)]">×</span>
                      <Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} className="w-14 text-xs" />
                      {items.length > 1 && <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeItem(idx)}>✕</Button>}
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-1" onClick={addItem}>+ Add item</Button>
              </div>

              {error && <div className="p-3 rounded-lg bg-[var(--error)]/10 text-[var(--error)] text-sm">{error}</div>}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCalculate} className="flex-1">Calculate</Button>
                <Button variant="secondary" onClick={handleReset}>Reset</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <ResultsPanel rows={resultRows} notes={result ? boxFillAssumptions : undefined} />
      </div>
    </ToolPage>
  );
}
