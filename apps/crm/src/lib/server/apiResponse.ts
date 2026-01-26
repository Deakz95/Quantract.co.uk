/**
 * Safe API Response Utilities
 *
 * HARDENED: Never leaks stack traces or internal error details to clients.
 * All errors are logged to Sentry with full context but clients receive
 * sanitized, user-friendly messages.
 */

import { NextResponse } from "next/server";
import { logError } from "@/lib/server/observability";

type ErrorContext = {
  route: string;
  method?: string;
  userId?: string | null;
  companyId?: string | null;
  requestId?: string | null;
  action?: string;
  [key: string]: unknown;
};

/**
 * User-friendly error messages mapped from internal error types
 */
const USER_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Please log in to continue",
  FORBIDDEN: "You don't have permission to perform this action",
  NOT_FOUND: "The requested resource was not found",
  VALIDATION: "Please check your input and try again",
  RATE_LIMITED: "Too many requests. Please wait and try again",
  INTERNAL: "Something went wrong. Please try again later",
  DATABASE: "A database error occurred. Please try again",
  NETWORK: "A network error occurred. Please try again",
};

/**
 * Create a safe JSON response - NEVER includes stack traces
 */
export function safeJson<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Create a safe error response - NEVER includes stack traces
 * Logs full error to Sentry, returns sanitized message to client
 */
export function safeError(
  error: Error | unknown,
  context: ErrorContext,
  options?: {
    status?: number;
    userMessage?: string;
    code?: string;
  }
) {
  const status = options?.status ?? 500;
  const code = options?.code ?? "INTERNAL";
  const userMessage = options?.userMessage ?? USER_MESSAGES[code] ?? USER_MESSAGES.INTERNAL;

  // Log full error details to Sentry (never to client)
  logError(error, {
    ...context,
    responseStatus: status,
    errorCode: code,
  });

  // Return sanitized response to client
  return NextResponse.json(
    {
      ok: false,
      error: userMessage,
      code,
      // Include requestId for support reference (safe to expose)
      requestId: context.requestId ?? undefined,
    },
    { status }
  );
}

/**
 * Pre-built safe error responses
 */
export const SafeErrors = {
  unauthorized: (context: ErrorContext, message?: string) =>
    safeError(new Error("Unauthorized"), context, {
      status: 401,
      code: "UNAUTHORIZED",
      userMessage: message,
    }),

  forbidden: (context: ErrorContext, message?: string) =>
    safeError(new Error("Forbidden"), context, {
      status: 403,
      code: "FORBIDDEN",
      userMessage: message,
    }),

  notFound: (context: ErrorContext, message?: string) =>
    safeError(new Error("Not Found"), context, {
      status: 404,
      code: "NOT_FOUND",
      userMessage: message,
    }),

  validation: (context: ErrorContext, message?: string) =>
    safeError(new Error("Validation Error"), context, {
      status: 400,
      code: "VALIDATION",
      userMessage: message,
    }),

  rateLimited: (context: ErrorContext, message?: string) =>
    safeError(new Error("Rate Limited"), context, {
      status: 429,
      code: "RATE_LIMITED",
      userMessage: message,
    }),

  internal: (error: Error | unknown, context: ErrorContext) =>
    safeError(error, context, {
      status: 500,
      code: "INTERNAL",
    }),
};

/**
 * Wrap an API handler with safe error handling
 * Catches all errors and returns sanitized responses
 */
export function withSafeErrors<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  defaultContext: Partial<ErrorContext>
): T {
  return (async (...args: Parameters<T>) => {
    const req = args[0] as Request;
    const requestId = req.headers.get("x-request-id") ?? undefined;
    const context: ErrorContext = {
      route: defaultContext.route ?? new URL(req.url).pathname,
      method: req.method,
      requestId,
      ...defaultContext,
    };

    try {
      return await handler(...args);
    } catch (error) {
      // Check for known error types
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("unauthorized") || msg.includes("not authenticated")) {
          return SafeErrors.unauthorized(context);
        }
        if (msg.includes("forbidden") || msg.includes("permission")) {
          return SafeErrors.forbidden(context);
        }
        if (msg.includes("not found")) {
          return SafeErrors.notFound(context);
        }
      }

      // Default to internal error
      return SafeErrors.internal(error, context);
    }
  }) as T;
}
