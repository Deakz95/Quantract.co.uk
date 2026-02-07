"use client";

import { SignaturePicker } from "./signatures/SignaturePicker";
import type { SignatureRole } from "../lib/signatureAssets";

interface SignatureCaptureProps {
  label: string;
  /** PNG data URL, e.g. "data:image/png;base64,..." */
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  /** When true, show preview only */
  readOnly?: boolean;
  /** Optional signature role for saved-asset lookup. Defaults to "engineer". */
  role?: SignatureRole;
}

/**
 * Backward-compatible signature capture component.
 *
 * Delegates to the new SignaturePicker which supports:
 * - Multi-stroke drawing (fixes single-stroke lock bug)
 * - Saved signature assets
 * - Draw-new with optional save-to-profile
 */
export function SignatureCapture({
  label,
  value,
  onChange,
  readOnly,
  role = "engineer",
}: SignatureCaptureProps) {
  return (
    <SignaturePicker
      role={role}
      label={label}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
    />
  );
}
