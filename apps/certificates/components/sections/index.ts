/**
 * Certificate Section Components — Registry-Driven UI (CERT-A15)
 *
 * Re-exports all section components and the SectionRenderer entry point.
 */

// Main entry point
export {
  SectionRenderer,
  isSectionHandled,
  getSectionDataPath,
  type SectionRendererProps,
} from "./SectionRenderer";

// Individual section components
export { DetailsSection } from "./DetailsSection";
export { SupplySection } from "./SupplySection";
export { EarthingSection } from "./EarthingSection";
export { OverallAssessmentSection } from "./OverallAssessmentSection";
export { NextInspectionSection } from "./NextInspectionSection";
export { TestResultsSection } from "./TestResultsSection";
export { WorkDescriptionSection } from "./WorkDescriptionSection";
export { CircuitDetailsSection } from "./CircuitDetailsSection";
