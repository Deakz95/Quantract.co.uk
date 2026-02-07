/**
 * Certificate Draft Lifecycle & State Machine (CERT-A16)
 *
 * Clear lifecycle for certificates with 5 states:
 *   draft → in_progress → ready_for_review → completed → locked
 *
 * Key design decisions:
 *  - `in_progress` and `ready_for_review` are DERIVED from workflow progress
 *  - `completed` requires explicit user action, gated by validation
 *  - `locked` is irreversible (maps to CRM "issued")
 *  - No validation on save — validation only gates transitions
 *  - Pure functions — no state management, no DB access
 *  - Reuses getWorkflowProgress() from certificate-workflow (CERT-A14)
 *  - Does NOT re-implement validation
 */

import type { CertificateType } from "./certificate-types";
import { getWorkflowProgress, type WorkflowProgress } from "./certificate-workflow";

// ── Lifecycle states ──

/**
 * The 5 lifecycle states for a certificate.
 *
 * - `draft`:            Created but no data entered
 * - `in_progress`:      Some sections filled but not all required fields complete
 * - `ready_for_review`: All required fields pass validation; can be completed
 * - `completed`:        Explicitly marked as complete by user (validation passed)
 * - `locked`:           Immutable — issued, signed, archived (irreversible)
 */
export type LifecycleState =
  | "draft"
  | "in_progress"
  | "ready_for_review"
  | "completed"
  | "locked";

/**
 * States that are persisted to the certificate record.
 * `in_progress` and `ready_for_review` are derived, not stored.
 */
export type StoredLifecycleState = "draft" | "completed" | "locked";

// ── Transition matrix ──

/**
 * Valid transitions between lifecycle states.
 *
 * Transitions marked `auto` happen when data changes.
 * Transitions marked `explicit` require user action.
 *
 *   draft           → in_progress       (auto: any section filled)
 *   in_progress     → ready_for_review  (auto: all required sections pass)
 *   ready_for_review → in_progress      (auto: data change invalidates a section)
 *   ready_for_review → completed        (explicit: user action, validation must pass)
 *   completed       → locked            (explicit: issue/sign action, irreversible)
 *
 * Disallowed:
 *   completed → draft/in_progress/ready_for_review  (must amend instead)
 *   locked → anything                               (immutable)
 */
const VALID_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  draft: ["in_progress"],
  in_progress: ["ready_for_review"],
  ready_for_review: ["in_progress", "completed"],
  completed: ["locked"],
  locked: [], // terminal — no transitions out
};

// ── Derive state ──

/**
 * Derive the current lifecycle state from stored status + workflow progress.
 *
 * The stored status captures explicit transitions (completed, locked).
 * For pre-completion states, the actual state is computed from the data.
 */
export function deriveLifecycleState(
  storedStatus: string,
  certType: CertificateType,
  data: Record<string, unknown>
): LifecycleState {
  // Explicit terminal states — stored, not derived
  if (storedStatus === "completed") return "completed";
  if (storedStatus === "locked" || storedStatus === "issued") return "locked";

  // For draft/in_progress/etc., derive from workflow progress
  const progress = getWorkflowProgress(certType, data);
  return derivePreCompletionState(progress);
}

/**
 * Derive pre-completion state from workflow progress alone.
 * Useful when you already have the progress object.
 */
export function derivePreCompletionState(
  progress: WorkflowProgress
): "draft" | "in_progress" | "ready_for_review" {
  if (progress.allRequiredComplete) return "ready_for_review";
  if (progress.completedCount > 0) return "in_progress";
  return "draft";
}

// ── Transition guards ──

export interface TransitionResult {
  /** Whether the transition is allowed */
  allowed: boolean;
  /** Reason if not allowed */
  reason?: string;
}

/**
 * Check whether a transition from one state to another is valid.
 * Does NOT perform data validation — that's the caller's responsibility.
 */
export function canTransition(
  from: LifecycleState,
  to: LifecycleState
): TransitionResult {
  if (from === to) {
    return { allowed: true }; // no-op, always allowed
  }

  if (from === "locked") {
    return {
      allowed: false,
      reason: "Locked certificates cannot be modified. Create an amendment instead.",
    };
  }

  const validTargets = VALID_TRANSITIONS[from];
  if (!validTargets.includes(to)) {
    return {
      allowed: false,
      reason: `Cannot transition from "${from}" to "${to}". Valid transitions: ${validTargets.join(", ") || "none"}.`,
    };
  }

  return { allowed: true };
}

/**
 * Get available transitions from the current state.
 */
export function getAvailableTransitions(state: LifecycleState): LifecycleState[] {
  return VALID_TRANSITIONS[state];
}

/**
 * Check whether the certificate can be explicitly completed.
 *
 * Requirements:
 * 1. Current derived state must be `ready_for_review`
 * 2. Stored status must NOT already be `completed` or `locked`
 *
 * This does NOT run validation — the caller must run
 * `certificateIsReadyForCompletion()` or `validateFromRegistry()` separately.
 * This function only checks the state machine allows the transition.
 */
export function canComplete(
  storedStatus: string,
  certType: CertificateType,
  data: Record<string, unknown>
): TransitionResult {
  const current = deriveLifecycleState(storedStatus, certType, data);

  if (current === "locked") {
    return {
      allowed: false,
      reason: "Certificate is locked and cannot be modified.",
    };
  }

  if (current === "completed") {
    return { allowed: true }; // idempotent
  }

  if (current !== "ready_for_review") {
    return {
      allowed: false,
      reason: `Certificate must be ready for review before completing. Current state: "${current}".`,
    };
  }

  return { allowed: true };
}

/**
 * Check whether the certificate can be locked (issued).
 *
 * Requirements:
 * 1. Must currently be in `completed` state
 * 2. Once locked, cannot be undone
 */
export function canLock(storedStatus: string): TransitionResult {
  if (storedStatus === "locked" || storedStatus === "issued") {
    return { allowed: true }; // idempotent
  }

  if (storedStatus !== "completed") {
    return {
      allowed: false,
      reason: `Certificate must be completed before it can be locked. Current status: "${storedStatus}".`,
    };
  }

  return { allowed: true };
}

// ── State metadata ──

export interface LifecycleStateInfo {
  /** Machine-readable state */
  state: LifecycleState;
  /** Human-readable label */
  label: string;
  /** Short description */
  description: string;
  /** Whether this state allows editing certificate data */
  editable: boolean;
  /** Badge colour hint for UI */
  color: "gray" | "blue" | "amber" | "green" | "purple";
}

const STATE_INFO: Record<LifecycleState, LifecycleStateInfo> = {
  draft: {
    state: "draft",
    label: "Draft",
    description: "Certificate created but not yet started",
    editable: true,
    color: "gray",
  },
  in_progress: {
    state: "in_progress",
    label: "In Progress",
    description: "Certificate is being filled out",
    editable: true,
    color: "blue",
  },
  ready_for_review: {
    state: "ready_for_review",
    label: "Ready for Review",
    description: "All required sections complete — ready to be finalised",
    editable: true,
    color: "amber",
  },
  completed: {
    state: "completed",
    label: "Completed",
    description: "Certificate has been reviewed and finalised",
    editable: false,
    color: "green",
  },
  locked: {
    state: "locked",
    label: "Locked",
    description: "Certificate is issued and immutable",
    editable: false,
    color: "purple",
  },
};

/**
 * Get display metadata for a lifecycle state.
 */
export function getStateInfo(state: LifecycleState): LifecycleStateInfo {
  return STATE_INFO[state];
}

/**
 * Check whether the certificate is editable in its current state.
 */
export function isEditable(state: LifecycleState): boolean {
  return STATE_INFO[state].editable;
}

// ── CRM status mapping ──

/**
 * Map a CRM status string to the nearest stored lifecycle state.
 * CRM uses: "draft" | "completed" | "issued" | "void"
 * Lifecycle uses: "draft" | "completed" | "locked"
 */
export function fromCrmStatus(crmStatus: string): StoredLifecycleState {
  switch (crmStatus) {
    case "completed":
      return "completed";
    case "issued":
      return "locked";
    case "void":
      return "locked"; // void certs are also immutable
    default:
      return "draft";
  }
}

/**
 * Map a lifecycle state to CRM status for persistence.
 * Only maps stored states — derived states (in_progress, ready_for_review)
 * are stored as "draft" in the CRM.
 */
export function toCrmStatus(
  state: LifecycleState
): "draft" | "completed" | "issued" {
  switch (state) {
    case "completed":
      return "completed";
    case "locked":
      return "issued";
    default:
      return "draft";
  }
}

/**
 * Map a lifecycle state to offline-app status for persistence.
 * The certificates app uses: "draft" | "in_progress" | "complete" | "issued"
 */
export function toOfflineStatus(
  state: LifecycleState
): "draft" | "in_progress" | "complete" | "issued" {
  switch (state) {
    case "in_progress":
    case "ready_for_review":
      return "in_progress";
    case "completed":
      return "complete";
    case "locked":
      return "issued";
    default:
      return "draft";
  }
}
