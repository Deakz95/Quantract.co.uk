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
  SERVICE_UNAVAILABLE: "Service temporarily unavailable. Please try again later",
  LOAD_FAILED: "Failed to load data. Please refresh the page",
  ALREADY_EXISTS: "This item already exists",
};

/**
 * Check if an error is a Prisma error and return appropriate response info
 */
function getPrismaErrorInfo(error: unknown): { code: string; status: number; message: string } | null {
  if (!error || typeof error !== "object") return null;

  const errorName = (error as { name?: string }).name ?? "";
  const errorCode = (error as { code?: string }).code ?? "";

  // Handle Prisma initialization errors (database not available)
  if (errorName === "PrismaClientInitializationError") {
    return { code: "SERVICE_UNAVAILABLE", status: 503, message: USER_MESSAGES.SERVICE_UNAVAILABLE };
  }

  // Handle known Prisma request errors
  if (errorName === "PrismaClientKnownRequestError") {
    switch (errorCode) {
      case "P2002": // Unique constraint violation
        return { code: "ALREADY_EXISTS", status: 409, message: USER_MESSAGES.ALREADY_EXISTS };
      case "P2003": // Foreign key constraint violation
        return { code: "VALIDATION", status: 400, message: "Invalid reference. Please check your selection." };
      case "P2025": // Record not found
        return { code: "NOT_FOUND", status: 404, message: USER_MESSAGES.NOT_FOUND };
      case "P2021": // Table does not exist
      case "P2022": // Column does not exist
        return { code: "SERVICE_UNAVAILABLE", status: 503, message: USER_MESSAGES.SERVICE_UNAVAILABLE };
      default:
        return { code: "DATABASE", status: 500, message: USER_MESSAGES.DATABASE };
    }
  }

  return null;
}

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
      // Check for Prisma errors first
      const prismaInfo = getPrismaErrorInfo(error);
      if (prismaInfo) {
        return safeError(error, context, {
          status: prismaInfo.status,
          code: prismaInfo.code,
          userMessage: prismaInfo.message,
        });
      }

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
        // Never expose Prisma operation names
        if (msg.includes("prisma.") || msg.includes("findmany") || msg.includes("findfirst")) {
          return safeError(error, context, {
            status: 500,
            code: "DATABASE",
            userMessage: USER_MESSAGES.DATABASE,
          });
        }
      }

      // Default to internal error
      return SafeErrors.internal(error, context);
    }
  }) as T;
}

/**
 * Helper to add Prisma error handling to existing try/catch blocks
 * Returns a user-friendly error response or null if not a Prisma error
 */
export function handlePrismaError(error: unknown, context: ErrorContext): Response | null {
  const prismaInfo = getPrismaErrorInfo(error);
  if (prismaInfo) {
    return safeError(error, context, {
      status: prismaInfo.status,
      code: prismaInfo.code,
      userMessage: prismaInfo.message,
    });
  }
  return null;
}
