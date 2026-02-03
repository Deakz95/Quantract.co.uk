# 02 — Stage A2: Stripe Billing Wiring

**Status:** PENDING

## Intent
Stripe billing wiring for plans + add-ons (company subscription state).

## Scope
- CRM: `apps/crm`
- Mobile Engineer: `apps/mobile/engineer`

## Deliverables
1. Define plan catalog (FREE/PRO/PRO_PLUS/ENTERPRISE) + add-ons (storage, extra engineers, QR packs, AI maintenance) in one server config
2. Create billing tables: `CompanyBilling` with stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd
3. Stripe webhook handler to sync subscription status into CompanyBilling
4. Billing settings page in CRM: view current plan, manage subscription, manage payment method
5. Update entitlements computation to depend on CompanyBilling plan + add-ons

## Non-Goals
- No QR purchases yet (that is C3)
- No PDF template editor yet

## API Routes
- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `POST /api/webhooks/stripe`
- `GET /api/billing/me`

## Data Model
- New Prisma model: `CompanyBilling` (1:1 Company)

## Acceptance Criteria
- [ ] Company can start a subscription and billing status updates via webhook
- [ ] Entitlements reflect plan tier automatically
- [ ] Web + mobile show locked features when plan insufficient

## Commands
```bash
# Read-only first
git status
pnpm -C apps/crm prisma validate

# Execute
pnpm -C apps/crm prisma migrate dev -n add_company_billing
pnpm -C apps/crm tsc --noEmit
pnpm -C apps/crm next build
pnpm -C apps/mobile/engineer tsc --noEmit
```

## Risks
- Webhook security + idempotency must be correct
- Handling upgrade/downgrade proration and canceled states cleanly
