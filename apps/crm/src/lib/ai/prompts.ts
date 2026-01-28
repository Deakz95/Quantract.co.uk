/**
 * CRM AI Prompts
 *
 * Re-exports from the modular prompts structure for backward compatibility.
 * New code should import directly from ./prompts/crm.ts
 */

import type { AIRole } from "@/lib/auth/aiSession";
import { CRM_SYSTEM_PROMPTS, CRM_SUGGESTED_PROMPTS } from "./prompts/crm";

// Re-export for backward compatibility
export const SYSTEM_PROMPTS: Record<AIRole, string> = CRM_SYSTEM_PROMPTS;
export const SUGGESTED_PROMPTS: Record<AIRole, string[]> = CRM_SUGGESTED_PROMPTS;

// Export new modules
export { CRM_SYSTEM_PROMPTS, CRM_SUGGESTED_PROMPTS } from "./prompts/crm";
export { MARKETING_SYSTEM_PROMPT, MARKETING_SUGGESTED_PROMPTS } from "./prompts/marketing";
