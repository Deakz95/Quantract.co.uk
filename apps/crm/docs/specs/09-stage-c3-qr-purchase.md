# 09 — Stage C3: QR Code Purchase Flow

**Status:** PENDING

## Intent
QR code purchase flow (Stripe) + printable generation.

## Scope
- CRM: `apps/crm`
- Mobile Engineer: null

## Deliverables
1. Stripe product 'QR Packs' + checkout flow
2. Upon successful payment: generate N QrTags and show download/print sheet
3. CRM page 'Buy QR Codes' with order history

## Non-Goals
- No physical fulfilment integration yet

## API Routes
- `POST /api/qr/checkout`
- `POST /api/webhooks/stripe` (extend)

## Data Model
- New Prisma model: `QrOrder` (companyId, qty, stripePaymentIntentId, status)

## Acceptance Criteria
- [ ] Payment -> codes generated -> printable sheet available

## Commands
```bash
# Read-only first
git status

# Execute
pnpm -C apps/crm prisma migrate dev -n add_qr_orders
pnpm -C apps/crm next build
```

## Risks
- Webhook idempotency for fulfillment; avoid double-generation
