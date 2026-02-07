import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useState, useEffect } from 'react';
import type { CertificateType } from '@quantract/shared/certificate-types';

// ── Types ──

export interface StoredTemplate {
  id: string;
  name: string;
  certificateType: CertificateType;
  level: "company" | "engineer";
  data: Record<string, unknown>;
  sectionIds: string[];
  created_at: string;
  updated_at: string;
}

export interface CompanyDefaults {
  contractorDetails?: Record<string, unknown>;
  supplyCharacteristics?: Record<string, unknown>;
  earthingArrangements?: Record<string, unknown>;
  testInstruments?: Record<string, unknown>;
  [key: string]: Record<string, unknown> | undefined;
}

// ── Store ──

interface TemplateStore {
  templates: StoredTemplate[];
  companyDefaults: CompanyDefaults;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  addTemplate: (template: StoredTemplate) => void;
  updateTemplate: (id: string, data: Partial<StoredTemplate>) => void;
  deleteTemplate: (id: string) => void;
  getTemplate: (id: string) => StoredTemplate | undefined;
  getTemplatesForType: (type: CertificateType) => StoredTemplate[];

  setCompanyDefaults: (defaults: CompanyDefaults) => void;
  updateCompanyDefaults: (partial: Partial<CompanyDefaults>) => void;
}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      templates: [],
      companyDefaults: {},
      _hasHydrated: false,

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      addTemplate: (template) =>
        set((state) => ({
          templates: [template, ...state.templates],
        })),

      updateTemplate: (id, data) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id
              ? { ...t, ...data, updated_at: new Date().toISOString() }
              : t
          ),
        })),

      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        })),

      getTemplate: (id) => get().templates.find((t) => t.id === id),

      getTemplatesForType: (type) =>
        get().templates.filter((t) => t.certificateType === type),

      setCompanyDefaults: (defaults) =>
        set({ companyDefaults: defaults }),

      updateCompanyDefaults: (partial) =>
        set((state) => ({
          companyDefaults: { ...state.companyDefaults, ...partial },
        })),
    }),
    {
      name: 'quantract-templates-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Hook to check if the template store has hydrated
export const useTemplateStoreHydration = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hasHydrated = useTemplateStore.getState()._hasHydrated;
    if (hasHydrated) {
      setHydrated(true);
    } else {
      const unsubscribe = useTemplateStore.subscribe(
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
