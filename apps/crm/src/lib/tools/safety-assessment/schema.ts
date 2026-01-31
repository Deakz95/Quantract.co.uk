import { z } from "zod";

export const checkStatusSchema = z.enum(["pass", "fail", "na"]);
export type CheckStatus = z.infer<typeof checkStatusSchema>;

export const checkItemSchema = z.object({
  item: z.string().min(1),
  status: checkStatusSchema,
  notes: z.string().default(""),
});
export type CheckItem = z.infer<typeof checkItemSchema>;

export const checkCategorySchema = z.object({
  category: z.string().min(1),
  checks: z.array(checkItemSchema).min(1),
});
export type CheckCategory = z.infer<typeof checkCategorySchema>;

export const overallRatingSchema = z.enum(["safe", "conditional", "unsafe"]);
export type OverallRating = z.infer<typeof overallRatingSchema>;

export const safetyAssessmentContentSchema = z.object({
  siteName: z.string().min(1),
  siteAddress: z.string().min(1),
  assessorName: z.string().min(1),
  date: z.string().min(1),
  categories: z.array(checkCategorySchema).min(1),
  overallRating: overallRatingSchema,
  recommendations: z.array(z.string()),
});

export type SafetyAssessmentContent = z.infer<typeof safetyAssessmentContentSchema>;
