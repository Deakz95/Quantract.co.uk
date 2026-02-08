"use client";

import { useState } from "react";
import { Input, Label, NativeSelect, Button } from "@quantract/ui";

interface NewBoardData {
  name: string;
  description: string;
  designation: string;
  type: "single-phase" | "three-phase";
  manufacturer: string;
  model: string;
  location: string;
  ipRating: string;
  numWays: number;
  mainSwitch: { rating: string; type: string };
  rcdDetails: string;
}

interface AddBoardDialogProps {
  boardCount: number;
  onAdd: (data: NewBoardData) => void;
  onClose: () => void;
}

const PRESETS: { label: string; data: Partial<NewBoardData> }[] = [
  { label: "Standard 12-Way", data: { type: "single-phase", numWays: 12, mainSwitch: { rating: "100A", type: "Isolator" } } },
  { label: "18-Way Split Load", data: { type: "single-phase", numWays: 18, mainSwitch: { rating: "100A", type: "RCD" } } },
  { label: "24-Way 3-Phase TP&N", data: { type: "three-phase", numWays: 24, mainSwitch: { rating: "100A", type: "Isolator" } } },
  { label: "6-Way Garage/Shed", data: { type: "single-phase", numWays: 6, mainSwitch: { rating: "63A", type: "RCD" } } },
];

export function AddBoardDialog({ boardCount, onAdd, onClose }: AddBoardDialogProps) {
  const [form, setForm] = useState<NewBoardData>({
    name: `DB ${boardCount + 1}`,
    description: "",
    designation: `DB${boardCount + 1}`,
    type: "single-phase",
    manufacturer: "",
    model: "",
    location: "",
    ipRating: "",
    numWays: 12,
    mainSwitch: { rating: "100A", type: "Isolator" },
    rcdDetails: "",
  });

  const applyPreset = (preset: Partial<NewBoardData>) => {
    setForm((prev) => ({
      ...prev,
      ...preset,
      mainSwitch: preset.mainSwitch || prev.mainSwitch,
    }));
  };

  const handleSubmit = () => {
    onAdd(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded w-full max-w-[520px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Add Distribution Board</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Configure the new board or select a preset</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Presets */}
          <div>
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Quick Presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset.data)}
                  className="px-3 py-1.5 rounded-sm text-xs font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Board Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Board Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Main Consumer Unit" />
            </div>
            <div>
              <Label className="text-xs">Designation</Label>
              <Input value={form.designation} onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))} placeholder="e.g. DB1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. Main distribution board, hallway" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Board Type</Label>
              <NativeSelect value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as "single-phase" | "three-phase" }))}>
                <option value="single-phase">Single Phase</option>
                <option value="three-phase">Three Phase (TP&N)</option>
              </NativeSelect>
            </div>
            <div>
              <Label className="text-xs">Number of Ways</Label>
              <NativeSelect value={String(form.numWays)} onChange={(e) => setForm((p) => ({ ...p, numWays: parseInt(e.target.value) }))}>
                <option value="6">6</option>
                <option value="8">8</option>
                <option value="10">10</option>
                <option value="12">12</option>
                <option value="14">14</option>
                <option value="16">16</option>
                <option value="18">18</option>
                <option value="20">20</option>
                <option value="24">24</option>
                <option value="32">32</option>
              </NativeSelect>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Manufacturer</Label>
              <Input value={form.manufacturer} onChange={(e) => setForm((p) => ({ ...p, manufacturer: e.target.value }))} placeholder="e.g. Hager, MK" />
            </div>
            <div>
              <Label className="text-xs">Model</Label>
              <Input value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} placeholder="e.g. VML912" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Location</Label>
              <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="e.g. Hallway cupboard" />
            </div>
            <div>
              <Label className="text-xs">IP Rating</Label>
              <Input value={form.ipRating} onChange={(e) => setForm((p) => ({ ...p, ipRating: e.target.value }))} placeholder="e.g. IP30" />
            </div>
          </div>

          {/* Main Switch */}
          <div className="border border-[var(--border)] rounded-sm p-4 space-y-3">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Main Switch</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Type</Label>
                <Input value={form.mainSwitch.type} onChange={(e) => setForm((p) => ({ ...p, mainSwitch: { ...p.mainSwitch, type: e.target.value } }))} placeholder="e.g. Isolator, RCD" />
              </div>
              <div>
                <Label className="text-xs">Rating</Label>
                <Input value={form.mainSwitch.rating} onChange={(e) => setForm((p) => ({ ...p, mainSwitch: { ...p.mainSwitch, rating: e.target.value } }))} placeholder="e.g. 100A" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-[var(--border)] flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Add Board</Button>
        </div>
      </div>
    </div>
  );
}
