import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useState, useEffect } from 'react';

// ── Types ──

export interface InstrumentPreset {
  id: string;
  make: string;
  model: string;
  serialNumber: string;
  calibrationDate: string;
  expiryDate: string;
  /** User-friendly label, e.g. "Megger MFT1741+" */
  label: string;
  isDefault: boolean;
  createdAt: string;
}

// ── Store ──

interface InstrumentPresetStore {
  presets: InstrumentPreset[];
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  addPreset: (preset: InstrumentPreset) => void;
  updatePreset: (id: string, data: Partial<Omit<InstrumentPreset, 'id'>>) => void;
  deletePreset: (id: string) => void;
  setDefault: (id: string) => void;
  getDefault: () => InstrumentPreset | undefined;
  getPresets: () => InstrumentPreset[];
}

export const useInstrumentPresetStore = create<InstrumentPresetStore>()(
  persist(
    (set, get) => ({
      presets: [],
      _hasHydrated: false,

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      addPreset: (preset) =>
        set((state) => {
          // If this is the first preset, make it default
          const newPreset = state.presets.length === 0
            ? { ...preset, isDefault: true }
            : preset;
          return { presets: [...state.presets, newPreset] };
        }),

      updatePreset: (id, data) =>
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        })),

      deletePreset: (id) =>
        set((state) => {
          const toDelete = state.presets.find((p) => p.id === id);
          let updated = state.presets.filter((p) => p.id !== id);
          // If deleted preset was default, promote next one
          if (toDelete?.isDefault && updated.length > 0) {
            updated = updated.map((p, i) =>
              i === 0 ? { ...p, isDefault: true } : p
            );
          }
          return { presets: updated };
        }),

      setDefault: (id) =>
        set((state) => ({
          presets: state.presets.map((p) => ({
            ...p,
            isDefault: p.id === id,
          })),
        })),

      getDefault: () => get().presets.find((p) => p.isDefault),

      getPresets: () => get().presets,
    }),
    {
      name: 'quantract-instrument-presets',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Hook to check if the instrument store has hydrated
export const useInstrumentPresetHydration = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hasHydrated = useInstrumentPresetStore.getState()._hasHydrated;
    if (hasHydrated) {
      setHydrated(true);
    } else {
      const unsubscribe = useInstrumentPresetStore.subscribe(
        (state) => {
          if (state._hasHydrated) {
            setHydrated(true);
            unsubscribe();
          }
        }
      );
      return unsubscribe;
    }
  }, []);

  return hydrated;
};

/**
 * Convert an instrument preset to the fields expected by testInstruments section.
 */
export function presetToTestInstruments(preset: InstrumentPreset): Record<string, string> {
  return {
    instrumentSet: `${preset.make} ${preset.model}`.trim(),
    multiFunctionalSerial: preset.serialNumber,
    // Calibration info stored but user can override individual fields
  };
}
