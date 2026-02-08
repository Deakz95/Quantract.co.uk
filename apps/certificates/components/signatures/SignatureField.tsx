"use client";

import { useState } from "react";
import { Button, Input } from "@quantract/ui";
import { SignaturePadDialog } from "./SignaturePadDialog";
import {
  useSignatureAssetStore,
  type SignatureRole,
  type SignatureAsset,
} from "../../lib/signatureAssets";
import type { SignatureValue } from "@quantract/shared/certificate-types";
import {
  createDrawnSignature,
  createTypedSignature,
} from "@quantract/shared/certificate-types";

interface SignatureFieldProps {
  /** Signature ID / role (e.g. "inspector", "designer", "client") */
  signatureId: string;
  /** Display label (e.g. "Inspector Signature") */
  label: string;
  /** Whether this signature is required */
  required?: boolean;
  /** Current signature value (from data._signatures) */
  value?: SignatureValue | null;
  /** Called with new SignatureValue or null on clear */
  onChange: (value: SignatureValue | null) => void;
  /** Read-only mode — show preview only */
  readOnly?: boolean;
}

/**
 * Unified signature field component (CERT-A21).
 *
 * Supports three signing methods:
 * 1. **Preset** — Select a saved signature from dropdown
 * 2. **Drawn** — Open modal pad to draw
 * 3. **Typed** — Type name as fallback
 *
 * Each field is fully isolated — its own modal, no shared canvas.
 */
export function SignatureField({
  signatureId,
  label,
  required,
  value,
  onChange,
  readOnly,
}: SignatureFieldProps) {
  const { getAssetsForRole } = useSignatureAssetStore();
  const [showPad, setShowPad] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showTyped, setShowTyped] = useState(false);
  const [typedName, setTypedName] = useState("");

  // Map signatureId to asset role (most map directly)
  const assetRole = (signatureId === "customer" ? "client" : signatureId) as SignatureRole;
  const assets = getAssetsForRole(assetRole);

  const isSigned = value && value.signedAtISO && (value.image?.dataUrl || value.typedName);

  const handleSelectAsset = (asset: SignatureAsset) => {
    onChange(createDrawnSignature(asset.dataUrl, asset.label, asset.id));
    setShowDropdown(false);
  };

  const handleDrawSave = (dataUrl: string) => {
    onChange(createDrawnSignature(dataUrl));
    setShowPad(false);
  };

  const handleTypedSave = () => {
    const name = typedName.trim();
    if (!name) return;
    onChange(createTypedSignature(name));
    setShowTyped(false);
    setTypedName("");
  };

  const handleClear = () => {
    onChange(null);
  };

  // ── Read-only mode ──
  if (readOnly) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
          {required && <span className="text-xs text-[var(--destructive)]">*</span>}
          {isSigned && (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--success)] font-medium">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
              Signed
            </span>
          )}
        </div>
        {isSigned ? (
          <SignedPreview value={value!} />
        ) : (
          <div className="border border-dashed border-[var(--border)] rounded-xl p-4 text-center text-sm text-[var(--muted-foreground)]">
            Not signed
          </div>
        )}
      </div>
    );
  }

  // ── Signed state — show preview with change/clear ──
  if (isSigned) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
          {required && <span className="text-xs text-[var(--destructive)]">*</span>}
          <span className="inline-flex items-center gap-1 text-xs text-[var(--success)] font-medium">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
            Signed
          </span>
        </div>
        <SignedPreview value={value!} />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowPad(true)}>
            Change
          </Button>
          <Button variant="secondary" size="sm" onClick={handleClear}>
            Clear
          </Button>
        </div>
        <SignaturePadDialog
          open={showPad}
          title={`${label}`}
          onSave={handleDrawSave}
          onCancel={() => setShowPad(false)}
        />
      </div>
    );
  }

  // ── Unsigned state — show signing options ──
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
        {required && <span className="text-xs text-[var(--destructive)]">*</span>}
      </div>

      {/* Typed name form */}
      {showTyped ? (
        <div className="flex gap-2">
          <Input
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Enter full name"
            className="flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTypedSave();
              if (e.key === "Escape") setShowTyped(false);
            }}
          />
          <Button size="sm" onClick={handleTypedSave} disabled={!typedName.trim()}>
            Sign
          </Button>
          <Button variant="secondary" size="sm" onClick={() => { setShowTyped(false); setTypedName(""); }}>
            Cancel
          </Button>
        </div>
      ) : (
        <>
          {/* Action buttons */}
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
              Draw
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowTyped(true)}>
              <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
              Type Name
            </Button>
          </div>

          {assets.length === 0 && (
            <p className="text-xs text-[var(--muted-foreground)]">
              Draw a signature, type a name, or save one in Settings for quick reuse
            </p>
          )}
        </>
      )}

      {/* Preset dropdown */}
      {showDropdown && (
        <PresetDropdown
          assets={assets}
          onSelect={handleSelectAsset}
          onDrawNew={() => { setShowDropdown(false); setShowPad(true); }}
          onClose={() => setShowDropdown(false)}
        />
      )}

      {/* Draw modal */}
      <SignaturePadDialog
        open={showPad}
        title={label}
        onSave={handleDrawSave}
        onCancel={() => setShowPad(false)}
      />
    </div>
  );
}

// ── Sub-components ──

function SignedPreview({ value }: { value: SignatureValue }) {
  const date = new Date(value.signedAtISO).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="border border-[var(--border)] rounded-xl p-3 bg-white">
      {value.image?.dataUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={value.image.dataUrl}
          alt="Signature"
          className="max-h-[80px] mx-auto"
        />
      ) : value.typedName ? (
        <div className="text-center text-lg italic text-[var(--foreground)] font-serif py-2">
          {value.typedName}
        </div>
      ) : null}
      <div className="mt-1.5 text-[10px] text-[var(--muted-foreground)] text-center space-x-2">
        {value.signedByName && <span>{value.signedByName}</span>}
        <span>{date}</span>
        {value.method === "preset" && <span className="opacity-60">(preset)</span>}
      </div>
    </div>
  );
}

function PresetDropdown({
  assets,
  onSelect,
  onDrawNew,
  onClose,
}: {
  assets: SignatureAsset[];
  onSelect: (asset: SignatureAsset) => void;
  onDrawNew: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="relative z-50">
        <div className="absolute left-0 right-0 top-0 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
          {assets.length > 0 && (
            <div className="max-h-[200px] overflow-y-auto">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => onSelect(asset)}
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
