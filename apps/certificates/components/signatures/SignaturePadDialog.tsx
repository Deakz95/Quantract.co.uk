"use client";

import { useEffect } from "react";
import { Button } from "@quantract/ui";
import { SignaturePad } from "./SignaturePad";

interface SignaturePadDialogProps {
  open: boolean;
  title?: string;
  /** Called with PNG data URL when user saves */
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  /** Optional initial value to display on the pad */
  initialValue?: string | null;
}

/**
 * Modal wrapper for SignaturePad.
 *
 * Each signature field opens its own dialog with its own canvas instance.
 * This prevents one pad from interfering with another (the multi-touch bug).
 */
export function SignaturePadDialog({
  open,
  title = "Draw Signature",
  onSave,
  onCancel,
  initialValue,
}: SignaturePadDialogProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[520px] bg-[var(--card)] border border-[var(--border)] rounded shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Sign below — multiple strokes supported
          </p>
        </div>
        <div className="p-6">
          <SignaturePad
            onSave={onSave}
            onCancel={onCancel}
            initialValue={initialValue}
          />
        </div>
      </div>
    </div>
  );
}
