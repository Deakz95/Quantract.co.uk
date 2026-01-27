"use client";

import { useCallback, useState, createElement, type ReactNode } from "react";
import { ConfirmDialog, type ConfirmDialogProps } from "@/components/ui/ConfirmDialog";
import type { ButtonVariant } from "@/components/ui/button";

export type ConfirmOptions = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
};

type ConfirmState = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

/**
 * Hook for displaying confirmation dialogs with a promise-based API.
 *
 * Usage:
 * ```tsx
 * const { confirm, ConfirmDialog } = useConfirm();
 *
 * async function handleDelete() {
 *   const confirmed = await confirm({
 *     title: 'Delete quote?',
 *     message: 'This will permanently delete "Quote #123"'
 *   });
 *   if (confirmed) {
 *     // perform delete
 *   }
 * }
 *
 * return (
 *   <>
 *     <button onClick={handleDelete}>Delete</button>
 *     {ConfirmDialog}
 *   </>
 * );
 * ```
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        ...options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (state) {
      state.resolve(true);
      setState(null);
    }
  }, [state]);

  const handleCancel = useCallback(() => {
    if (state) {
      state.resolve(false);
      setState(null);
    }
  }, [state]);

  const setConfirmBusy = useCallback((isBusy: boolean) => {
    setBusy(isBusy);
  }, []);

  const ConfirmDialogElement = state
    ? createElement(ConfirmDialog, {
        open: true,
        title: state.title,
        message: state.message,
        confirmLabel: state.confirmLabel ?? "Confirm",
        cancelLabel: state.cancelLabel ?? "Cancel",
        confirmVariant: state.confirmVariant ?? "destructive",
        onConfirm: handleConfirm,
        onCancel: handleCancel,
        busy,
      })
    : null;

  return {
    confirm,
    ConfirmDialog: ConfirmDialogElement,
    setConfirmBusy,
  };
}
