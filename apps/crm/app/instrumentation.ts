import * as Sentry from "@sentry/nextjs";

/**
 * Next.js instrumentation hook.
 *
 * Sentry requires server/edge initialization to happen inside this register()
 * function for App Router projects.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN || "";
  const enabled = Boolean(dsn);

  // Next.js sets NEXT_RUNTIME to 'nodejs' or 'edge' when invoking this hook.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      enabled,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      enabled,
    });
  }
}
