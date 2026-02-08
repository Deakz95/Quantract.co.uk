"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Label } from "@quantract/ui";
import {
  useInstrumentPresetStore,
  type InstrumentPreset,
} from "../../../lib/instrumentPresets";

export default function InstrumentsSettingsPage() {
  const { presets, addPreset, updatePreset, deletePreset, setDefault } =
    useInstrumentPresetStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    make: "",
    model: "",
    serialNumber: "",
    calibrationDate: "",
    expiryDate: "",
    label: "",
  });

  const resetForm = () => {
    setForm({ make: "", model: "", serialNumber: "", calibrationDate: "", expiryDate: "", label: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = () => {
    const label = form.label.trim() || `${form.make} ${form.model}`.trim() || "Untitled";
    if (editingId) {
      updatePreset(editingId, { ...form, label });
      setEditingId(null);
    } else {
      addPreset({
        id: crypto.randomUUID(),
        ...form,
        label,
        isDefault: false,
        createdAt: new Date().toISOString(),
      });
    }
    resetForm();
  };

  const handleEdit = (preset: InstrumentPreset) => {
    setForm({
      make: preset.make,
      model: preset.model,
      serialNumber: preset.serialNumber,
      calibrationDate: preset.calibrationDate,
      expiryDate: preset.expiryDate,
      label: preset.label,
    });
    setEditingId(preset.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this test instrument preset?")) return;
    deletePreset(id);
  };

  const isExpired = (expiryDate: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return expiry <= thirtyDays && expiry >= new Date();
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold">Test Instruments</h1>
            <p className="text-xs text-[var(--muted-foreground)]">
              Save your MFT and test instruments for quick selection in certificates
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Add / Edit form */}
        {showForm ? (
          <div className="border border-[var(--border)] rounded-sm p-5 bg-[var(--card)] space-y-4">
            <h2 className="text-base font-semibold">
              {editingId ? "Edit Instrument" : "Add Test Instrument"}
            </h2>
            <div>
              <Label htmlFor="inst-label">Display Name</Label>
              <Input
                id="inst-label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Megger MFT1741+ (Main)"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inst-make">Make</Label>
                <Input
                  id="inst-make"
                  value={form.make}
                  onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))}
                  placeholder="e.g. Megger"
                />
              </div>
              <div>
                <Label htmlFor="inst-model">Model</Label>
                <Input
                  id="inst-model"
                  value={form.model}
                  onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                  placeholder="e.g. MFT1741+"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="inst-serial">Serial Number</Label>
              <Input
                id="inst-serial"
                value={form.serialNumber}
                onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                placeholder="e.g. SN-12345678"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inst-cal">Calibration Date</Label>
                <Input
                  id="inst-cal"
                  type="date"
                  value={form.calibrationDate}
                  onChange={(e) => setForm((f) => ({ ...f, calibrationDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="inst-exp">Expiry Date</Label>
                <Input
                  id="inst-exp"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!form.make.trim() && !form.model.trim()}>
                {editingId ? "Update" : "Save Instrument"}
              </Button>
              <Button variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setShowForm(true)}>
              + Add Instrument
            </Button>
          </div>
        )}

        {/* Preset list */}
        {presets.length === 0 && !showForm ? (
          <div className="border border-dashed border-[var(--border)] rounded-sm p-8 text-center text-sm text-[var(--muted-foreground)]">
            <p className="mb-2">No test instruments saved yet</p>
            <p>Add your MFT and other test instruments for quick selection when filling certificates</p>
          </div>
        ) : (
          <div className="space-y-2">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className={`flex items-center gap-4 p-4 rounded-sm border transition-colors ${
                  preset.isDefault
                    ? "border-[var(--primary)]/30 bg-[var(--primary)]/5"
                    : "border-[var(--border)]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--foreground)] truncate">
                      {preset.label}
                    </span>
                    {preset.isDefault && (
                      <span className="text-[10px] text-[var(--primary)] font-medium px-1.5 py-0.5 rounded-full bg-[var(--primary)]/10">
                        Default
                      </span>
                    )}
                    {isExpired(preset.expiryDate) && (
                      <span className="text-[10px] text-red-500 font-medium px-1.5 py-0.5 rounded-full bg-red-500/10">
                        Expired
                      </span>
                    )}
                    {!isExpired(preset.expiryDate) && isExpiringSoon(preset.expiryDate) && (
                      <span className="text-[10px] text-amber-600 font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10">
                        Expiring soon
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5 space-x-3">
                    <span>{preset.make} {preset.model}</span>
                    {preset.serialNumber && <span>S/N: {preset.serialNumber}</span>}
                    {preset.calibrationDate && (
                      <span>
                        Cal: {new Date(preset.calibrationDate).toLocaleDateString("en-GB")}
                      </span>
                    )}
                    {preset.expiryDate && (
                      <span>
                        Exp: {new Date(preset.expiryDate).toLocaleDateString("en-GB")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!preset.isDefault && (
                    <button
                      onClick={() => setDefault(preset.id)}
                      className="p-1.5 rounded-sm text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                      title="Set as default"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(preset)}
                    className="p-1.5 rounded-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/50 transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(preset.id)}
                    className="p-1.5 rounded-sm text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
