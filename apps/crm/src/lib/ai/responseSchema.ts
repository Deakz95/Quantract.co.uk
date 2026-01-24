import { z } from "zod";

export const AiCitationSchema = z.object({
  entityType: z.enum(["JOB", "QUOTE", "VARIATION", "INVOICE", "TIME_ENTRY", "TIMESHEET", "CERTIFICATE", "AUDIT"]),
  entityId: z.string().min(1),
  note: z.string().max(200),
});

export const AiResponseSchema = z.object({
  answer: z.string().min(1),
  confidence: z.number().min(0).max(1),
  citations: z.array(AiCitationSchema).max(20).default([]),
  suggestedActions: z
    .array(
      z.object({
        type: z.enum(["NAVIGATE", "DRAFT_EMAIL", "DRAFT_SMS", "SUGGEST_NEXT_STEP"]),
        label: z.string().max(200),
        payload: z.record(z.unknown()).optional(),
      })
    )
    .max(10)
    .default([]),
  missingData: z.array(z.string()).max(10).default([]),
});

export type AiResponse = z.infer<typeof AiResponseSchema>;
export type AiCitation = z.infer<typeof AiCitationSchema>;
