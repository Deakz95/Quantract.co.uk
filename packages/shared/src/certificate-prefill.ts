/**
 * Certificate Pre-Fill & Field Ownership (CERT-A23)
 *
 * Tracks which fields were auto-filled from job/client/site data vs manually
 * entered. Stored in the certificate data JSON blob under `_prefill`.
 * Zero schema migration — follows the same pattern as `_review` and `_signatures`.
 */

import type { CertificateType } from "./certificate-types";

// ─── Types ──────────────────────────────────────────────────────────

/** Where a field value originated */
export type FieldSource = "job" | "client" | "site" | "engineer" | "defaults" | "manual";

/** Metadata for a single pre-filled field */
export interface FieldSourceEntry {
  source: FieldSource;
  /** ISO date when the field was pre-filled */
  filledAtISO: string;
  /** Original value at fill time — allows detecting manual overrides */
  originalValue?: string;
  /** Whether the office has locked this field from engineer edits */
  locked?: boolean;
}

/** Map of dotted field paths → source entries */
export type FieldSourceMap = Record<string, FieldSourceEntry>;

/** The `_prefill` blob stored in certificate data */
export interface PrefillRecord {
  /** Which fields were pre-filled and from where */
  sources: FieldSourceMap;
  /** ISO date of the pre-fill operation */
  prefilledAtISO: string;
  /** Job ID used for pre-fill (for audit trail) */
  jobId?: string;
}

/** Context passed from the CRM when creating a certificate from a job */
export interface PrefillContext {
  jobId?: string;
  jobNumber?: number | null;
  jobTitle?: string;
  jobNotes?: string;
  siteName?: string;
  siteAddress?: string;
  siteAddress1?: string;
  siteAddress2?: string;
  siteCity?: string;
  siteCounty?: string;
  sitePostcode?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  engineerName?: string;
  engineerEmail?: string;
}

/** A single pre-fill mapping rule */
interface PrefillMapping {
  /** Dotted path in certificate data, e.g. "overview.clientName" */
  targetPath: string;
  /** Key in PrefillContext to read from */
  contextKey: keyof PrefillContext;
  /** Source category for tracking */
  source: FieldSource;
  /** Whether to lock this field (office-set, not editable by engineer without override) */
  locked?: boolean;
}

// ─── Mapping Rules ──────────────────────────────────────────────────

/** Standard mapping rules — used for all certificate types */
const STANDARD_MAPPINGS: PrefillMapping[] = [
  { targetPath: "overview.jobReference", contextKey: "jobId", source: "job", locked: true },
  { targetPath: "overview.siteName", contextKey: "siteName", source: "site", locked: false },
  { targetPath: "overview.installationAddress", contextKey: "siteAddress", source: "site", locked: false },
  { targetPath: "overview.clientName", contextKey: "clientName", source: "client", locked: false },
  { targetPath: "overview.clientEmail", contextKey: "clientEmail", source: "client", locked: false },
  { targetPath: "overview.jobDescription", contextKey: "jobTitle", source: "job", locked: false },
  // V2 expanded fields (contractorDetails section — used by offline app)
  { targetPath: "contractorDetails.clientName", contextKey: "clientName", source: "client", locked: false },
  { targetPath: "contractorDetails.clientAddress", contextKey: "clientAddress", source: "client", locked: false },
  { targetPath: "contractorDetails.installationAddress", contextKey: "siteAddress", source: "site", locked: false },
];

// ─── Pure Functions ─────────────────────────────────────────────────

/**
 * Get the prefill record from certificate data.
 * Returns a default empty record if not present.
 */
export function getPrefillRecord(data: Record<string, unknown>): PrefillRecord {
  const raw = data._prefill;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    return {
      sources: (r.sources && typeof r.sources === "object" ? r.sources : {}) as FieldSourceMap,
      prefilledAtISO: typeof r.prefilledAtISO === "string" ? r.prefilledAtISO : "",
      jobId: typeof r.jobId === "string" ? r.jobId : undefined,
    };
  }
  return { sources: {}, prefilledAtISO: "" };
}

/**
 * Set the prefill record on certificate data. Returns a new data object.
 */
export function setPrefillRecord(data: Record<string, unknown>, record: PrefillRecord): Record<string, unknown> {
  return { ...data, _prefill: record };
}

/**
 * Get the field source for a specific dotted path.
 */
export function getFieldSource(data: Record<string, unknown>, path: string): FieldSourceEntry | null {
  const record = getPrefillRecord(data);
  return record.sources[path] ?? null;
}

/**
 * Check if a field is locked (office-set, pre-filled from job and not overridden).
 */
export function isFieldLocked(data: Record<string, unknown>, path: string): boolean {
  const entry = getFieldSource(data, path);
  return entry?.locked === true;
}

/**
 * Check if a field was pre-filled from job/site/client data.
 */
export function isFieldPrefilled(data: Record<string, unknown>, path: string): boolean {
  const entry = getFieldSource(data, path);
  return entry !== null && entry.source !== "manual";
}

/**
 * Get a display label for a field source.
 */
export function getFieldSourceLabel(source: FieldSource): string {
  switch (source) {
    case "job": return "From job";
    case "client": return "From client";
    case "site": return "From site";
    case "engineer": return "From engineer";
    case "defaults": return "Default";
    case "manual": return "Manual entry";
  }
}

/**
 * Unlock a field (allow engineer to override). Returns new data with updated prefill record.
 */
export function unlockField(data: Record<string, unknown>, path: string): Record<string, unknown> {
  const record = getPrefillRecord(data);
  const entry = record.sources[path];
  if (!entry) return data;
  const next: PrefillRecord = {
    ...record,
    sources: {
      ...record.sources,
      [path]: { ...entry, locked: false },
    },
  };
  return setPrefillRecord(data, next);
}

/**
 * Mark a field as manually overridden. Returns new data.
 */
export function markFieldOverridden(data: Record<string, unknown>, path: string): Record<string, unknown> {
  const record = getPrefillRecord(data);
  const entry = record.sources[path];
  if (!entry) return data;
  const next: PrefillRecord = {
    ...record,
    sources: {
      ...record.sources,
      [path]: { ...entry, source: "manual", locked: false },
    },
  };
  return setPrefillRecord(data, next);
}

/**
 * Get the mapping rules for a certificate type.
 * Currently all types use the standard mappings, but this allows
 * per-type overrides in the future.
 */
export function getPrefillMappings(_certType: CertificateType): PrefillMapping[] {
  return STANDARD_MAPPINGS;
}

/**
 * Set a nested value on an object using a dotted path. Returns a new object.
 */
function setByPath(obj: Record<string, unknown>, dottedPath: string, value: unknown): Record<string, unknown> {
  const keys = dottedPath.split(".");
  const result = { ...obj };
  let target: Record<string, unknown> = result;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const existing = target[key];
    if (existing && typeof existing === "object" && !Array.isArray(existing)) {
      target[key] = { ...(existing as Record<string, unknown>) };
    } else {
      target[key] = {};
    }
    target = target[key] as Record<string, unknown>;
  }
  target[keys[keys.length - 1]] = value;
  return result;
}

/**
 * Apply pre-fill mappings to certificate data from a job context.
 * Returns new data with values filled and `_prefill` metadata attached.
 * Only fills fields that are currently empty.
 */
export function applyPrefill(
  data: Record<string, unknown>,
  context: PrefillContext,
  certType: CertificateType,
): Record<string, unknown> {
  const mappings = getPrefillMappings(certType);
  const now = new Date().toISOString();
  const sources: FieldSourceMap = {};
  let result = { ...data };

  for (const mapping of mappings) {
    const contextValue = context[mapping.contextKey];
    if (contextValue === undefined || contextValue === null || contextValue === "") continue;
    const strValue = String(contextValue);

    // Only fill if the target field is currently empty
    const currentValue = getByPath(result, mapping.targetPath);
    if (currentValue && String(currentValue).trim() !== "") continue;

    result = setByPath(result, mapping.targetPath, strValue);
    sources[mapping.targetPath] = {
      source: mapping.source,
      filledAtISO: now,
      originalValue: strValue,
      locked: mapping.locked ?? false,
    };
  }

  const record: PrefillRecord = {
    sources,
    prefilledAtISO: now,
    jobId: context.jobId,
  };

  return setPrefillRecord(result, record);
}

/**
 * Get a nested value from an object using a dotted path.
 */
function getByPath(obj: Record<string, unknown>, dottedPath: string): unknown {
  const keys = dottedPath.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Get all pre-filled field paths with their source info.
 * Useful for rendering source badges in the editor UI.
 */
export function getPrefilledFields(data: Record<string, unknown>): Array<{ path: string; entry: FieldSourceEntry }> {
  const record = getPrefillRecord(data);
  return Object.entries(record.sources).map(([path, entry]) => ({ path, entry }));
}
