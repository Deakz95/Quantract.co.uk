/**
 * Certificate Workflow Engine (CERT-A14)
 *
 * Step-based, registry-driven workflow for certificate completion.
 * Steps are derived from CertificateTypeConfig.sections — not hardcoded.
 *
 * Key design decisions:
 *  - Pure functions — no state management. UI layer owns persistence.
 *  - Per-step validation uses registry rules filtered by section ID.
 *  - Optional sections can always be advanced past.
 *  - Backward navigation is always free (no validation gate).
 *  - `completedSteps` are computed from data, not stored.
 */

import type { CertificateType } from "./certificate-types";
import {
  CERTIFICATE_TYPE_REGISTRY,
  type CertificateTypeConfig,
  type CertificateSectionConfig,
  type ValidationRule,
  type RegistryValidationError,
  resolvePath,
  hasStr,
  signaturePresent,
} from "./certificate-registry";

// ── Types ──

export interface WorkflowStep {
  /** Step index (0-based) */
  index: number;
  /** Section ID from the registry */
  sectionId: string;
  /** Display label */
  label: string;
  /** Whether this section is required for certificate completion */
  required: boolean;
  /** Description / help text */
  description?: string;
  /** Total number of steps */
  totalSteps: number;
}

export interface StepValidationResult {
  /** Whether the step passes validation */
  ok: boolean;
  /** Human-readable list of missing items */
  missing: string[];
  /** Structured errors */
  errors: RegistryValidationError[];
}

export interface WorkflowProgress {
  /** Total number of steps */
  totalSteps: number;
  /** Number of completed steps */
  completedCount: number;
  /** Completion percentage (0-100) */
  percent: number;
  /** List of completed step section IDs */
  completedSteps: string[];
  /** List of incomplete step section IDs */
  incompleteSteps: string[];
  /** Whether all required steps are complete */
  allRequiredComplete: boolean;
}

// ── Core functions ──

/**
 * Get the ordered list of workflow steps for a certificate type.
 * Steps are derived directly from the registry's section definitions.
 */
export function getCertificateSteps(
  certType: CertificateType
): WorkflowStep[] {
  const config = CERTIFICATE_TYPE_REGISTRY[certType];
  if (!config) return [];

  return config.sections.map((section, index) => ({
    index,
    sectionId: section.id,
    label: section.label,
    required: section.required,
    description: section.description,
    totalSteps: config.sections.length,
  }));
}

/**
 * Get validation rules that apply to a specific step/section.
 */
export function getStepRules(
  certType: CertificateType,
  stepId: string
): ValidationRule[] {
  const config = CERTIFICATE_TYPE_REGISTRY[certType];
  if (!config) return [];
  return config.validationRules.filter((r) => r.section === stepId);
}

/**
 * Validate a single step's data.
 * Runs only the validation rules that belong to the given section.
 */
export function validateStep(
  certType: CertificateType,
  stepId: string,
  data: Record<string, unknown>
): StepValidationResult {
  const config = CERTIFICATE_TYPE_REGISTRY[certType];
  if (!config) return { ok: true, missing: [], errors: [] };

  const rules = config.validationRules.filter((r) => r.section === stepId);
  if (rules.length === 0) {
    // No rules for this section — it passes by default
    return { ok: true, missing: [], errors: [] };
  }

  const missing: string[] = [];
  const errors: RegistryValidationError[] = [];

  for (const rule of rules) {
    const passed = evaluateRule(rule, data);
    if (!passed) {
      missing.push(rule.label);
      errors.push({
        section: rule.section,
        field: "path" in rule ? rule.path : "kind" in rule && rule.kind === "oneOf" ? rule.paths[0] : rule.section,
        message: `${rule.label.charAt(0).toUpperCase() + rule.label.slice(1)} is required`,
      });
    }
  }

  return { ok: missing.length === 0, missing, errors };
}

/**
 * Check whether the user can advance past a step.
 *
 * Rules:
 * - Optional sections can always be advanced past
 * - Required sections must pass their validation rules
 * - Steps with no validation rules can always be advanced past
 */
export function canAdvanceStep(
  certType: CertificateType,
  stepId: string,
  data: Record<string, unknown>
): StepValidationResult {
  const config = CERTIFICATE_TYPE_REGISTRY[certType];
  if (!config) return { ok: true, missing: [], errors: [] };

  const section = config.sections.find((s) => s.id === stepId);
  if (!section) return { ok: true, missing: [], errors: [] };

  // Optional sections can always be advanced past
  if (!section.required) {
    return { ok: true, missing: [], errors: [] };
  }

  return validateStep(certType, stepId, data);
}

/**
 * Find the first incomplete step that needs attention.
 * Returns the section ID or undefined if all steps are complete.
 *
 * Checks required sections first, then optional ones.
 * Useful for resume-on-reload.
 */
export function getNextIncompleteStep(
  certType: CertificateType,
  data: Record<string, unknown>
): string | undefined {
  const config = CERTIFICATE_TYPE_REGISTRY[certType];
  if (!config) return undefined;

  // First pass: find incomplete required sections
  for (const section of config.sections) {
    if (!section.required) continue;
    const result = validateStep(certType, section.id, data);
    if (!result.ok) return section.id;
  }

  // All required sections are complete — check optional sections for any
  // that have rules defined (to guide the user)
  for (const section of config.sections) {
    if (section.required) continue;
    const rules = config.validationRules.filter(
      (r) => r.section === section.id
    );
    if (rules.length === 0) continue;
    const result = validateStep(certType, section.id, data);
    if (!result.ok) return section.id;
  }

  return undefined; // all steps complete
}

/**
 * Get the list of completed step section IDs.
 * A step is "complete" if:
 * - It has no validation rules (always complete), OR
 * - All its validation rules pass
 */
export function getCompletedSteps(
  certType: CertificateType,
  data: Record<string, unknown>
): string[] {
  const config = CERTIFICATE_TYPE_REGISTRY[certType];
  if (!config) return [];

  const completed: string[] = [];
  for (const section of config.sections) {
    const result = validateStep(certType, section.id, data);
    if (result.ok) {
      completed.push(section.id);
    }
  }
  return completed;
}

/**
 * Get overall workflow progress for a certificate.
 */
export function getWorkflowProgress(
  certType: CertificateType,
  data: Record<string, unknown>
): WorkflowProgress {
  const config = CERTIFICATE_TYPE_REGISTRY[certType];
  if (!config) {
    return {
      totalSteps: 0,
      completedCount: 0,
      percent: 0,
      completedSteps: [],
      incompleteSteps: [],
      allRequiredComplete: true,
    };
  }

  const completedSteps = getCompletedSteps(certType, data);
  const completedSet = new Set(completedSteps);

  const incompleteSteps = config.sections
    .map((s) => s.id)
    .filter((id) => !completedSet.has(id));

  const requiredSections = config.sections.filter((s) => s.required);
  const allRequiredComplete = requiredSections.every((s) =>
    completedSet.has(s.id)
  );

  const totalSteps = config.sections.length;
  const completedCount = completedSteps.length;
  const percent =
    totalSteps === 0
      ? 0
      : Math.round((completedCount / totalSteps) * 100);

  return {
    totalSteps,
    completedCount,
    percent,
    completedSteps,
    incompleteSteps,
    allRequiredComplete,
  };
}

/**
 * Get step info for a specific section ID within a certificate type.
 */
export function getStepBySection(
  certType: CertificateType,
  sectionId: string
): WorkflowStep | undefined {
  const steps = getCertificateSteps(certType);
  return steps.find((s) => s.sectionId === sectionId);
}

/**
 * Get the next step after the given section.
 */
export function getNextStep(
  certType: CertificateType,
  currentSectionId: string
): WorkflowStep | undefined {
  const steps = getCertificateSteps(certType);
  const currentIdx = steps.findIndex((s) => s.sectionId === currentSectionId);
  if (currentIdx < 0 || currentIdx >= steps.length - 1) return undefined;
  return steps[currentIdx + 1];
}

/**
 * Get the previous step before the given section.
 */
export function getPreviousStep(
  certType: CertificateType,
  currentSectionId: string
): WorkflowStep | undefined {
  const steps = getCertificateSteps(certType);
  const currentIdx = steps.findIndex((s) => s.sectionId === currentSectionId);
  if (currentIdx <= 0) return undefined;
  return steps[currentIdx - 1];
}

// ── Internal helpers ──

/** Evaluate a single validation rule against data */
function evaluateRule(
  rule: ValidationRule,
  data: Record<string, unknown>
): boolean {
  switch (rule.kind) {
    case "required":
      return hasStr(resolvePath(data, rule.path));

    case "requiredTrue":
      return Boolean(resolvePath(data, rule.path));

    case "oneOf":
      return rule.paths.some((p) => hasStr(resolvePath(data, p)));

    case "minArray": {
      const arr = resolvePath(data, rule.path);
      return Array.isArray(arr) && arr.length >= rule.min;
    }

    case "signature": {
      const sig = resolvePath(data, rule.path);
      let ok = signaturePresent(sig);
      if (!ok && rule.fallbackNamePath) {
        ok = hasStr(resolvePath(data, rule.fallbackNamePath));
      }
      if (!ok && rule.path.includes("inspector")) {
        ok = signaturePresent(resolvePath(data, "signatures.engineer"));
      }
      return ok;
    }

    case "custom":
      return evaluateCustomCheck(rule.check, data);
  }
}

/** Evaluate well-known custom checks (mirrors the registry implementation) */
function evaluateCustomCheck(
  check: string,
  data: Record<string, unknown>
): boolean {
  switch (check) {
    case "boardsHaveCircuit": {
      const boards = data.boards as
        | Array<Record<string, unknown>>
        | undefined;
      if (!Array.isArray(boards)) return false;
      for (const board of boards) {
        const circuits = board.circuits as
          | Array<Record<string, unknown>>
          | undefined;
        if (Array.isArray(circuits)) {
          for (const c of circuits) {
            if (!c.isEmpty) return true;
          }
        }
      }
      return false;
    }

    case "allCircuitsHaveStatus": {
      const boards = data.boards as
        | Array<Record<string, unknown>>
        | undefined;
      if (!Array.isArray(boards)) return true;
      for (const board of boards) {
        const circuits = board.circuits as
          | Array<Record<string, unknown>>
          | undefined;
        if (Array.isArray(circuits)) {
          for (const c of circuits) {
            if (c.isEmpty) continue;
            if (!hasStr(c.status)) return false;
          }
        }
      }
      return true;
    }

    case "eicDesignerDetails": {
      if (Boolean(data.sameAsDesigner)) return true;
      const designSection = (data.designSection ?? {}) as Record<
        string,
        unknown
      >;
      const signatories = (data.signatories ?? {}) as Record<string, unknown>;
      return (
        hasStr(designSection.name) ||
        hasStr(designSection.qualifications) ||
        signaturePresent(designSection.signature) ||
        Boolean(signatories.sameAsDesigner)
      );
    }

    default:
      return true;
  }
}
