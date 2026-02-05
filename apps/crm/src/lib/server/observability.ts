import * as Sentry from "@sentry/nextjs";
import { getCompanyId, getAuthContext } from "@/lib/serverAuth";
import { requestContext } from "./requestContext";

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
  name:
    | "invoice.sent"
    | "invoice.paid"
    | "webhook.failure"
    | "mfa.enabled"
    | "mfa.disabled"
    | "notification.sent"
    | "subscription.created"
    | "subscription.updated"
    | "subscription.deleted"
    | "subscription.invoice_paid"
    | "subscription.payment_failed"
    | "qr_tags.purchased";
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
    | "schedule.entry.updated"
    | "schedule.entry.soft_deleted"
    | "user.invited"
    | "user.deleted"
    | "user.role.changed"
    | "impersonation.started"
    | "impersonation.ended"
    | "entitlement.override.created"
    | "entitlement.override.revoked"
    | "dispatch.copy_week"
    | "dispatch.recurring.created"
    | "dispatch.recurring.updated"
    | "dispatch.recurring.deleted"
    | "dispatch.status.updated"
    | "ops.health_check"
    | "ops.queue_query"
    | "ops.job_retry"
    | "ops.cron_status_query"
    | "ops.tenant_diagnostics";
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
 * Add a Sentry breadcrumb for a business-critical flow step.
 *
 * Breadcrumbs are lightweight trail markers that appear in Sentry error/issue
 * views, making it easy to see what happened before a crash.
 */
export function addBusinessBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  level: "info" | "warning" | "error" = "info",
) {
  Sentry.addBreadcrumb({
    category: "business",
    message,
    level,
    data,
  });
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
    const requestId = req.headers.get("x-request-id") ?? undefined;
    const route = new URL(req.url).pathname;
    const start = Date.now();
    let status = 500;

    // Resolve auth context once (best-effort, never throws)
    let companyId: string | null = null;
    let userId: string | null = null;
    try {
      const ctx = await getAuthContext();
      companyId = ctx?.companyId ?? null;
      userId = ctx?.userId ?? null;
    } catch {
      // auth resolution failed — continue without context
    }

    // Run handler inside AsyncLocalStorage + Sentry scope
    return requestContext.run(
      { requestId: requestId ?? "", companyId: companyId ?? undefined, userId: userId ?? undefined, route },
      async () => {
        return Sentry.withScope(async (scope) => {
          if (requestId) scope.setTag("requestId", requestId);
          if (companyId) scope.setTag("companyId", companyId);
          if (userId) scope.setTag("userId", userId);
          scope.setTag("route", route);

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
            logRequest({ route, status, durationMs, companyId, userId, requestId });
          }
        });
      },
    );
  }) as T;
}
