import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useState, useEffect } from 'react';
import type { CertificateType } from '@quantract/shared/certificate-types';

// ── Types ──

export interface CertificateTypeDefaults {
  /** Default inspection interval in years */
  inspectionInterval?: number;
  /** Default retest wording shown on certificates */
  retestWording?: string;
  /** Default declaration text (overrides standard text if set) */
  declarationText?: string;
  /** Default recommended retest date offset (years from now) */
  retestDateOffset?: number;
}

export type AllCertificateDefaults = Partial<Record<CertificateType, CertificateTypeDefaults>>;

// ── Store ──

interface CertificateDefaultsStore {
  defaults: AllCertificateDefaults;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  getDefaults: (certType: CertificateType) => CertificateTypeDefaults;
  setDefaults: (certType: CertificateType, defaults: CertificateTypeDefaults) => void;
  updateDefaults: (certType: CertificateType, partial: Partial<CertificateTypeDefaults>) => void;
  clearDefaults: (certType: CertificateType) => void;
}

const EMPTY_DEFAULTS: CertificateTypeDefaults = {};

export const useCertificateDefaultsStore = create<CertificateDefaultsStore>()(
  persist(
    (set, get) => ({
      defaults: {},
      _hasHydrated: false,

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      getDefaults: (certType) =>
        get().defaults[certType] ?? EMPTY_DEFAULTS,

      setDefaults: (certType, defaults) =>
        set((state) => ({
          defaults: { ...state.defaults, [certType]: defaults },
        })),

      updateDefaults: (certType, partial) =>
        set((state) => ({
          defaults: {
            ...state.defaults,
            [certType]: { ...(state.defaults[certType] ?? {}), ...partial },
          },
        })),

      clearDefaults: (certType) =>
        set((state) => {
          const next = { ...state.defaults };
          delete next[certType];
          return { defaults: next };
        }),
    }),
    {
      name: 'quantract-certificate-defaults',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export const useCertificateDefaultsHydration = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hasHydrated = useCertificateDefaultsStore.getState()._hasHydrated;
    if (hasHydrated) {
      setHydrated(true);
    } else {
      const unsubscribe = useCertificateDefaultsStore.subscribe(
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

/** Standard inspection intervals per BS 7671 */
export const STANDARD_INTERVALS: Record<string, number> = {
  domestic: 10,
  commercial: 5,
  industrial: 3,
  "swimming-pool": 1,
  "caravan-park": 1,
  agricultural: 3,
  "construction-site": 3,
  "petrol-station": 1,
  cinema: 3,
  church: 5,
  "leisure-complex": 3,
  hospital: 5,
  "emergency-lighting": 3,
  "fire-alarm": 1,
};
