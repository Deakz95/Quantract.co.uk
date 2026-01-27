"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  /** Primary message displayed in the dialog body */
  message?: ReactNode;
  /** @deprecated Use message instead */
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Button variant for the confirm button, defaults to "destructive" */
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
  /** @deprecated Use onCancel instead */
  onClose?: () => void;
  busy?: boolean;
  children?: ReactNode;
};

export function ConfirmDialog({
  open,
  title,
  message,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "destructive",
  onConfirm,
  onCancel,
  onClose,
  busy,
  children,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Support both message and description for backwards compatibility
  const displayMessage = message ?? description;
  // Support both onCancel and onClose for backwards compatibility
  const handleClose = onCancel ?? onClose ?? (() => {});

  // Handle Escape key to close dialog
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        handleClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose, busy]);

  // Focus cancel button when dialog opens
  useEffect(() => {
    if (open) {
      cancelButtonRef.current?.focus();
    }
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (!open || !dialogRef.current) return;

    const dialog = dialogRef.current;
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    function handleTabKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    }

    dialog.addEventListener("keydown", handleTabKey);
    return () => dialog.removeEventListener("keydown", handleTabKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={displayMessage ? "confirm-dialog-description" : undefined}
    >
      <div
        className="fixed inset-0"
        onClick={() => !busy && handleClose()}
        aria-hidden="true"
      />
      <div ref={dialogRef} className="relative w-full max-w-md">
        <DialogContent>
          <DialogHeader>
            <DialogTitle><span id="confirm-dialog-title">{title}</span></DialogTitle>
            {displayMessage ? <DialogDescription><span id="confirm-dialog-description">{displayMessage}</span></DialogDescription> : null}
          </DialogHeader>
          {children ? <div className="mt-4 text-sm text-[var(--muted-foreground)]">{children}</div> : null}
          <div className="mt-6 flex justify-end gap-2">
            <Button ref={cancelButtonRef} variant="secondary" type="button" onClick={handleClose} disabled={busy}>
              {cancelLabel}
            </Button>
            <Button variant={confirmVariant} type="button" onClick={onConfirm} disabled={busy}>
              {busy ? "Working..." : confirmLabel}
            </Button>
          </div>
        </DialogContent>
      </div>
    </div>
  );
}
