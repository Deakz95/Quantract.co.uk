/** RAMS types and constants — standalone version for the public tools app.
 *  Mirrors the CRM's rams-generator/schema.ts without Zod dependency. */

export type RiskLevel = "low" | "medium" | "high";

export interface Hazard {
  hazard: string;
  risk: RiskLevel;
  persons: string;
  controls: string;
  residualRisk: RiskLevel;
}

export interface MethodStep {
  step: number;
  description: string;
  responsible: string;
  ppe: string;
}

export interface RamsContent {
  projectName: string;
  projectAddress: string;
  clientName: string;
  startDate: string;
  endDate: string;
  scopeOfWork: string;
  hazards: Hazard[];
  methodStatements: MethodStep[];
  emergencyProcedures: string;
  ppeRequired: string[];
  toolsAndEquipment: string[];
  permits: string[];
}

export const PPE_OPTIONS = [
  "Hard Hat",
  "Safety Boots",
  "Hi-Vis Vest",
  "Gloves",
  "Eye Protection",
  "Ear Protection",
  "Harness",
  "Face Shield",
  "Dust Mask",
  "Respirator",
  "Knee Pads",
  "Insulated Gloves",
] as const;

export const PERMIT_OPTIONS = [
  "Hot Works",
  "Confined Space",
  "Working at Height",
  "Isolation",
  "Excavation",
  "Roof Access",
] as const;
