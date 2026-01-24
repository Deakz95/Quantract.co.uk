import * as Sentry from "@sentry/nextjs";
import { getCompanyId } from "@/lib/serverAuth";

/**
 * Structured logging with Sentry integration
 * All logs include requestId, userId, orgId for traceability
 */

export type RequestLogEntry = {
  route: string;
  method?: string;
  status: number;
  durationMs: number;
  companyId?: string | null;
  userId?: string | null;
  requestId?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export type BusinessEvent = {
  name: "invoice.sent" | "invoice.paid" | "webhook.failure" | "mfa.enabled" | "mfa.disabled" | "notification.sent";
  companyId?: string | null;
  userId?: string | null;
  invoiceId?: string | null;
  metadata?: Record<string, unknown>;
};

export type CriticalActionEvent = {
  name:
    | "quote.sent"
    | "invoice.sent"
    | "timesheet.approved"
    | "schedule.entry.created"
    | "user.invited"
    | "user.deleted"
    | "impersonation.started"
    | "impersonation.ended";
  companyId?: string | null;
  userId?: string | null;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
};

export type SecurityEvent = {
  name:
    | "auth.login.success"
    | "auth.login.failure"
    | "auth.logout"
    | "auth.magic_link.sent"
    | "auth.magic_link.verified"
    | "auth.rate_limit.exceeded"
    | "auth.mfa.challenge_created"
    | "auth.mfa.verification_success"
    | "auth.mfa.verification_failure";
  userId?: string | null;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Structured logging helper - outputs JSON for log aggregation
 */
function structuredLog(level: "info" | "warn" | "error", category: string, data: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    category,
    ...data,
  };

  // Output as JSON for log aggregation tools (CloudWatch, Datadog, etc.)
  const message = JSON.stringify(logEntry);

  if (level === "error") {
    console.error(message);
  } else if (level === "warn") {
    console.warn(message);
  } else {
    console.info(message);
  }

  return logEntry;
}

export function logRequest(entry: RequestLogEntry) {
  const payload = {
    ...entry,
    companyId: entry.companyId || undefined,
    userId: entry.userId || undefined,
    requestId: entry.requestId || undefined,
  };

  structuredLog("info", "request", payload);

  // Send slow requests to Sentry for performance monitoring
  if (entry.durationMs > 5000) {
    Sentry.captureMessage(`Slow request: ${entry.route}`, {
      level: "warning",
      extra: payload,
    });
  }
}

export function logBusinessEvent(event: BusinessEvent) {
  const payload = {
    ...event,
    companyId: event.companyId || undefined,
    userId: event.userId || undefined,
    invoiceId: event.invoiceId || undefined,
  };

  structuredLog("info", "business_event", payload);

  if (event.name === "webhook.failure") {
    Sentry.captureMessage("Webhook failure", {
      level: "warning",
      extra: payload,
    });
  }
}

export function logCriticalAction(event: CriticalActionEvent) {
  const payload = {
    ...event,
    companyId: event.companyId || undefined,
    userId: event.userId || undefined,
    actorId: event.actorId || undefined,
  };

  structuredLog("info", "critical_action", payload);

  // All critical actions go to Sentry for audit trail
  Sentry.captureMessage(`critical_action:${event.name}`, {
    level: "info",
    extra: payload,
  });
}

/**
 * Security event logging for auth, rate limiting, MFA
 */
export function logSecurityEvent(event: SecurityEvent) {
  const payload = {
    ...event,
    userId: event.userId || undefined,
    email: event.email || undefined,
    ipAddress: event.ipAddress || undefined,
    userAgent: event.userAgent || undefined,
  };

  // Determine log level based on event type
  const level =
    event.name.includes("failure") || event.name.includes("exceeded") ? ("warn" as const) : ("info" as const);

  structuredLog(level, "security", payload);

  // Send auth failures and rate limits to Sentry
  if (event.name.includes("failure") || event.name.includes("exceeded")) {
    Sentry.captureMessage(`security:${event.name}`, {
      level: "warning",
      extra: payload,
    });
  }
}

/**
 * Error logging with Sentry integration
 */
export function logError(error: Error | unknown, context?: Record<string, unknown>) {
  const errorData = {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  };

  structuredLog("error", "application_error", errorData);

  // Send to Sentry
  if (error instanceof Error) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    Sentry.captureMessage(String(error), {
      level: "error",
      extra: context,
    });
  }
}

export function withRequestLogging<T extends (...args: any[]) => any>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    const req = args[0] as Request;
    const start = Date.now();
    let status = 500;

    try {
      const response = await handler(...args);
      status = response.status;
      return response;
    } catch (error: unknown) {
      if (typeof (error as { status?: number })?.status === "number") {
        status = (error as { status: number }).status;
      }
      throw error;
    } finally {
      const durationMs = Date.now() - start;
      const route = new URL(req.url).pathname;
      let companyId: string | null = null;
      try {
        companyId = await getCompanyId();
      } catch {
        companyId = null;
      }
      logRequest({ route, status, durationMs, companyId });
    }
  }) as T;
}
