"use client";

import { useCallback, type KeyboardEvent } from "react";

/**
 * Hook for handling common keyboard accessibility patterns
 */

type KeyboardHandler<T = HTMLElement> = (event: KeyboardEvent<T>) => void;

/**
 * Creates a keyboard event handler for clickable elements
 * Triggers the callback on Enter or Space key press
 */
export function useClickKeyHandler<T = HTMLElement>(
  onClick?: () => void
): KeyboardHandler<T> {
  return useCallback(
    (event: KeyboardEvent<T>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick?.();
      }
    },
    [onClick]
  );
}

/**
 * Creates a keyboard event handler for elements that should close on Escape
 */
export function useEscapeKeyHandler<T = HTMLElement>(
  onClose?: () => void
): KeyboardHandler<T> {
  return useCallback(
    (event: KeyboardEvent<T>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
    },
    [onClose]
  );
}

/**
 * Props for making a non-interactive element accessible as a button
 */
export type AccessibleButtonProps = {
  tabIndex: 0;
  role: "button";
  onKeyDown: KeyboardHandler;
};

/**
 * Returns props to make a non-button element accessible as a button
 */
export function useAccessibleButton(onClick?: () => void): AccessibleButtonProps {
  const handleKeyDown = useClickKeyHandler(onClick);

  return {
    tabIndex: 0,
    role: "button",
    onKeyDown: handleKeyDown,
  };
}

/**
 * Common focus-visible classes for consistent focus styling
 */
export const focusRingClasses = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2";

/**
 * Focus-visible classes for inset focus rings (no offset)
 */
export const focusRingInsetClasses = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]";
