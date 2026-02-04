# 04 — Stage B1: Documents Platform

**Status:** COMPLETED

## Intent
Documents platform: canonical Document model + internal storage provider (base).

## Scope
- CRM: `apps/crm`
- Mobile Engineer: `apps/mobile/engineer`

## Deliverables
1. Create Document model: type, mime, bytes, hash, storageProvider=internal, storageKey, createdByUserId
2. Add server helpers to write/read document bytes via existing storage layer (S3/R2/etc.)
3. Standardize certificate PDF generation to create Document row (if not already)
4. Expose document download route (auth) and a public signed-link helper (for later QR)
5. Mobile: add Document download/view helper (open PDF in native viewer) but no offline caching yet

## Non-Goals
- No BYOS (Google Drive) yet (that is B3)
- No storage caps yet (that is B2)

## API Routes
- `GET /api/documents/[documentId]`
- `POST /api/documents/[documentId]/signed-url` (internal use; returns short-lived URL)

## Data Model
- New Prisma model: `Document`

## Acceptance Criteria
- [x] At least one flow (certificate PDF) writes a Document row and downloads via API
- [x] No raw storage keys leak to clients unless signed

## Commands
```bash
# Read-only first
git status
pnpm -C apps/crm prisma validate

# Execute
pnpm -C apps/crm prisma migrate dev -n add_document_model
pnpm -C apps/crm tsc --noEmit
pnpm -C apps/crm next build
pnpm -C apps/mobile/engineer tsc --noEmit
```

## Risks
- Large file streaming in Next route handlers must be done correctly
