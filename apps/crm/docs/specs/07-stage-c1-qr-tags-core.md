# 07 — Stage C1: QR Tag Core Models

**Status:** PENDING

## Intent
QR Tag core models + admin generation (no ecommerce yet).

## Scope
- CRM: `apps/crm`
- Mobile Engineer: `apps/mobile/engineer`

## Deliverables
1. Add QrTag model: companyId, code (unguessable), label, status, createdAt
2. Add QrAssignment: qrTagId, certificateId, documentId, assignedByUserId, assignedAt
3. CRM admin page: generate N codes + print sheet (PDF or HTML print view)
4. Mobile: add QR scan screen (using expo-barcode-scanner) that resolves code and shows assign flow

## Non-Goals
- No public resolver yet (that is C2)
- No purchase/Stripe yet (that is C3)

## API Routes
- `POST /api/admin/qr-tags/generate`
- `GET /api/admin/qr-tags`
- `POST /api/engineer/qr-tags/assign`

## Data Model
- New Prisma models: `QrTag`, `QrAssignment`

## Acceptance Criteria
- [ ] Admin can generate tags; engineer can scan and assign certificate->tag

## Commands
```bash
# Read-only first
git status

# Execute
pnpm -C apps/crm prisma migrate dev -n add_qr_tags
pnpm -C apps/mobile/engineer tsc --noEmit
```

## Risks
- Code must be unguessable; rate limit assignment endpoint
