# 01 — Phase 1 Blockers

**Status:** COMPLETE

## Intent
Fix plan gating + domain state logic so Enterprise is never blocked, subdomain + custom domain can't deadlock, and one source of truth exists for entitlements.

## Scope
- Plan/entitlement source-of-truth
- Subdomain and custom domain rules
- Enterprise override rules

## Out of Scope
- Stripe, billing, pricing
- New features (receipts/checks/etc)
- UI polish beyond correctness

## Deliverables
- [x] `src/lib/entitlements.ts` — unified entitlements source of truth
- [x] `src/lib/server/requireEntitlement.ts` — server guard
- [x] `src/components/EntitlementGate.tsx` — client gate component
- [x] `GET /api/entitlements/me` — canonical endpoint
- [x] Subdomain page uses entitlements, not `plan === 'Pro'`

## Acceptance Criteria
- [x] No Enterprise company is blocked from subdomain, custom domain, or gated features
- [x] Plan gating logic has exactly one canonical implementation
- [x] `GET /api/entitlements/me` returns entitlements object
- [x] tsc passes
