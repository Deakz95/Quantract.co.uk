# Sentry setup (Stage 1)

## Environment variables

Set these in your deployment environment (Render):

- `SENTRY_DSN` (required to enable Sentry)
- `SENTRY_AUTH_TOKEN` (required only if you want source maps uploaded)
- `SENTRY_ORG` / `SENTRY_PROJECT` (required only if you want source maps uploaded)

## What’s wired up

- Server + Edge initialization is performed via `app/instrumentation.ts`.
- Client initialization remains in `sentry.client.config.ts`.
- A global React render error boundary is provided via `app/global-error.tsx`.

## Notes

If `SENTRY_DSN` is not set, Sentry is disabled.
