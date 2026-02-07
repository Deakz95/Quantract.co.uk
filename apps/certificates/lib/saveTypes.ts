/**
 * Save status types for certificate autosave UI.
 *
 * Transitions:
 *   idle → dirty (data change)
 *   dirty → saving (debounce fires)
 *   saving → saved (success)
 *   saving → error (failure)
 *   saved → idle (2s delay)
 *   * → offline (navigator.onLine === false)
 */
export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error" | "offline";

export interface ConflictState {
  serverUpdatedAt: string;
  message: string;
}
