/**
 * Request-scoped context via AsyncLocalStorage.
 *
 * Populated by `withRequestLogging` so that downstream code
 * (logger, Sentry scope, etc.) can access requestId / companyId / userId
 * without explicit prop-drilling.
 */
import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContext = {
  requestId: string;
  companyId?: string;
  userId?: string;
  route?: string;
};

export const requestContext = new AsyncLocalStorage<RequestContext>();

/** Read current context (returns empty object outside a request). */
export function getRequestContext(): Partial<RequestContext> {
  return requestContext.getStore() ?? {};
}
