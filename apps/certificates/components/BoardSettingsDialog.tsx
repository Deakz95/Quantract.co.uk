"use client";

import { useState } from "react";
import { Input, Label, NativeSelect, Button } from "@quantract/ui";

interface BoardSettings {
  name: string;
  description: string;
  designation: string;
  type: "single-phase" | "three-phase";
  manufacturer: string;
  model: string;
  location: string;
  ipRating: string;
  mainSwitch: { rating: string; type: string };
  rcdDetails: string;
}

interface BoardSettingsDialogProps {
  board: BoardSettings;
  onSave: (data: BoardSettings) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function BoardSettingsDialog({ board, onSave, onDelete, onClose }: BoardSettingsDialogProps) {
  const [form, setForm] = useState<BoardSettings>({ ...board });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    onSave(form);
  };

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete();
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Board Settings</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Edit board properties or delete this board</p>
        </div>

        <div className="p-6 space-y-5">
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
              <Label className="text-xs">Location</Label>
              <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="e.g. Hallway cupboard" />
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

          <div>
            <Label className="text-xs">IP Rating</Label>
            <Input value={form.ipRating} onChange={(e) => setForm((p) => ({ ...p, ipRating: e.target.value }))} placeholder="e.g. IP30" />
          </div>

          {/* Main Switch */}
          <div className="border border-[var(--border)] rounded-xl p-4 space-y-3">
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

          <div>
            <Label className="text-xs">RCD Details</Label>
            <Input value={form.rcdDetails} onChange={(e) => setForm((p) => ({ ...p, rcdDetails: e.target.value }))} placeholder="e.g. 100mA Type S time delayed" />
          </div>
        </div>

        <div className="p-6 border-t border-[var(--border)] flex gap-3 justify-between">
          <Button
            variant="secondary"
            onClick={handleDelete}
            className={confirmDelete ? "bg-red-500/10 text-red-500 border-red-500/30" : "text-[var(--error)]"}
          >
            {confirmDelete ? "Confirm Delete" : "Delete Board"}
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
