/**
 * Certificate Review, Approval & Sign-off (CERT-A20)
 *
 * Lightweight review metadata layer on top of the existing 5-state lifecycle.
 * Review data lives in the certificate `data` JSON blob under `_review`,
 * requiring zero schema migrations.
 *
 * Pure functions only — no state management, no DB access.
 */

import type { Role } from "./roles";
import type { CertificateType } from "./certificate-types";
import type { LifecycleState } from "./certificate-lifecycle";
import { CERTIFICATE_TYPE_REGISTRY } from "./certificate-registry";

// ── Types ──

export type ReviewStatus =
  | "not_required"
  | "pending_review"
  | "approved"
  | "rejected";

export interface ReviewHistoryEntry {
  action: "submitted" | "approved" | "rejected";
  by: string;
  atISO: string;
  notes?: string;
}

export interface ReviewRecord {
  reviewStatus: ReviewStatus;
  submittedBy?: string;
  submittedAtISO?: string;
  reviewedBy?: string;
  reviewedAtISO?: string;
  reviewNotes?: string;
  reviewHistory: ReviewHistoryEntry[];
}

export interface CertificateReviewConfig {
  required: boolean;
  rolesAllowedToReview: Role[];
}

export interface ReviewStatusInfo {
  status: ReviewStatus;
  label: string;
  description: string;
  color: "gray" | "amber" | "green" | "red";
  icon: "minus" | "clock" | "check" | "x";
}

// ── Review record accessors ──

const DEFAULT_REVIEW: ReviewRecord = {
  reviewStatus: "not_required",
  reviewHistory: [],
};

/** Extract `_review` from data blob, default to not_required */
export function getReviewRecord(data: Record<string, unknown>): ReviewRecord {
  const raw = data._review;
  if (!raw || typeof raw !== "object") return { ...DEFAULT_REVIEW };
  const r = raw as Record<string, unknown>;
  return {
    reviewStatus: (r.reviewStatus as ReviewStatus) || "not_required",
    submittedBy: r.submittedBy as string | undefined,
    submittedAtISO: r.submittedAtISO as string | undefined,
    reviewedBy: r.reviewedBy as string | undefined,
    reviewedAtISO: r.reviewedAtISO as string | undefined,
    reviewNotes: r.reviewNotes as string | undefined,
    reviewHistory: Array.isArray(r.reviewHistory)
      ? (r.reviewHistory as ReviewHistoryEntry[])
      : [],
  };
}

/** Return new data with `_review` merged */
export function setReviewRecord(
  data: Record<string, unknown>,
  review: ReviewRecord,
): Record<string, unknown> {
  return { ...data, _review: { ...review } };
}

// ── Config lookup ──

/** Read `review` field from registry, default `{ required: false, rolesAllowedToReview: [] }` */
export function getReviewConfig(certType: CertificateType): CertificateReviewConfig {
  const config = CERTIFICATE_TYPE_REGISTRY[certType];
  if (config?.review) return config.review;
  return { required: false, rolesAllowedToReview: [] };
}

// ── Derived status ──

/** If review not required → "not_required", else read from data */
export function deriveReviewStatus(
  certType: CertificateType,
  data: Record<string, unknown>,
): ReviewStatus {
  const config = getReviewConfig(certType);
  if (!config.required) return "not_required";
  const record = getReviewRecord(data);
  return record.reviewStatus;
}

// ── Guards ──

/**
 * Guard: can this certificate be submitted for review?
 *
 * Lifecycle must be `ready_for_review`, review must be required,
 * status must be `not_required` or `rejected` (resubmission after rejection).
 */
export function canSubmitForReview(
  lifecycleState: LifecycleState,
  certType: CertificateType,
  data: Record<string, unknown>,
): { allowed: boolean; reason?: string } {
  const config = getReviewConfig(certType);
  if (!config.required) {
    return { allowed: false, reason: "Review is not required for this certificate type." };
  }

  if (lifecycleState !== "ready_for_review") {
    return {
      allowed: false,
      reason: `Certificate must be ready for review before submitting. Current state: "${lifecycleState}".`,
    };
  }

  const status = deriveReviewStatus(certType, data);
  if (status !== "not_required" && status !== "rejected") {
    return {
      allowed: false,
      reason: `Certificate review status is "${status}" — cannot resubmit.`,
    };
  }

  return { allowed: true };
}

/**
 * Guard: can this actor review the certificate?
 *
 * Capability-first: if `capabilities?.includes("cert.review")` → allow.
 * Else fallback: if role in `rolesAllowedToReview` → allow.
 */
export function canReview(
  certType: CertificateType,
  data: Record<string, unknown>,
  actorRole: Role,
  capabilities?: string[],
): { allowed: boolean; reason?: string } {
  const status = deriveReviewStatus(certType, data);
  if (status !== "pending_review") {
    return { allowed: false, reason: `Review status is "${status}" — not pending review.` };
  }

  // Capability-first check
  if (capabilities?.includes("cert.review")) {
    return { allowed: true };
  }

  // Role fallback
  const config = getReviewConfig(certType);
  if (config.rolesAllowedToReview.includes(actorRole)) {
    return { allowed: true };
  }

  return { allowed: false, reason: "You do not have permission to review certificates." };
}

/** True if review required AND status !== "approved" */
export function isReviewBlockingCompletion(
  certType: CertificateType,
  data: Record<string, unknown>,
): boolean {
  const config = getReviewConfig(certType);
  if (!config.required) return false;
  const status = deriveReviewStatus(certType, data);
  return status !== "approved";
}

// ── Actions (pure — return new data) ──

/** Submit certificate for review. Returns new data with status=pending_review */
export function submitForReview(
  data: Record<string, unknown>,
  submittedBy: string,
): Record<string, unknown> {
  const record = getReviewRecord(data);
  const now = new Date().toISOString();
  const updated: ReviewRecord = {
    ...record,
    reviewStatus: "pending_review",
    submittedBy,
    submittedAtISO: now,
    reviewedBy: undefined,
    reviewedAtISO: undefined,
    reviewNotes: undefined,
    reviewHistory: [
      ...record.reviewHistory,
      { action: "submitted", by: submittedBy, atISO: now },
    ],
  };
  return setReviewRecord(data, updated);
}

/** Approve review. Returns new data with status=approved */
export function approveReview(
  data: Record<string, unknown>,
  reviewedBy: string,
  notes?: string,
): Record<string, unknown> {
  const record = getReviewRecord(data);
  const now = new Date().toISOString();
  const updated: ReviewRecord = {
    ...record,
    reviewStatus: "approved",
    reviewedBy,
    reviewedAtISO: now,
    reviewNotes: notes,
    reviewHistory: [
      ...record.reviewHistory,
      { action: "approved", by: reviewedBy, atISO: now, notes },
    ],
  };
  return setReviewRecord(data, updated);
}

/** Reject review. Returns new data with status=rejected */
export function rejectReview(
  data: Record<string, unknown>,
  reviewedBy: string,
  notes: string,
): Record<string, unknown> {
  const record = getReviewRecord(data);
  const now = new Date().toISOString();
  const updated: ReviewRecord = {
    ...record,
    reviewStatus: "rejected",
    reviewedBy,
    reviewedAtISO: now,
    reviewNotes: notes,
    reviewHistory: [
      ...record.reviewHistory,
      { action: "rejected", by: reviewedBy, atISO: now, notes },
    ],
  };
  return setReviewRecord(data, updated);
}

// ── Display helpers ──

const STATUS_INFO: Record<ReviewStatus, ReviewStatusInfo> = {
  not_required: {
    status: "not_required",
    label: "No Review Required",
    description: "This certificate type does not require review.",
    color: "gray",
    icon: "minus",
  },
  pending_review: {
    status: "pending_review",
    label: "Pending Review",
    description: "Submitted for review — awaiting approval.",
    color: "amber",
    icon: "clock",
  },
  approved: {
    status: "approved",
    label: "Approved",
    description: "Review approved — certificate can be completed.",
    color: "green",
    icon: "check",
  },
  rejected: {
    status: "rejected",
    label: "Changes Requested",
    description: "Review rejected — changes are required before resubmission.",
    color: "red",
    icon: "x",
  },
};

/** Display metadata for a review status */
export function getReviewStatusInfo(status: ReviewStatus): ReviewStatusInfo {
  return STATUS_INFO[status];
}

/**
 * Check if the actor can access the review queue.
 *
 * Capability-first: `cert.review` → true.
 * Else: admin or office role → true.
 */
export function canAccessReviewQueue(
  role: Role,
  capabilities?: string[],
): boolean {
  if (capabilities?.includes("cert.review")) return true;
  return role === "admin" || role === "office";
}
