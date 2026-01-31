/**
 * Canonical snapshot builder + deterministic signing hash.
 *
 * Produces a stable JSON representation of a certificate at the time of issuance.
 * The signing hash (SHA-256) is computed over this canonical JSON so that:
 *   - Re-ordering object keys doesn't change the hash
 *   - Re-ordering array items doesn't change the hash (arrays sorted deterministically)
 *   - Volatile fields (updatedAt, internal IDs) are stripped
 */

import { createHash } from "node:crypto";

// ── Snapshot shape ──

export type CanonicalObservation = {
  code: string;
  location: string | null;
  description: string | null;
  regulation: string | null;
  fixGuidance: string | null;
  resolvedAt: string | null; // ISO string or null
  sortOrder: number;
};

export type CanonicalChecklistItem = {
  section: string;
  question: string;
  answer: string | null;
  notes: string | null;
  sortOrder: number;
};

export type CanonicalSignature = {
  role: string;
  signerName: string | null;
  signerEmail: string | null;
  signatureText: string | null;
  signedAt: string | null; // ISO
  qualification: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

export type CanonicalAttachment = {
  name: string;
  fileKey: string;
  mimeType: string | null;
  category: string | null;
  createdAt: string; // ISO
};

export type CanonicalTestResult = {
  circuitRef: string | null;
  data: Record<string, unknown>;
};

export type CanonicalCertSnapshot = {
  // Certificate identity
  certificateId: string;
  companyId: string;
  certificateNumber: string | null;
  type: string;
  // Linked entities
  jobId: string | null;
  siteId: string | null;
  clientId: string | null;
  legalEntityId: string | null;
  // Certificate data (legacy JSON blob)
  dataVersion: number;
  data: Record<string, unknown>;
  // Inspector
  inspectorName: string | null;
  inspectorEmail: string | null;
  // Outcome (Stage 2)
  outcome: string | null;
  outcomeReason: string | null;
  // Structured data (Stage 1 v2)
  observations: CanonicalObservation[];
  checklists: CanonicalChecklistItem[];
  signatures: CanonicalSignature[];
  attachments: CanonicalAttachment[];
  testResults: CanonicalTestResult[];
  // Timing
  completedAt: string | null; // ISO
};

// ── Input aggregate type ──

export type FullCertificateAggregate = {
  certificate: {
    id: string;
    companyId: string;
    certificateNumber: string | null;
    type: string;
    status: string;
    jobId: string | null;
    siteId: string | null;
    clientId: string | null;
    legalEntityId: string | null;
    dataVersion: number;
    data: Record<string, unknown>;
    inspectorName: string | null;
    inspectorEmail: string | null;
    outcome: string | null;
    outcomeReason: string | null;
    completedAt: Date | null;
  };
  observations: Array<{
    code: string;
    location: string | null;
    description: string | null;
    regulation: string | null;
    fixGuidance: string | null;
    resolvedAt: Date | null;
    sortOrder: number;
    createdAt: Date;
    id: string;
  }>;
  checklists: Array<{
    section: string;
    question: string;
    answer: string | null;
    notes: string | null;
    sortOrder: number;
    id: string;
  }>;
  signatures: Array<{
    role: string;
    signerName: string | null;
    signerEmail: string | null;
    signatureText: string | null;
    signedAt: Date | null;
    qualification: string | null;
    isPrimary: boolean;
    sortOrder: number;
    id: string;
  }>;
  attachments: Array<{
    name: string;
    fileKey: string;
    mimeType: string | null;
    category: string | null;
    createdAt: Date;
    id: string;
  }>;
  testResults: Array<{
    circuitRef: string | null;
    data: Record<string, unknown>;
  }>;
};

// ── Builder ──

export function buildCanonicalCertSnapshot(agg: FullCertificateAggregate): CanonicalCertSnapshot {
  const c = agg.certificate;

  // Sort observations: sortOrder asc, createdAt asc, id asc
  const observations = [...agg.observations]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
    .map((o): CanonicalObservation => ({
      code: o.code,
      location: o.location,
      description: o.description,
      regulation: o.regulation,
      fixGuidance: o.fixGuidance,
      resolvedAt: o.resolvedAt ? o.resolvedAt.toISOString() : null,
      sortOrder: o.sortOrder,
    }));

  // Sort checklists: section asc, sortOrder asc, id asc
  const checklists = [...agg.checklists]
    .sort((a, b) => a.section.localeCompare(b.section) || a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .map((cl): CanonicalChecklistItem => ({
      section: cl.section,
      question: cl.question,
      answer: cl.answer,
      notes: cl.notes,
      sortOrder: cl.sortOrder,
    }));

  // Sort signatures: role asc, sortOrder asc, signedAt asc, id asc
  const signatures = [...agg.signatures]
    .sort((a, b) =>
      a.role.localeCompare(b.role) ||
      a.sortOrder - b.sortOrder ||
      (a.signedAt?.getTime() ?? 0) - (b.signedAt?.getTime() ?? 0) ||
      a.id.localeCompare(b.id),
    )
    .map((s): CanonicalSignature => ({
      role: s.role,
      signerName: s.signerName,
      signerEmail: s.signerEmail,
      signatureText: s.signatureText,
      signedAt: s.signedAt ? s.signedAt.toISOString() : null,
      qualification: s.qualification,
      isPrimary: s.isPrimary,
      sortOrder: s.sortOrder,
    }));

  // Sort attachments: category asc, createdAt asc, id asc
  const attachments = [...agg.attachments]
    .sort((a, b) =>
      (a.category ?? "").localeCompare(b.category ?? "") ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      a.id.localeCompare(b.id),
    )
    .map((att): CanonicalAttachment => ({
      name: att.name,
      fileKey: att.fileKey,
      mimeType: att.mimeType,
      category: att.category,
      createdAt: att.createdAt.toISOString(),
    }));

  // Test results: keep original order (circuit ref order from DB)
  const testResults = agg.testResults.map((t): CanonicalTestResult => ({
    circuitRef: t.circuitRef,
    data: sortObjectKeys(t.data),
  }));

  return {
    certificateId: c.id,
    companyId: c.companyId,
    certificateNumber: c.certificateNumber,
    type: c.type,
    jobId: c.jobId,
    siteId: c.siteId,
    clientId: c.clientId,
    legalEntityId: c.legalEntityId,
    dataVersion: c.dataVersion,
    data: sortObjectKeys(c.data),
    inspectorName: c.inspectorName,
    inspectorEmail: c.inspectorEmail,
    outcome: c.outcome,
    outcomeReason: c.outcomeReason,
    observations,
    checklists,
    signatures,
    attachments,
    testResults,
    completedAt: c.completedAt ? c.completedAt.toISOString() : null,
  };
}

// ── Hashing ──

/**
 * Compute SHA-256 signing hash over canonical JSON.
 * Uses JSON.stringify with sorted keys to ensure determinism.
 */
export function computeSigningHash(snapshot: CanonicalCertSnapshot): string {
  const canonical = canonicalJsonString(snapshot);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Compute SHA-256 checksum over raw bytes (e.g. PDF).
 */
export function computeChecksum(bytes: Buffer | Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// ── Helpers ──

/**
 * Produce a deterministic JSON string by sorting object keys recursively.
 * This ensures hash stability regardless of JS engine key ordering.
 */
export function canonicalJsonString(obj: unknown): string {
  return JSON.stringify(obj, (_key, value) => {
    if (value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value).sort()) {
        sorted[k] = value[k];
      }
      return sorted;
    }
    return value;
  });
}

/** Sort top-level keys of a plain object for deterministic snapshot. */
function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) {
    sorted[k] = obj[k];
  }
  return sorted;
}
