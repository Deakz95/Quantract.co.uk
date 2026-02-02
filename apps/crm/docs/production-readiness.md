# Production Readiness Checklist

Every deploy to production must satisfy the following gates.

## Pre-Deploy Checklist

- [ ] **CI green** — lint, typecheck, unit tests, build all pass
- [ ] **Staging smoke passes** — `staging-smoke` job in CI is green (master only)
- [ ] **Migration plan** — any Prisma migration is reviewed, idempotent where possible
- [ ] **Rollback plan** — know how to revert: `prisma migrate deploy` for forward-fix, or Neon branch restore for data
- [ ] **Sentry release tagged** — `RENDER_GIT_COMMIT` is set (automatic on Render)
- [ ] **No PII in logs** — verify new log calls use IDs only, not emails/tokens/addresses

## Definition of Done (Backend Changes)

- [ ] Route handler uses `requireCompanyContext()` or equivalent auth guard
- [ ] All DB queries scoped by `companyId`
- [ ] Prisma migration included if schema changed
- [ ] Smoke test updated if new endpoint or changed behaviour
- [ ] `logError` / `log.*` used for error paths (not bare `console.error`)
- [ ] No secrets in code (use env vars)

## Post-Deploy Verification

- [ ] `/api/health` returns `{ status: "healthy" }` with correct `version`
- [ ] Sentry shows new release in correct environment
- [ ] Spot-check key flows in production (login, create quote, etc.)
