/**
 * Certificate Signature System V2 (CERT-A21)
 *
 * Centralised signature storage under `data._signatures` in the certificate
 * JSON blob. Supports drawn, preset, and typed-name methods.
 *
 * Pure functions — no state management, no DB access.
 */

import type { CertificateType } from "./certificate-types";
import { CERTIFICATE_TYPE_REGISTRY, type CertificateSignatureConfig } from "./certificate-registry";

// ── Types ──

export type SignatureMethod = "drawn" | "preset" | "typed";

export interface SignatureImage {
  format: "png";
  dataUrl: string;
  width: number;
  height: number;
}

export interface SignatureValue {
  method: SignatureMethod;
  image?: SignatureImage;
  typedName?: string;
  signedAtISO: string;
  signedByUserId?: string;
  signedByName?: string;
  presetId?: string;
}

/**
 * All signatures on a certificate, keyed by signatureId.
 *
 * signatureId uses the registry signature `role` field
 * (e.g. "inspector", "designer", "installer", "engineer", "client").
 */
export type CertificateSignaturesV2 = Record<string, SignatureValue>;

// ── Helpers ──

/**
 * Get a signature from the `_signatures` blob, falling back to legacy paths.
 */
export function getSignature(
  data: Record<string, unknown>,
  signatureId: string,
): SignatureValue | undefined {
  const sigs = data._signatures as CertificateSignaturesV2 | undefined;
  if (sigs?.[signatureId]) return sigs[signatureId];

  // Legacy fallback: try to read from old signature paths and convert
  return migrateLegacySignature(data, signatureId);
}

/**
 * Set a signature on the certificate data. Returns new data object.
 */
export function setSignature(
  data: Record<string, unknown>,
  signatureId: string,
  value: SignatureValue,
): Record<string, unknown> {
  const existing = (data._signatures ?? {}) as CertificateSignaturesV2;
  return {
    ...data,
    _signatures: { ...existing, [signatureId]: value },
  };
}

/**
 * Clear a signature. Returns new data object.
 */
export function clearSignature(
  data: Record<string, unknown>,
  signatureId: string,
): Record<string, unknown> {
  const existing = (data._signatures ?? {}) as CertificateSignaturesV2;
  const next = { ...existing };
  delete next[signatureId];
  return { ...data, _signatures: next };
}

/**
 * Check if a signature is present and valid.
 */
export function hasSignature(
  data: Record<string, unknown>,
  signatureId: string,
): boolean {
  const sig = getSignature(data, signatureId);
  if (!sig) return false;
  return Boolean(sig.signedAtISO) && Boolean(sig.image?.dataUrl || sig.typedName);
}

/**
 * List the required signature IDs for a certificate type from the registry.
 */
export function listRequiredSignatureIds(certType: CertificateType): string[] {
  const config = CERTIFICATE_TYPE_REGISTRY[certType];
  if (!config) return [];
  return config.signatures
    .filter((s) => s.required)
    .map((s) => s.role);
}

/**
 * List all signature configs for a certificate type.
 */
export function listSignatureConfigs(certType: CertificateType): CertificateSignatureConfig[] {
  return CERTIFICATE_TYPE_REGISTRY[certType]?.signatures ?? [];
}

/**
 * Validate all signatures for a certificate type.
 * Returns { ok, missing[] } where missing contains labels of missing required signatures.
 */
export function validateSignatures(
  certType: CertificateType,
  data: Record<string, unknown>,
): { ok: boolean; missing: string[] } {
  const config = CERTIFICATE_TYPE_REGISTRY[certType];
  if (!config) return { ok: true, missing: [] };

  const missing: string[] = [];
  for (const sig of config.signatures) {
    if (!sig.required) continue;
    if (!hasSignature(data, sig.role)) {
      missing.push(sig.label);
    }
  }

  return { ok: missing.length === 0, missing };
}

/**
 * Create a SignatureValue from a drawn/preset PNG data URL.
 */
export function createDrawnSignature(
  dataUrl: string,
  signedByName?: string,
  presetId?: string,
): SignatureValue {
  return {
    method: presetId ? "preset" : "drawn",
    image: { format: "png", dataUrl, width: 0, height: 0 },
    signedAtISO: new Date().toISOString(),
    signedByName,
    presetId,
  };
}

/**
 * Create a SignatureValue from a typed name.
 */
export function createTypedSignature(
  typedName: string,
): SignatureValue {
  return {
    method: "typed",
    typedName,
    signedAtISO: new Date().toISOString(),
    signedByName: typedName,
  };
}

// ── Legacy Migration ──

/**
 * Legacy signature paths by cert type and role.
 * Maps (signatureId) → data path for old-style CertificateSignature objects.
 */
const LEGACY_PATHS: Record<string, string[]> = {
  inspector: [
    "declaration.inspectorSignature",
    "inspectionSection.signature",
    "signatures.engineer",
  ],
  engineer: [
    "declaration.engineerSignature",
    "signatures.engineer",
  ],
  designer: [
    "designSection.signature",
  ],
  installer: [
    "declaration.installerSignature",
    "constructionSection.signature",
  ],
  client: [
    "clientAcknowledgement.clientSignature",
    "signatures.customer",
  ],
  customer: [
    "signatures.customer",
    "clientAcknowledgement.clientSignature",
  ],
};

function resolveDotPath(obj: Record<string, unknown>, path: string): unknown {
  let current: unknown = obj;
  for (const key of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Attempt to read a legacy CertificateSignature and convert to SignatureValue.
 * Non-destructive: reads only, does not modify data.
 */
function migrateLegacySignature(
  data: Record<string, unknown>,
  signatureId: string,
): SignatureValue | undefined {
  const paths = LEGACY_PATHS[signatureId];
  if (!paths) return undefined;

  for (const path of paths) {
    const raw = resolveDotPath(data, path);
    if (!raw || typeof raw !== "object") continue;

    const legacy = raw as Record<string, unknown>;
    const signatureText = String(legacy.signatureText || "").trim();
    const name = String(legacy.name || "").trim();
    const signedAtISO = String(legacy.signedAtISO || "").trim();

    if (!signedAtISO) continue;
    if (!signatureText && !name) continue;

    // Convert to V2 format
    const isDataUrl = signatureText.startsWith("data:");
    const value: SignatureValue = {
      method: isDataUrl ? "drawn" : (name ? "typed" : "drawn"),
      signedAtISO,
      signedByName: name || undefined,
    };

    if (isDataUrl) {
      value.image = { format: "png", dataUrl: signatureText, width: 0, height: 0 };
    } else if (signatureText) {
      value.typedName = signatureText;
      value.signedByName = signatureText;
    } else if (name) {
      value.typedName = name;
    }

    return value;
  }

  return undefined;
}

/**
 * Migrate all legacy signatures into `_signatures` for a given cert type.
 * Returns new data with `_signatures` populated from legacy paths.
 * Does NOT overwrite existing `_signatures` entries.
 */
export function migrateAllLegacySignatures(
  certType: CertificateType,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const config = CERTIFICATE_TYPE_REGISTRY[certType];
  if (!config) return data;

  const existing = (data._signatures ?? {}) as CertificateSignaturesV2;
  const migrated: CertificateSignaturesV2 = { ...existing };
  let changed = false;

  for (const sig of config.signatures) {
    if (migrated[sig.role]) continue; // already has V2 entry
    const legacy = migrateLegacySignature(data, sig.role);
    if (legacy) {
      migrated[sig.role] = legacy;
      changed = true;
    }
  }

  if (!changed) return data;
  return { ...data, _signatures: migrated };
}
