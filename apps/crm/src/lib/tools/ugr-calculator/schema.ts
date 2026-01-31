import { z } from "zod";

export const ugrInputSchema = z.object({
  /** Room length in metres */
  roomLength: z.number().positive().max(200),
  /** Room width in metres */
  roomWidth: z.number().positive().max(200),
  /** Luminaire height above eye level in metres */
  luminaireHeight: z.number().positive().max(30),
  /** Luminaire lumen output */
  luminaireLumens: z.number().positive().max(200000).default(5000),
  /** Number of luminaires */
  numberOfLuminaires: z.number().int().positive().max(500).default(12),
  /** Luminaire emitting area in m2 */
  luminaireArea: z.number().positive().max(10).default(0.12),
  /** Background luminance in cd/m2 */
  backgroundLuminance: z.number().positive().max(1000).default(20),
});

export type UgrInput = z.infer<typeof ugrInputSchema>;

export interface UgrOutput {
  ugr: number;
  rating: "acceptable" | "borderline" | "excessive";
  taskLimits: { office: number; industrial: number; corridor: number };
  recommendations: string[];
}
