/**
 * Certificate Defaults, Copy-Forward & Template Helpers (CERT-A18)
 *
 * Pure functions with zero UI deps. All logic is registry-driven
 * via getTypeSections() — no cert-type conditionals.
 */

import type { CertificateType } from "./certificate-types";
import { getTypeSections, getTypeFeatures } from "./certificate-registry";

// ════════════════════════════════════════════════════════
// Section → data key mapping
// ════════════════════════════════════════════════════════

/**
 * Maps registry section IDs to the top-level data keys they control.
 * Explicit because registry IDs don't always match data keys
 * (e.g. "supply" → "supplyCharacteristics").
 */
export const SECTION_DATA_KEYS: Record<string, string[]> = {
  contractorDetails: ["contractorDetails"],
  overview: ["overview"],
  supply: ["supplyCharacteristics"],
  earthing: ["earthingArrangements"],
  boards: ["boards"],
  observations: ["observations"],
  declaration: ["declaration", "declarationDetails"],
  photos: [],
  extentAndLimitations: ["extentAndLimitations"],
  generalInspection: ["generalInspection"],
  summaryOfCondition: ["summaryOfCondition"],
  overallAssessment: ["overallCondition", "recommendedRetestDate", "retestInterval", "inspectorComments"],
  clientAcknowledgement: ["clientAcknowledgement"],
  testResults: ["testResults"],
  testInstruments: ["testInstruments"],
  workDescription: ["workDescription", "extentOfWork"],
  circuitDetails: ["circuitDetails"],
  nextInspection: ["nextInspectionDate", "retestInterval"],
  design: ["designSection", "sameAsDesigner"],
  construction: ["constructionSection"],
  inspection: ["inspectionSection"],
  originParticulars: ["originMainSwitchType", "originMainSwitchRating", "originMainSwitchBsEn", "originMainSwitchPoles", "originMainSwitchLocation"],
  systemDetails: ["systemDetails"],
  devices: ["devices"],
  luminaires: ["luminaires"],
  comments: ["commentsOnExistingInstallation"],
  overallCondition: ["overallCondition", "nextServiceDate"],
};

// ════════════════════════════════════════════════════════
// Internal helpers
// ════════════════════════════════════════════════════════

/** Section IDs that must never be copied (signatures/declarations) */
const SIGNATURE_BLOCKLIST = new Set([
  "declaration",
  "declarationDetails",
  "clientAcknowledgement",
  "designSection",
  "constructionSection",
  "inspectionSection",
]);

/** Data keys that should never be copied */
const COPY_KEY_BLOCKLIST = new Set([
  "type",
  "declaration",
  "declarationDetails",
  "clientAcknowledgement",
  "designSection",
  "constructionSection",
  "inspectionSection",
]);

/**
 * Tree-walk to nullify any nested object that looks like a signature
 * (has signedAtISO or signatureText properties).
 */
function stripSignatures(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(stripSignatures);
  }

  const record = obj as Record<string, unknown>;
  if ("signedAtISO" in record || "signatureText" in record) {
    return null;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = stripSignatures(value);
  }
  return result;
}

/**
 * Regenerate `id` fields in arrays (boards, circuits, devices, luminaires).
 * Walks the object tree and replaces any `id` field that looks like a UUID.
 */
function regenerateIds(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(regenerateIds);
  }

  const record = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === "id" && typeof value === "string" && value.length >= 32) {
      result[key] = crypto.randomUUID();
    } else {
      result[key] = regenerateIds(value);
    }
  }
  return result;
}

/** Check if a value is "empty" (empty string, false, 0, null, undefined, empty array/object) */
function isEmpty(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (val === "") return true;
  if (val === false) return true;
  if (val === 0) return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === "object" && !Array.isArray(val)) {
    return Object.keys(val).length === 0;
  }
  return false;
}

/**
 * Merge source into target at the field level — only fill empty fields.
 * Works recursively for nested objects but NOT for arrays (arrays are replaced atomically).
 */
function mergeEmpty(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const [key, sourceVal] of Object.entries(source)) {
    const targetVal = result[key];

    if (isEmpty(targetVal)) {
      result[key] = sourceVal;
    } else if (
      typeof targetVal === "object" &&
      !Array.isArray(targetVal) &&
      targetVal !== null &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      sourceVal !== null
    ) {
      result[key] = mergeEmpty(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    }
    // Otherwise keep targetVal
  }
  return result;
}

/** Get data keys for a section, respecting the map */
function getDataKeysForSection(sectionId: string): string[] {
  return SECTION_DATA_KEYS[sectionId] ?? [];
}

// ════════════════════════════════════════════════════════
// Public API
// ════════════════════════════════════════════════════════

/**
 * Copy selected sections from one certificate to another.
 *
 * - Intersects requested sectionIds with target type's sections
 * - Never copies signature/declaration keys
 * - Strips leaked signature objects via tree-walk
 * - Regenerates id fields in arrays
 * - Returns deep-cloned result
 */
export function copySections(
  targetType: CertificateType,
  fromData: Record<string, unknown>,
  toData: Record<string, unknown>,
  sectionIds: string[],
): Record<string, unknown> {
  const targetSectionIds = new Set(getTypeSections(targetType).map((s) => s.id));
  const result = structuredClone(toData);

  for (const sectionId of sectionIds) {
    // Only copy sections that exist in the target type
    if (!targetSectionIds.has(sectionId)) continue;

    const dataKeys = getDataKeysForSection(sectionId);
    for (const key of dataKeys) {
      // Never copy blocklisted keys
      if (COPY_KEY_BLOCKLIST.has(key)) continue;

      if (key in fromData) {
        let val = structuredClone(fromData[key]);
        val = stripSignatures(val);
        val = regenerateIds(val);
        result[key] = val;
      }
    }
  }

  return result;
}

/**
 * Context for applying smart defaults.
 */
export interface DefaultsContext {
  companyProfile?: Record<string, unknown>;
  lastUsedValues?: Record<string, unknown>;
}

/**
 * Apply smart defaults to a new certificate.
 *
 * Eligible sections: contractorDetails, supply, earthing (+ testInstruments when the type has it).
 * Priority: company profile > last-used values.
 * Empty data → replace; partially filled → merge at field level.
 */
export function applyDefaults(
  certType: CertificateType,
  data: Record<string, unknown>,
  context: DefaultsContext,
): Record<string, unknown> {
  const result = structuredClone(data);
  const features = getTypeFeatures(certType);
  const typeSectionIds = new Set(getTypeSections(certType).map((s) => s.id));

  // Sections eligible for defaults
  const eligibleSections = ["contractorDetails", "supply", "earthing"];
  if (features?.hasTestInstruments && typeSectionIds.has("testInstruments")) {
    eligibleSections.push("testInstruments");
  }

  for (const sectionId of eligibleSections) {
    if (!typeSectionIds.has(sectionId)) continue;

    const dataKeys = getDataKeysForSection(sectionId);
    for (const key of dataKeys) {
      // Try company profile first, then last-used
      let sourceVal: unknown = undefined;
      if (context.companyProfile && key in context.companyProfile) {
        sourceVal = context.companyProfile[key];
      } else if (context.lastUsedValues && key in context.lastUsedValues) {
        sourceVal = context.lastUsedValues[key];
      }

      if (sourceVal === undefined || sourceVal === null) continue;

      const currentVal = result[key];
      if (isEmpty(currentVal)) {
        // Fully empty → replace
        result[key] = structuredClone(sourceVal);
      } else if (
        typeof currentVal === "object" &&
        !Array.isArray(currentVal) &&
        typeof sourceVal === "object" &&
        !Array.isArray(sourceVal)
      ) {
        // Partially filled → merge at field level
        result[key] = mergeEmpty(
          currentVal as Record<string, unknown>,
          structuredClone(sourceVal) as Record<string, unknown>,
        );
      }
    }
  }

  return result;
}

/**
 * Apply a template to existing certificate data.
 *
 * @param mode "fill_empty" only fills empty fields; "overwrite" replaces all template keys
 */
export function applyTemplate(
  certType: CertificateType,
  templateData: Record<string, unknown>,
  targetData: Record<string, unknown>,
  mode: "fill_empty" | "overwrite",
): Record<string, unknown> {
  const result = structuredClone(targetData);

  for (const [key, value] of Object.entries(templateData)) {
    // Never overwrite type discriminant or signature keys
    if (key === "type") continue;
    if (COPY_KEY_BLOCKLIST.has(key)) continue;

    if (mode === "overwrite") {
      let val = structuredClone(value);
      val = regenerateIds(val);
      result[key] = val;
    } else {
      // fill_empty mode
      const currentVal = result[key];
      if (isEmpty(currentVal)) {
        let val = structuredClone(value);
        val = regenerateIds(val);
        result[key] = val;
      } else if (
        typeof currentVal === "object" &&
        !Array.isArray(currentVal) &&
        currentVal !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        value !== null
      ) {
        let mergedSource = structuredClone(value) as Record<string, unknown>;
        mergedSource = regenerateIds(mergedSource) as Record<string, unknown>;
        result[key] = mergeEmpty(
          currentVal as Record<string, unknown>,
          mergedSource,
        );
      }
    }
  }

  return result;
}

/**
 * Get the section IDs that exist in both certificate types.
 * Useful for copy-forward between different cert types.
 */
export function getSectionIntersection(
  typeA: CertificateType,
  typeB: CertificateType,
): string[] {
  const sectionsA = new Set(getTypeSections(typeA).map((s) => s.id));
  const sectionsB = getTypeSections(typeB).map((s) => s.id);
  return sectionsB.filter((id) => sectionsA.has(id));
}

/**
 * Extract partial data for specific sections from full certificate data.
 * Used when saving a template to capture only selected section data.
 */
export function extractSectionData(
  data: Record<string, unknown>,
  sectionIds: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const sectionId of sectionIds) {
    const dataKeys = getDataKeysForSection(sectionId);
    for (const key of dataKeys) {
      if (COPY_KEY_BLOCKLIST.has(key)) continue;
      if (key in data) {
        result[key] = structuredClone(data[key]);
      }
    }
  }

  return result;
}

/** Section IDs that contain signature/declaration data (for UI: greyed out, non-selectable) */
export const SIGNATURE_SECTION_IDS = new Set([
  "declaration",
  "clientAcknowledgement",
  "design",
  "construction",
  "inspection",
]);
