# 14 — Stage G4.4: Engineer App Cost Items

**Status:** PENDING

## Intent
Engineer app: Cost items (write) + offline outbox + list.

## Scope
- CRM: `apps/crm`
- Mobile Engineer: `apps/mobile/engineer`

## Deliverables
1. Job detail shows cost items list via `GET /api/engineer/jobs/[jobId]/cost-items`
2. Add cost form + offline enqueue + sync
3. Idempotency key header for cost create to prevent duplicates

## Non-Goals
- No receipts attachment yet

## API Routes
- Existing `/api/engineer/jobs/[jobId]/cost-items` (GET/POST)

## Data Model
- No migrations expected (reuse existing CostItem model)

## Acceptance Criteria
- [ ] Engineer can add cost offline; sync later; no duplicates

## Commands
```bash
# Read-only first
git status

# Execute
pnpm -C apps/mobile/engineer tsc --noEmit
```

## Risks
- Idempotency must be enforced server-side if retries happen
