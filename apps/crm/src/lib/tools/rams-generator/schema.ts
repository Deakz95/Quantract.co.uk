import { z } from "zod";

export const riskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const hazardSchema = z.object({
  hazard: z.string().min(1),
  risk: riskLevelSchema,
  persons: z.string().min(1),
  controls: z.string().min(1),
  residualRisk: riskLevelSchema,
});
export type Hazard = z.infer<typeof hazardSchema>;

export const methodStepSchema = z.object({
  step: z.number().int().positive(),
  description: z.string().min(1),
  responsible: z.string().min(1),
  ppe: z.string().min(1),
});
export type MethodStep = z.infer<typeof methodStepSchema>;

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

export const ramsContentSchema = z.object({
  projectName: z.string().min(1),
  projectAddress: z.string().min(1),
  clientName: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  scopeOfWork: z.string().min(1),
  hazards: z.array(hazardSchema).min(1),
  methodStatements: z.array(methodStepSchema).min(1),
  emergencyProcedures: z.string().min(1),
  ppeRequired: z.array(z.string()).min(1),
  toolsAndEquipment: z.array(z.string()),
  permits: z.array(z.string()),
});

export type RamsContent = z.infer<typeof ramsContentSchema>;
