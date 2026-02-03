# 06 — Stage B3: BYOS Storage Provider

**Status:** PENDING

## Intent
BYOS storage provider support (Google Drive/S3-style external links) for Pro+/Enterprise.

## Scope
- CRM: `apps/crm`
- Mobile Engineer: `apps/mobile/engineer`

## Deliverables
1. Add DocumentStorageProvider config per Company (internal|external_url|s3|gdrive later)
2. Implement simplest BYOS first: external URL storage (company provides base folder URL + rules)
3. Document rows can reference externalUrl instead of storageKey
4. CRM: Settings page to configure BYOS provider (gated by entitlement)
5. Mobile: open externalUrl in native browser if provided

## Non-Goals
- Full Google Drive OAuth integration (later add-on)

## API Routes
- `GET/POST /api/admin/storage/settings`

## Data Model
- New Prisma model: `CompanyStorageSettings`

## Acceptance Criteria
- [ ] Pro+/Enterprise can set externalUrl provider and new documents can store as external references

## Commands
```bash
# Read-only first
git status

# Execute
pnpm -C apps/crm prisma migrate dev -n add_storage_settings
pnpm -C apps/crm tsc --noEmit
pnpm -C apps/mobile/engineer tsc --noEmit
```

## Risks
- External URL correctness is on customer; must message clearly
