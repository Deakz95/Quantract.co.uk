"use client";

import { useEffect, useRef } from "react";
import { CIRCUIT_PRESETS } from "../../lib/circuitPresets";
import type { CircuitPreset } from "../../lib/circuitPresets";

interface CircuitPresetPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (preset: CircuitPreset) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export function CircuitPresetPicker({ isOpen, onClose, onSelect, anchorRef }: CircuitPresetPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-xl z-30 p-3 absolute"
      style={{ bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2 px-1">
        Add Circuit
      </p>
      <div className="grid grid-cols-3 gap-2 w-[280px]">
        {CIRCUIT_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const rating = preset.defaults.ocpdRating;
          const devType = preset.defaults.ocpdType;
          return (
            <button
              key={preset.id}
              onClick={() => onSelect(preset)}
              className="flex flex-col items-center gap-1 p-2 rounded-sm bg-[var(--muted)] hover:bg-[var(--primary)]/10 border border-transparent hover:border-[var(--primary)]/30 transition-all text-center"
            >
              <Icon className="w-5 h-5 text-[var(--primary)]" />
              <span className="text-[10px] font-semibold text-[var(--foreground)] leading-tight">
                {preset.label}
              </span>
              {rating && (
                <span className="text-[9px] text-[var(--muted-foreground)]">
                  {rating}A {devType}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
