# 07 — Admin Console

**Status:** IMPLEMENTED

## Intent
Superuser tools to support customers safely: entitlement overrides, audit, support tooling.

## Scope
- Admin-only routes
- Support tooling
- Safety rails

## Out of Scope
- Broad RBAC redesign

## Deliverables

- [x] Admin entitlement override (with audit log)
  - `apps/crm/prisma/schema.prisma` — `EntitlementOverride` model
  - `apps/crm/prisma/migrations/20260204500000_add_entitlement_override/migration.sql`
  - `apps/crm/app/api/admin/entitlements/overrides/route.ts` — GET (list) + POST (create)
  - `apps/crm/app/api/admin/entitlements/overrides/[overrideId]/route.ts` — DELETE (soft-revoke)
  - `apps/crm/src/lib/entitlements.ts` — `adminOverrides` param in `computeEntitlements()`
  - `apps/crm/app/api/entitlements/me/route.ts` — Fetches active overrides and passes to computation
  - `apps/crm/src/components/admin/settings/EntitlementsSettings.tsx` — Override management UI

- [x] Support 'impersonate' read-only mode
  - `apps/crm/app/api/admin/impersonate/start/route.ts` — POST: starts DB-backed impersonation
  - `apps/crm/app/api/admin/impersonate/stop/route.ts` — POST: ends impersonation, clears state
  - `apps/crm/app/api/admin/impersonate/status/route.ts` — GET: existing status endpoint
  - `apps/crm/src/lib/serverAuth.ts` — `isImpersonating()` + `rejectIfImpersonating()` guards
  - Existing UI: `ImpersonationBanner.tsx`, `useImpersonation.ts` hook, `ImpersonateUserButton.tsx`

- [x] Admin dashboard health widgets (errors, failed jobs, cron status)
  - `apps/crm/app/api/admin/system/health/route.ts` — GET: error counts, webhook health, cron signals
  - `apps/crm/src/components/admin/dashboard/SystemHealthWidget.tsx` — Health widget component
  - `apps/crm/app/admin/dashboard/page.tsx` — `systemHealth` widget type added to grid

## Acceptance Criteria

- [x] Overrides are tracked with who/when/why
  - Each override records `grantedBy` (userId), `grantedAt`, `reason` (required).
  - AuditEvent records created/revoked actions with full metadata.
  - `logCriticalAction()` called for `entitlement.override.created` and `entitlement.override.revoked`.

- [x] Impersonation (if added) is visibly watermarked + logged
  - Existing `ImpersonationBanner` provides amber gradient banner with pulsing animation.
  - Start/stop routes log `impersonation.started`/`impersonation.ended` via `logCriticalAction()`.
  - DB-backed impersonation_logs table records admin, target, reason, IP, user-agent, timestamps.
  - `rejectIfImpersonating()` guard rejects write operations during impersonation.

- [x] Admin health shows actionable signals
  - Error count in last 24h with green/amber/red status.
  - Stripe webhook health with last-received timestamp.
  - Cron proxy signals (stock alert reconcile, storage reconcile).
  - Active impersonation count.
  - Link to existing failed-jobs page for drill-down.
