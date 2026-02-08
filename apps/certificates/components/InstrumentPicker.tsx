"use client";

import { useState } from "react";
import { Button } from "@quantract/ui";
import {
  useInstrumentPresetStore,
  presetToTestInstruments,
  type InstrumentPreset,
} from "../lib/instrumentPresets";

interface InstrumentPickerProps {
  /** Called when a preset is selected — returns field map to merge into testInstruments */
  onSelect: (fields: Record<string, string>, preset: InstrumentPreset) => void;
}

/**
 * Dropdown to select a saved test instrument preset.
 * Renders nothing if no presets are saved.
 */
export function InstrumentPicker({ onSelect }: InstrumentPickerProps) {
  const { presets } = useInstrumentPresetStore();
  const [open, setOpen] = useState(false);

  if (presets.length === 0) return null;

  const isExpired = (d: string) => d && new Date(d) < new Date();

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        Use Saved Instrument
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 w-80 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-[240px] overflow-y-auto">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onSelect(presetToTestInstruments(preset), preset);
                    setOpen(false);
                  }}
                  className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-[var(--muted)]/50 transition-colors border-b border-[var(--border)] last:border-0 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-[var(--foreground)] truncate">
                        {preset.label}
                      </span>
                      {preset.isDefault && (
                        <span className="text-[9px] text-[var(--primary)] font-medium">Default</span>
                      )}
                      {isExpired(preset.expiryDate) && (
                        <span className="text-[9px] text-red-500 font-medium">Expired</span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {preset.make} {preset.model}
                      {preset.serialNumber && ` — S/N: ${preset.serialNumber}`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
