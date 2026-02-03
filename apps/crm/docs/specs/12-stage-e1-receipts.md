# 12 — Stage E1: Receipts & Expenses

**Status:** PENDING

## Intent
Receipts: capture + categorize + store as Documents.

## Scope
- CRM: `apps/crm`
- Mobile Engineer: `apps/mobile/engineer`

## Deliverables
1. Add ExpenseReceipt model (category, amount, vat, supplier, notes, documentId, jobId optional)
2. Engineer app: receipt capture (photo) + quick form + offline outbox integration
3. CRM: receipts list + filters + export CSV

## Non-Goals
- No Xero integration yet (later)

## API Routes
- `POST/GET /api/engineer/receipts`
- `GET /api/admin/receipts/export`

## Data Model
- New Prisma model: `ExpenseReceipt`

## Acceptance Criteria
- [ ] Engineer can add receipt offline; sync later; office can export CSV
- [ ] Stored securely per company/tenant

## Commands
```bash
# Read-only first
git status

# Execute
pnpm -C apps/crm prisma migrate dev -n add_expense_receipts
pnpm -C apps/mobile/engineer tsc --noEmit
```

## Risks
- Photo size/upload reliability; add compression limits
