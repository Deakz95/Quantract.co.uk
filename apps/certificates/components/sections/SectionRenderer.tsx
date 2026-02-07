"use client";

/**
 * Certificate Section Renderer — Registry-Driven UI (CERT-A15)
 *
 * Routes section IDs to components. Driven entirely by the registry:
 *  - Section ID → component mapping (static, no cert-type switch)
 *  - Feature flags decide which capabilities are available
 *  - Data scoping extracts the right sub-object for each section
 *
 * Design rules:
 *  - ZERO cert-type conditionals
 *  - Section ID is the sole routing key
 *  - Components receive generic Record<string, unknown> data
 *  - "Complex" sections (boards, photos) return null — page handles them
 */

import type { ReactNode } from "react";
import type { CertificateType } from "@quantract/shared/certificate-types";
import {
  getTypeConfig,
  getTypeFeatures,
  type CertificateFeatures,
} from "@quantract/shared/certificate-types";

// Section components
import { ContractorDetails } from "../ContractorDetails";
import { ExtentAndLimitations } from "../ExtentAndLimitations";
import { InspectionChecklist } from "../InspectionChecklist";
import { ObservationsList, type Observation } from "../ObservationsList";
import { SummaryOfCondition } from "../SummaryOfCondition";
import { DeclarationSection } from "../DeclarationSection";
import { ClientAcknowledgement } from "../ClientAcknowledgement";
import { InstallationTypeSelector } from "../InstallationTypeSelector";
import { EICSignatorySection } from "../EICSignatorySection";
import { PhotoCapture } from "../PhotoCapture";

// New extracted sections
import { DetailsSection } from "./DetailsSection";
import { SupplySection } from "./SupplySection";
import { EarthingSection } from "./EarthingSection";
import { OverallAssessmentSection } from "./OverallAssessmentSection";
import { NextInspectionSection } from "./NextInspectionSection";
import { TestResultsSection } from "./TestResultsSection";
import { WorkDescriptionSection } from "./WorkDescriptionSection";
import { CircuitDetailsSection } from "./CircuitDetailsSection";

// ── Types ──

export interface SectionRendererProps {
  /** Certificate type (drives feature flags, not section routing) */
  certType: CertificateType;
  /** Section ID from the registry */
  sectionId: string;
  /** Full certificate data object */
  data: Record<string, unknown>;
  /** Update full certificate data */
  onChange: (data: Record<string, unknown>) => void;

  // ── Signatures (optional) ──
  /** Signature values keyed by role ("engineer", "customer", "designer", etc.) */
  signatures?: Record<string, string | null>;
  /** Update a signature by role */
  onSignatureChange?: (role: string, sig: string | null) => void;

  // ── Photos (optional) ──
  photos?: string[];
  onPhotosChange?: (photos: string[]) => void;

  // ── Custom overrides ──
  /**
   * If provided, this content is rendered instead of the default for this section.
   * Use this for complex sections like "boards" that need custom page-level logic.
   */
  customContent?: ReactNode;
}

// ── Data scoping ──

/**
 * Maps section IDs to their data path within the certificate data object.
 * Sections not listed here use top-level data (e.g. overallAssessment reads
 * data.overallCondition, data.recommendedRetestDate directly).
 */
const SECTION_DATA_PATH: Record<string, string> = {
  contractorDetails: "contractorDetails",
  overview: "overview",
  supply: "supplyCharacteristics",
  earthing: "earthingArrangements",
  extentAndLimitations: "extentAndLimitations",
  testResults: "testResults",
  circuitDetails: "circuitDetails",
  declarationDetails: "declarationDetails",
  clientAcknowledgement: "clientAcknowledgement",
};

function getSectionData(
  data: Record<string, unknown>,
  sectionId: string
): Record<string, unknown> {
  const path = SECTION_DATA_PATH[sectionId];
  if (!path) return data;
  return (data[path] ?? {}) as Record<string, unknown>;
}

function setSectionData(
  data: Record<string, unknown>,
  sectionId: string,
  sectionData: Record<string, unknown>
): Record<string, unknown> {
  const path = SECTION_DATA_PATH[sectionId];
  if (!path) return { ...data, ...sectionData };
  return { ...data, [path]: sectionData };
}

// ── Render helpers ──

/**
 * Get the declaration role for the current cert type from the registry signatures.
 */
function getDeclarationRole(
  certType: CertificateType
): "inspector" | "installer" | "designer" {
  const config = getTypeConfig(certType);
  if (!config) return "inspector";
  const sig = config.signatures[0];
  if (!sig) return "inspector";
  if (sig.role === "installer") return "installer";
  if (sig.role === "designer") return "designer";
  return "inspector";
}

// ── Component ──

export function SectionRenderer({
  certType,
  sectionId,
  data,
  onChange,
  signatures,
  onSignatureChange,
  photos,
  onPhotosChange,
  customContent,
}: SectionRendererProps) {
  const features = getTypeFeatures(certType);

  // Custom content override (for boards, complex sections)
  if (customContent !== undefined) {
    return <>{customContent}</>;
  }

  // Helper: update a sub-object section
  const onSectionChange = (sectionData: Record<string, unknown>) => {
    onChange(setSectionData(data, sectionId, sectionData));
  };

  // Helper: update top-level fields
  const onTopLevelChange = (updated: Record<string, unknown>) => {
    onChange({ ...data, ...updated });
  };

  const sectionData = getSectionData(data, sectionId);

  // ── Route by section ID ──
  switch (sectionId) {
    // ── Contractor Details ──
    case "contractorDetails":
      return (
        <ContractorDetails
          data={sectionData as Parameters<typeof ContractorDetails>[0]["data"]}
          onChange={onSectionChange as Parameters<typeof ContractorDetails>[0]["onChange"]}
        />
      );

    // ── Installation Details / Overview ──
    case "overview":
      return (
        <DetailsSection
          data={sectionData}
          onChange={onSectionChange}
        />
      );

    // ── Extent & Limitations ──
    case "extentAndLimitations":
      return (
        <ExtentAndLimitations
          data={sectionData as Parameters<typeof ExtentAndLimitations>[0]["data"]}
          onChange={onSectionChange as Parameters<typeof ExtentAndLimitations>[0]["onChange"]}
        />
      );

    // ── Supply Characteristics ──
    case "supply":
      return (
        <SupplySection
          data={sectionData}
          onChange={onSectionChange}
        />
      );

    // ── Earthing Arrangements ──
    case "earthing":
      return (
        <EarthingSection
          data={sectionData}
          onChange={onSectionChange}
        />
      );

    // ── General Inspection ──
    case "generalInspection":
      return (
        <InspectionChecklist
          items={(data.generalInspection ?? []) as Parameters<typeof InspectionChecklist>[0]["items"]}
          onChange={(items) => onChange({ ...data, generalInspection: items })}
        />
      );

    // ── Observations (list form for EICR/EIC) ──
    case "observations":
      if (features?.hasObservations && Array.isArray(data.observations)) {
        return (
          <ObservationsList
            observations={data.observations as Observation[]}
            onChange={(observations) => onChange({ ...data, observations })}
          />
        );
      }
      // MWC-style text observations
      return (
        <div className="space-y-3">
          <textarea
            value={String(data.observations ?? "")}
            onChange={(e) => onChange({ ...data, observations: e.target.value })}
            placeholder="Enter any observations or comments about the work carried out..."
            className="w-full min-h-[150px] rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
          />
        </div>
      );

    // ── Summary of Condition ──
    case "summaryOfCondition": {
      const summary = (data.summaryOfCondition ?? {}) as Record<string, number>;
      return (
        <SummaryOfCondition
          c1Count={summary.c1Count ?? 0}
          c2Count={summary.c2Count ?? 0}
          c3Count={summary.c3Count ?? 0}
          fiCount={summary.fiCount ?? 0}
        />
      );
    }

    // ── Overall Assessment (EICR, FIRE, EML) ──
    case "overallAssessment":
    case "overallCondition":
      return (
        <OverallAssessmentSection
          data={data}
          onChange={onTopLevelChange}
        />
      );

    // ── Next Inspection (EIC, MWC) ──
    case "nextInspection":
      return (
        <NextInspectionSection
          data={data}
          onChange={onTopLevelChange}
        />
      );

    // ── Declaration ──
    case "declaration":
      return (
        <DeclarationSection
          role={getDeclarationRole(certType)}
          data={(data.declarationDetails ?? {
            inspectorName: "",
            inspectorQualifications: "",
            inspectorPosition: "",
            inspectorDateSigned: "",
            complianceConfirmed: false,
          }) as Parameters<typeof DeclarationSection>[0]["data"]}
          onChange={(declarationDetails) =>
            onChange({ ...data, declarationDetails })
          }
          signatureValue={signatures?.engineer ?? signatures?.inspector ?? null}
          onSignatureChange={
            onSignatureChange
              ? (sig) => onSignatureChange("engineer", sig)
              : undefined
          }
        />
      );

    // ── Client Acknowledgement ──
    case "clientAcknowledgement":
      return (
        <ClientAcknowledgement
          data={(data.clientAcknowledgement ?? {
            clientName: "",
            clientDateSigned: "",
          }) as Parameters<typeof ClientAcknowledgement>[0]["data"]}
          onChange={(clientAcknowledgement) =>
            onChange({ ...data, clientAcknowledgement })
          }
          signatureValue={signatures?.customer ?? signatures?.client ?? null}
          onSignatureChange={
            onSignatureChange
              ? (sig) => onSignatureChange("customer", sig)
              : undefined
          }
        />
      );

    // ── Installation Type (EIC) ──
    case "installationType":
      return (
        <InstallationTypeSelector
          installationType={String(data.installationType ?? "")}
          commentsOnExistingInstallation={String(
            data.commentsOnExistingInstallation ?? ""
          )}
          onChange={(field, value) => onChange({ ...data, [field]: value })}
        />
      );

    // ── Work Description (MWC) ──
    case "workDescription":
      return (
        <WorkDescriptionSection
          data={data}
          onChange={onTopLevelChange}
        />
      );

    // ── Circuit Details (MWC) ──
    case "circuitDetails":
      return (
        <CircuitDetailsSection
          data={sectionData}
          onChange={onSectionChange}
        />
      );

    // ── Test Results (MWC, FIRE, EML) ──
    case "testResults":
      return (
        <TestResultsSection
          data={sectionData}
          onChange={onSectionChange}
        />
      );

    // ── Photos ──
    case "photos":
      if (onPhotosChange) {
        return (
          <PhotoCapture
            photos={photos ?? []}
            onChange={onPhotosChange}
          />
        );
      }
      return null;

    // ── Boards, design/construction/inspection, devices, luminaires, systemDetails ──
    // These are complex sections handled by the page directly via customContent.
    case "boards":
    case "design":
    case "construction":
    case "inspection":
    case "comments":
    case "originParticulars":
    case "systemDetails":
    case "devices":
    case "luminaires":
      return null;

    default:
      return (
        <div className="text-sm text-[var(--muted-foreground)] py-8 text-center">
          Section &ldquo;{sectionId}&rdquo; is not yet implemented.
        </div>
      );
  }
}

// ── Utility: check if SectionRenderer handles a section ──

const SELF_HANDLED_SECTIONS = new Set([
  "contractorDetails",
  "overview",
  "extentAndLimitations",
  "supply",
  "earthing",
  "generalInspection",
  "observations",
  "summaryOfCondition",
  "overallAssessment",
  "overallCondition",
  "nextInspection",
  "declaration",
  "clientAcknowledgement",
  "installationType",
  "workDescription",
  "circuitDetails",
  "testResults",
  "photos",
]);

/**
 * Returns true if SectionRenderer can render this section without custom content.
 * Use this to decide whether the page needs to provide customContent.
 */
export function isSectionHandled(sectionId: string): boolean {
  return SELF_HANDLED_SECTIONS.has(sectionId);
}

/**
 * Get the data path for a section ID.
 * Returns undefined if the section uses top-level data.
 */
export function getSectionDataPath(sectionId: string): string | undefined {
  return SECTION_DATA_PATH[sectionId];
}

// Re-export feature flags check for convenience
export { getTypeFeatures, type CertificateFeatures };
