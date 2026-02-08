"use client";

import { useState } from "react";
import { Button } from "@quantract/ui";
import { useSignatureAssetStore, type SignatureRole, type SignatureAsset } from "../../lib/signatureAssets";
import { SignaturePad } from "./SignaturePad";

interface SignaturePickerProps {
  /** Which signature role to filter saved assets by */
  role: SignatureRole;
  /** Display label, e.g. "Inspector Signature" */
  label: string;
  /** Current signature data URL (null = not signed) */
  value: string | null;
  /** Called with data URL or null */
  onChange: (dataUrl: string | null) => void;
  /** When true, show preview only — cannot change */
  readOnly?: boolean;
}

/**
 * Signature input with dropdown for saved signatures + "Draw new" option.
 *
 * Replaces the old SignatureCapture wherever it was used.
 * - Shows saved signature assets for the given role
 * - "Draw new" opens SignaturePad modal
 * - Drawn signature can optionally be saved to profile
 */
export function SignaturePicker({
  role,
  label,
  value,
  onChange,
  readOnly,
}: SignaturePickerProps) {
  const { getAssetsForRole, addAsset } = useSignatureAssetStore();
  const [showPad, setShowPad] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [saveToProfile, setSaveToProfile] = useState(false);

  const assets = getAssetsForRole(role);

  const handleSelectAsset = (asset: SignatureAsset) => {
    onChange(asset.dataUrl);
    setShowDropdown(false);
  };

  const handleDrawSave = (dataUrl: string) => {
    onChange(dataUrl);

    if (saveToProfile) {
      addAsset({
        id: crypto.randomUUID(),
        role,
        label: `${label} — ${new Date().toLocaleDateString("en-GB")}`,
        dataUrl,
        createdAt: new Date().toISOString(),
        isDefault: false,
      });
    }

    setShowPad(false);
    setSaveToProfile(false);
  };

  const handleClear = () => {
    onChange(null);
  };

  // Read-only: just show preview
  if (readOnly) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--foreground)]">{label}</label>
        {value ? (
          <SignaturePreview dataUrl={value} />
        ) : (
          <div className="border border-[var(--border)] rounded-sm p-4 text-center text-sm text-[var(--muted-foreground)]">
            Not signed
          </div>
        )}
      </div>
    );
  }

  // Has a signature — show preview with clear/change
  if (value) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--foreground)]">{label}</label>
        <SignaturePreview dataUrl={value} />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleClear}>
            Clear Signature
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowDropdown(true)}>
            Change
          </Button>
        </div>
        {showDropdown && (
          <SignatureDropdown
            assets={assets}
            onSelectAsset={handleSelectAsset}
            onDrawNew={() => { setShowDropdown(false); setShowPad(true); }}
            onClose={() => setShowDropdown(false)}
          />
        )}
      </div>
    );
  }

  // No signature — show picker
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--foreground)]">{label}</label>

      {showPad ? (
        <div className="space-y-2">
          <SignaturePad
            onSave={handleDrawSave}
            onCancel={() => { setShowPad(false); setSaveToProfile(false); }}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveToProfile}
              onChange={(e) => setSaveToProfile(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--primary)]"
            />
            <span className="text-xs text-[var(--muted-foreground)]">Save to profile for reuse</span>
          </label>
        </div>
      ) : (
        <>
          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            {assets.length > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setShowDropdown(true)}>
                <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Use Saved ({assets.length})
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setShowPad(true)}>
              <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
              </svg>
              Draw Signature
            </Button>
          </div>

          {/* Inline hint */}
          {assets.length === 0 && (
            <p className="text-xs text-[var(--muted-foreground)]">
              Draw a signature, or save one in Settings for quick reuse
            </p>
          )}

          {/* Dropdown */}
          {showDropdown && (
            <SignatureDropdown
              assets={assets}
              onSelectAsset={handleSelectAsset}
              onDrawNew={() => { setShowDropdown(false); setShowPad(true); }}
              onClose={() => setShowDropdown(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ──

function SignaturePreview({ dataUrl }: { dataUrl: string }) {
  return (
    <div className="border border-[var(--border)] rounded-sm p-3 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt="Signature"
        className="max-h-[80px] mx-auto"
      />
    </div>
  );
}

function SignatureDropdown({
  assets,
  onSelectAsset,
  onDrawNew,
  onClose,
}: {
  assets: SignatureAsset[];
  onSelectAsset: (asset: SignatureAsset) => void;
  onDrawNew: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      {/* Dropdown */}
      <div className="relative z-50">
        <div className="absolute left-0 right-0 top-0 bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
          {assets.length > 0 && (
            <div className="max-h-[200px] overflow-y-auto">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => onSelectAsset(asset)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--muted)]/50 transition-colors border-b border-[var(--border)] last:border-0"
                >
                  <div className="w-16 h-8 border border-[var(--border)] rounded bg-white flex items-center justify-center overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.dataUrl} alt="" className="max-h-[28px] max-w-[56px]" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <span className="text-sm font-medium text-[var(--foreground)] truncate block">{asset.label}</span>
                    {asset.isDefault && (
                      <span className="text-[10px] text-[var(--primary)] font-medium">Default</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={onDrawNew}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--muted)]/50 transition-colors text-left"
          >
            <div className="w-16 h-8 border border-dashed border-[var(--border)] rounded flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-[var(--muted-foreground)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <span className="text-sm font-medium text-[var(--foreground)]">Draw new signature</span>
          </button>
        </div>
      </div>
    </>
  );
}
