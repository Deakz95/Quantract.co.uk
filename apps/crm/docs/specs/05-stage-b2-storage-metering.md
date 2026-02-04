# 05 — Stage B2: Storage Metering + Plan Caps

**Status:** DONE

## Intent
Storage metering + plan caps + enforcement (paid storage foundation).

## Scope
- CRM: `apps/crm`
- Mobile Engineer: `apps/mobile/engineer`

## Deliverables
1. Add `CompanyStorageUsage`: bytesUsed, updatedAt
2. On document create: increment bytesUsed (transactional) and enforce caps based on entitlements
3. Add background reconciliation job/cron to recompute bytesUsed from Document table
4. CRM: Storage usage page (bar + cap + upgrade CTA)
5. Mobile: show 'storage full' errors gracefully on upload flows

## Non-Goals
- No BYOS connectors yet

## API Routes
- `GET /api/storage/usage`
- `POST /api/cron/reconcile-storage` (protected)

## Data Model
- New Prisma model: `CompanyStorageUsage`

## Acceptance Criteria
- [x] Uploads blocked when cap exceeded (with friendly error)
- [x] Reconcile job corrects drift

## Commands
```bash
# Read-only first
git status

# Execute
pnpm -C apps/crm prisma migrate dev -n add_storage_usage
pnpm -C apps/crm tsc --noEmit
pnpm -C apps/crm next build
```

## Risks
- Race conditions if multiple uploads happen simultaneously; must be transactional
