# 15 — Stage G4.5: Certificates Offline-First

**Status:** PENDING

## Intent
Engineer app: Certificates offline-first (SQLite drafts + safe sync) + PDF storage.

## Scope
- CRM: `apps/crm`
- Mobile Engineer: `apps/mobile/engineer`

## Deliverables
1. Mobile: SQLite store for certificate drafts (per certificateId) with autosave
2. Sync engine: background flush when online; retry; conflict strategy (server version check)
3. Mark complete only when server confirms save + PDF document created
4. Offline: fill cert, kill app, reopen -> draft persists

## Non-Goals
- No advanced merge conflicts; use last-write-wins with warning

## API Routes
- `GET /api/engineer/certificates/[certificateId]`
- `PATCH/POST` save draft endpoint (if not present)
- `POST /api/engineer/certificates/[certificateId]/complete`

## Data Model
- Maybe add certificate updatedAt/version field if not already present

## Acceptance Criteria
- [ ] Airplane mode: fill cert -> survives restart -> sync later -> no data loss

## Commands
```bash
# Read-only first
git status

# Execute
pnpm -C apps/mobile/engineer tsc --noEmit
pnpm -C apps/mobile/engineer expo export --platform ios --dev false || true
```

## Risks
- Certificate schema changes; keep draft mapping stable
