# 23 — Admin App (Desktop Install, PWA)

**Status:** PROPOSED

## Intent
Deliver a hardened Admin surface for system governance: roles, entitlements, impersonation, audit, health, storage usage, and ops visibility.

## Scope
- Admin PWA (desktop install only)
- User/role management + permission matrix
- Entitlement overrides + plan gates verification
- Impersonation (audit logged)
- Audit log views (human readable)
- System health + ops dashboards
- Storage usage + quotas visibility

## Out of Scope
- Office daily operations (dispatch/approvals)
- Field workflows (Engineer)
- Client portal experiences

## Discovery (Claude must run read-only first)
> Purpose: bind this phase to the *real app* by discovering the exact paths/components in your repo.

Run these commands (read-only):
- `git status`
- `git rev-parse --show-toplevel`
- `ls`
- `find . -maxdepth 3 -type d -name "apps" -o -name "packages"`
- `find . -maxdepth 4 -type f \( -name "package.json" -o -name "pnpm-workspace.yaml" -o -name "turbo.json" -o -name "nx.json" \) -print`
- `find . -maxdepth 5 -type f \( -name "schema.prisma" -o -name "*.sql" \) -print`
- `find . -maxdepth 6 -type f \( -iname "*engineer*" -o -iname "*client*" -o -iname "*office*" -o -iname "*admin*" -o -iname "*cert*" -o -iname "*tool*" -o -iname "*schedule*" \) -print | head -n 200`
- `find . -maxdepth 6 -type f \( -path "*app/api/*" -o -path "*pages/api/*" \) -print | head -n 200`

Then, based on findings, Claude must **replace TODO paths below** with the real ones.


## Deliverables
- [ ] `TODO: <apps/crm/app/admin>` Confirm admin route group has strict role gating + audit events
- [ ] `TODO: <apps/crm/app/admin/roles>` Role editor + permission matrix UI
- [ ] `TODO: <apps/crm/app/admin/entitlements>` EntitlementOverride UI + safe defaults
- [ ] `TODO: <apps/crm/app/api/admin/impersonate>` Ensure impersonation is logged and revocable
- [ ] `TODO: <apps/crm/app/admin/audit>` Human-readable audit log formatting (no raw UUIDs)
- [ ] `TODO: <apps/crm/app/admin/ops>` System health dashboards backed by ops APIs

## Acceptance Criteria
- [ ] Admin actions produce audit events with who/what/when
- [ ] Impersonation is traceable and time-bounded
- [ ] No non-admin role can access any /admin route or endpoint
- [ ] Health dashboard shows clear failure signals (db, storage, queues, cron)

## Execution Notes (for orchestrator)
- Treat Admin as a separate surface: avoid reusing Office components that expose risky actions.
- All admin endpoints must be protected server-side; client-side guards are insufficient.
- Add rate limiting to any public-ish admin tools (e.g., QR generation) if exposed.
