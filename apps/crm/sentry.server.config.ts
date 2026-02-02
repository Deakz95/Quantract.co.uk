import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "",

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Environment detection — use Render service name to distinguish staging vs production
  environment:
    process.env.RENDER_SERVICE_NAME?.includes("staging")
      ? "staging"
      : process.env.NODE_ENV === "production"
        ? "production"
        : "development",
  enabled: Boolean(process.env.SENTRY_DSN),

  // Release tracking (for source maps)
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.RENDER_GIT_COMMIT || undefined,

  // Data scrubbing for privacy
  beforeSend(event, hint) {
    // Scrub sensitive data from event
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
        delete event.request.headers["x-api-key"];
      }

      // Scrub query params that might contain tokens/secrets
      if (event.request.query_string) {
        const queryString = typeof event.request.query_string === 'string'
          ? event.request.query_string
          : String(event.request.query_string);
        const scrubbed = queryString
          .replace(/token=[^&]+/g, "token=[REDACTED]")
          .replace(/key=[^&]+/g, "key=[REDACTED]")
          .replace(/secret=[^&]+/g, "secret=[REDACTED]");
        event.request.query_string = scrubbed;
      }
    }

    // Scrub sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((crumb) => {
        if (crumb.data) {
          const data = { ...crumb.data };
          // Remove sensitive fields
          delete data.password;
          delete data.passwordHash;
          delete data.token;
          delete data.secret;
          delete data.apiKey;
          delete data.mfaSecret;
          return { ...crumb, data };
        }
        return crumb;
      });
    }

    return event;
  },

  // Ignore common/expected errors
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ],

  // Configure integrations (using newer Sentry SDK API)
  integrations: [
    // Http and Prisma integrations are auto-included in latest @sentry/nextjs
    // Removed deprecated Sentry.Integrations.Http and Sentry.Integrations.Prisma
  ],
});
