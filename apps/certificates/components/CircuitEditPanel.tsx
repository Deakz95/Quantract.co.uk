"use client";

import { useState, useEffect } from "react";
import { Input, Label, NativeSelect, Button } from "@quantract/ui";

interface CircuitData {
  id: string;
  num: number | string;
  description: string;
  type: string;
  rating: string;
  phase?: string;
  bsen?: string;
  cableMm2?: string;
  cpcMm2?: string;
  cableType?: string;
  maxZs?: string;
  zs?: string;
  r1r2?: string;
  r2?: string;
  insMohm?: string;
  rcdMa?: string;
  rcdMs?: string;
  rcdType?: string;
  status?: string;
  code?: string;
  isEmpty?: boolean;
}

interface CircuitEditPanelProps {
  circuit: CircuitData | null;
  boardType: "single-phase" | "three-phase";
  onSave: (circuit: CircuitData) => void;
  onDelete: (circuitId: string) => void;
  onClose: () => void;
}

export function CircuitEditPanel({ circuit, boardType, onSave, onDelete, onClose }: CircuitEditPanelProps) {
  const [form, setForm] = useState<CircuitData>({
    id: "",
    num: "",
    description: "",
    type: "",
    rating: "",
  });

  useEffect(() => {
    if (circuit) {
      setForm({ ...circuit });
    }
  }, [circuit]);

  if (!circuit) return null;

  const update = (field: keyof CircuitData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(form);
  };

  const handleDelete = () => {
    if (confirm("Delete this circuit?")) {
      onDelete(form.id);
    }
  };

  return (
    <div className="w-[380px] bg-[var(--card)] border-l border-[var(--border)] h-full overflow-y-auto p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[var(--foreground)]">Edit Circuit {form.num}</h3>
        <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Identity */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Identity</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Circuit No.</Label>
            <Input value={String(form.num)} onChange={(e) => update("num", e.target.value)} placeholder="1" />
          </div>
          {boardType === "three-phase" && (
            <div>
              <Label className="text-xs">Phase</Label>
              <NativeSelect value={form.phase || ""} onChange={(e) => update("phase", e.target.value)}>
                <option value="">Select...</option>
                <option value="L1">L1</option>
                <option value="L2">L2</option>
                <option value="L3">L3</option>
                <option value="TPN">TP&N</option>
              </NativeSelect>
            </div>
          )}
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Input value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="e.g. Kitchen sockets" />
        </div>
      </div>

      {/* Protection */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Protection</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Type</Label>
            <NativeSelect value={form.type} onChange={(e) => update("type", e.target.value)}>
              <option value="">Select...</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </NativeSelect>
          </div>
          <div>
            <Label className="text-xs">Rating (A)</Label>
            <Input value={form.rating} onChange={(e) => update("rating", e.target.value)} placeholder="32" />
          </div>
        </div>
        <div>
          <Label className="text-xs">BS EN</Label>
          <Input value={form.bsen || ""} onChange={(e) => update("bsen", e.target.value)} placeholder="e.g. 60898" />
        </div>
      </div>

      {/* Cable */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Cable</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Live mm2</Label>
            <Input value={form.cableMm2 || ""} onChange={(e) => update("cableMm2", e.target.value)} placeholder="2.5" />
          </div>
          <div>
            <Label className="text-xs">CPC mm2</Label>
            <Input value={form.cpcMm2 || ""} onChange={(e) => update("cpcMm2", e.target.value)} placeholder="1.5" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Cable Type</Label>
          <Input value={form.cableType || ""} onChange={(e) => update("cableType", e.target.value)} placeholder="e.g. 6242Y T&E" />
        </div>
      </div>

      {/* Test Results */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Test Results</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Max Zs (Ohm)</Label>
            <Input value={form.maxZs || ""} onChange={(e) => update("maxZs", e.target.value)} placeholder="1.37" />
          </div>
          <div>
            <Label className="text-xs">Zs (Ohm)</Label>
            <Input value={form.zs || ""} onChange={(e) => update("zs", e.target.value)} placeholder="0.45" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">R1+R2 (Ohm)</Label>
            <Input value={form.r1r2 || ""} onChange={(e) => update("r1r2", e.target.value)} placeholder="0.25" />
          </div>
          <div>
            <Label className="text-xs">R2 (Ohm)</Label>
            <Input value={form.r2 || ""} onChange={(e) => update("r2", e.target.value)} placeholder="0.15" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Insulation (MOhm)</Label>
          <Input value={form.insMohm || ""} onChange={(e) => update("insMohm", e.target.value)} placeholder=">200" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">RCD mA</Label>
            <Input value={form.rcdMa || ""} onChange={(e) => update("rcdMa", e.target.value)} placeholder="30" />
          </div>
          <div>
            <Label className="text-xs">RCD ms</Label>
            <Input value={form.rcdMs || ""} onChange={(e) => update("rcdMs", e.target.value)} placeholder="18" />
          </div>
          <div>
            <Label className="text-xs">RCD Type</Label>
            <NativeSelect value={form.rcdType || ""} onChange={(e) => update("rcdType", e.target.value)}>
              <option value="">-</option>
              <option value="AC">AC</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="F">F</option>
            </NativeSelect>
          </div>
        </div>
      </div>

      {/* Status & Code */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Status</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Status</Label>
            <NativeSelect value={form.status || ""} onChange={(e) => update("status", e.target.value)}>
              <option value="">Select...</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="warning">Warning</option>
              <option value="untested">Untested</option>
            </NativeSelect>
          </div>
          <div>
            <Label className="text-xs">Code</Label>
            <NativeSelect value={form.code || ""} onChange={(e) => update("code", e.target.value)}>
              <option value="">None</option>
              <option value="C1">C1 - Danger present</option>
              <option value="C2">C2 - Potentially dangerous</option>
              <option value="C3">C3 - Improvement recommended</option>
              <option value="FI">FI - Further investigation</option>
            </NativeSelect>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isEmpty"
            checked={form.isEmpty || false}
            onChange={(e) => update("isEmpty", e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--primary)]"
          />
          <Label htmlFor="isEmpty" className="mb-0 text-xs">Mark as spare / empty way</Label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
        <Button onClick={handleSave} className="flex-1">Save Circuit</Button>
        <Button variant="secondary" onClick={handleDelete} className="text-[var(--error)]">Delete</Button>
      </div>
    </div>
  );
}
