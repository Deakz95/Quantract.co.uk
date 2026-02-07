import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useState, useEffect } from 'react';

// ── Types ──

export type SignatureRole =
  | "engineer"
  | "supervisor"
  | "client"
  | "contractor"
  | "inspector"
  | "installer"
  | "designer";

export interface SignatureAsset {
  id: string;
  role: SignatureRole;
  label: string;
  /** PNG data URL of the signature */
  dataUrl: string;
  createdAt: string;
  isDefault: boolean;
}

// ── Store ──

interface SignatureAssetStore {
  assets: SignatureAsset[];
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  addAsset: (asset: SignatureAsset) => void;
  deleteAsset: (id: string) => void;
  setDefault: (id: string) => void;
  updateLabel: (id: string, label: string) => void;
  getAssetsForRole: (role: SignatureRole) => SignatureAsset[];
  getDefaultForRole: (role: SignatureRole) => SignatureAsset | undefined;
}

export const useSignatureAssetStore = create<SignatureAssetStore>()(
  persist(
    (set, get) => ({
      assets: [],
      _hasHydrated: false,

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      addAsset: (asset) =>
        set((state) => {
          // If this is the first for this role, make it default
          const existingForRole = state.assets.filter((a) => a.role === asset.role);
          const newAsset = existingForRole.length === 0
            ? { ...asset, isDefault: true }
            : asset;
          return { assets: [...state.assets, newAsset] };
        }),

      deleteAsset: (id) =>
        set((state) => {
          const toDelete = state.assets.find((a) => a.id === id);
          let updated = state.assets.filter((a) => a.id !== id);
          // If deleted asset was default, promote next one
          if (toDelete?.isDefault) {
            const nextForRole = updated.find((a) => a.role === toDelete.role);
            if (nextForRole) {
              updated = updated.map((a) =>
                a.id === nextForRole.id ? { ...a, isDefault: true } : a
              );
            }
          }
          return { assets: updated };
        }),

      setDefault: (id) =>
        set((state) => {
          const target = state.assets.find((a) => a.id === id);
          if (!target) return state;
          return {
            assets: state.assets.map((a) =>
              a.role === target.role
                ? { ...a, isDefault: a.id === id }
                : a
            ),
          };
        }),

      updateLabel: (id, label) =>
        set((state) => ({
          assets: state.assets.map((a) =>
            a.id === id ? { ...a, label } : a
          ),
        })),

      getAssetsForRole: (role) =>
        get().assets.filter((a) => a.role === role),

      getDefaultForRole: (role) =>
        get().assets.find((a) => a.role === role && a.isDefault),
    }),
    {
      name: 'quantract-signature-assets',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Hook to check if the signature store has hydrated
export const useSignatureAssetHydration = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hasHydrated = useSignatureAssetStore.getState()._hasHydrated;
    if (hasHydrated) {
      setHydrated(true);
    } else {
      const unsubscribe = useSignatureAssetStore.subscribe(
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
