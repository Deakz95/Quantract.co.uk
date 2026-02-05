/** Standardized tool output schema — mirrors CRM ToolOutput model shape */
export interface ToolOutput {
  id: string;
  toolSlug: string;
  name: string;
  inputsJson: Record<string, unknown>;
  outputsJson: Record<string, unknown>;
  createdAt: string; // ISO 8601
}
