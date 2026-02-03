# 13 — Stage F1: Vehicle/Ladder/Scaffold Checks

**Status:** PENDING

## Intent
Checks (van/ladder/scaffold): templates + entries + PDF output stored as Document.

## Scope
- CRM: `apps/crm`
- Mobile Engineer: `apps/mobile/engineer`

## Deliverables
1. Add Asset model (van, ladder, scaffold) with identifiers
2. Add CheckTemplate + CheckEntry models
3. Engineer app: complete daily/weekly/monthly checks (offline-first)
4. Generate PDF summary per check entry; store as Document; view/download in CRM

## Non-Goals
- No advanced inspection workflows yet

## API Routes
- CRUD `/api/admin/check-templates`
- `POST/GET /api/engineer/checks`

## Data Model
- New Prisma models: `Asset`, `CheckTemplate`, `CheckEntry`

## Acceptance Criteria
- [ ] Checks can be completed and produce a PDF stored/retrievable

## Commands
```bash
# Read-only first
git status

# Execute
pnpm -C apps/crm prisma migrate dev -n add_checks
pnpm -C apps/mobile/engineer tsc --noEmit
```

## Risks
- Offline conflict handling; keep entries append-only
