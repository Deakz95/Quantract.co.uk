# 20 — Engineer App (Mobile + Tablet, Expo)

**Status:** PROPOSED

## Intent
Ship a field-first Engineer app that is offline-safe, dispatch-driven, and optimized for fast capture (photos, cert drafts, checks, expenses) without exposing back-office risk.

## Scope
- Engineer mobile app (Expo) — phone + iPad/Android tablet
- Offline-first caches + outbox
- Schedule integration (dispatch board output → engineer day view)
- Job pack (docs, notes, contacts, site info)
- Certificates draft/issue flow (offline drafts + conflict resolution)
- Checks (asset + scheduled)
- Receipts/expenses capture
- QR scan flows (assign + resolve)

## Out of Scope
- Invoicing, quote creation, pricing administration
- Admin/office-only controls (entitlements, impersonation, ops)
- Complex BI/reporting dashboards

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
- [ ] `TODO: <apps/mobile/engineer>` Ensure full source is committed (no dist/node_modules) and build runs from repo
- [ ] `TODO: <apps/mobile/engineer>` Add Schedule: Today/Tomorrow list + job pack screen (offline capable)
- [ ] `TODO: <apps/mobile/engineer>` Add status workflow: OnRoute → Arrived → Started → Completed with timeline events
- [ ] `TODO: <apps/mobile/engineer>` Add offline outbox idempotency keys for writes (receipts, cost items, checks, cert drafts)
- [ ] `TODO: <apps/mobile/engineer>` Add QR scanner flows: scan → detect type → assign/view
- [ ] `TODO: <apps/mobile/engineer>` Add media capture hardening (camera permissions, retries, background upload)
- [ ] `TODO: <apps/crm/app/api/engineer/*>` Ensure APIs are rate-limited + auth-checked for mobile

## Acceptance Criteria
- [ ] Engineer can complete a full job (status updates, notes, photos) with no signal and sync later
- [ ] Schedule loads in <2s on warm cache and works offline
- [ ] All mobile writes are idempotent and safe to retry
- [ ] QR scan-to-assign works end-to-end for asset/cert tags
- [ ] No office/admin features leak into Engineer app UI

## Execution Notes (for orchestrator)
- Claude should not introduce new app folders; work inside existing engineer mobile app.
- Prefer additive changes: new screens + small shared hooks rather than refactors.
- Any API changes must include migration notes and backward compatibility for existing clients.
