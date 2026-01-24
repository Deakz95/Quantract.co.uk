import type { AiResponse } from "@/lib/ai/responseSchema";
import type { AiDataBundle } from "@/lib/ai/dataAccess";

export class InvalidCitationError extends Error {
  constructor(public invalidCitations: Array<{ entityType: string; entityId: string }>) {
    super(`Invalid citations: ${JSON.stringify(invalidCitations)}`);
    this.name = "InvalidCitationError";
  }
}

/**
 * Validates citations reference real record IDs.
 * Throws on invalid citations - does not silently strip.
 */
export function validateCitations(ai: AiResponse, bundle: AiDataBundle): void {
  if (!ai.citations || ai.citations.length === 0) return;
  const invalid = ai.citations.filter((c) => !bundle.validEntityIds.has(c.entityId));
  if (invalid.length > 0) {
    throw new InvalidCitationError(invalid.map((c) => ({ entityType: c.entityType, entityId: c.entityId })));
  }
}
