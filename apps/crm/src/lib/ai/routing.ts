/**
 * AI Assistant Routing Logic
 *
 * Determines which assistant (marketing vs CRM) should handle a request
 * based on environment, authentication state, and intent detection.
 */

import { CRM_INTENT_KEYWORDS } from "./prompts/marketing";
import { MARKETING_INTENT_KEYWORDS } from "./prompts/crm";

export type AssistantEnvironment = "marketing_site" | "crm_app";
export type AssistantType = "marketing" | "crm";

export interface RoutingContext {
  environment: AssistantEnvironment;
  isAuthenticated: boolean;
  currentPath?: string;
  userRole?: string;
}

export interface RoutingResult {
  assistantType: AssistantType;
  shouldRedirect: boolean;
  redirectMessage?: string;
}

/**
 * Detect if a message contains CRM-related intent
 */
export function hasCrmIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return CRM_INTENT_KEYWORDS.some((keyword) => lowerMessage.includes(keyword));
}

/**
 * Detect if a message contains marketing-related intent
 */
export function hasMarketingIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return MARKETING_INTENT_KEYWORDS.some((keyword) =>
    lowerMessage.includes(keyword)
  );
}

/**
 * Determine which assistant should handle the request.
 *
 * Rules:
 * 1. Environment takes precedence over intent (prevents takeover)
 * 2. Marketing site always uses marketing assistant
 * 3. CRM app with authentication uses CRM assistant
 * 4. If intent conflicts with environment, generate redirect message
 */
export function routeAssistant(
  context: RoutingContext,
  message: string
): RoutingResult {
  const { environment, isAuthenticated } = context;

  // Rule 1: Marketing site - always marketing assistant
  if (environment === "marketing_site" || !isAuthenticated) {
    const hasCrmQuery = hasCrmIntent(message);

    if (hasCrmQuery) {
      return {
        assistantType: "marketing",
        shouldRedirect: true,
        redirectMessage:
          "I don't have access to account data - I'm the public help assistant. " +
          "Please sign in to your Quantract account at crm.quantract.co.uk " +
          "where the in-app assistant can help you with your jobs, invoices, and more.",
      };
    }

    return {
      assistantType: "marketing",
      shouldRedirect: false,
    };
  }

  // Rule 2: CRM app with authentication - CRM assistant
  if (environment === "crm_app" && isAuthenticated) {
    const hasMarketingQuery = hasMarketingIntent(message);

    if (hasMarketingQuery) {
      // Don't redirect, but the CRM prompt will handle this gracefully
      // by giving a brief answer and returning to task
      return {
        assistantType: "crm",
        shouldRedirect: false,
        // No redirect message - CRM prompt handles marketing questions gracefully
      };
    }

    return {
      assistantType: "crm",
      shouldRedirect: false,
    };
  }

  // Fallback: unauthenticated always gets marketing
  return {
    assistantType: "marketing",
    shouldRedirect: false,
  };
}

/**
 * Get the display name for the assistant based on context
 */
export function getAssistantDisplayName(context: RoutingContext): {
  title: string;
  subtitle: string;
} {
  if (context.environment === "marketing_site" || !context.isAuthenticated) {
    return {
      title: "Quantract Help",
      subtitle: "Pricing & Product Help",
    };
  }

  return {
    title: "Quantract Assistant",
    subtitle: "Admin Assistant",
  };
}
