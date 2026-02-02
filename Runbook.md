# Runbook

Runbook-Version: 3
Current-Step: stage-a1
Last-Executed-Approval-Hash: null
Mode: PLAN

---

## Step 01 — Bootstrap the runbook loop

### Status: completed

---

## Stage A1 — Entitlements / Paywall Framework

**Plan:** [run.md](run.md) § A1
**Approval:** [handoff/approval.md](handoff/approval.md)

### Status: completed

### REVIEW (LLM / Human)

```review
Implement entitlements framework:
- Entitlement model/schema (company-aware)
- GET /api/entitlements/me returning entitlements for the authenticated company
- CRM guard utility (server + client)
- Mobile guard utility
- Wire one non-critical feature behind the guard
- No Stripe wiring at this stage
```

### APPROVAL

See [handoff/approval.md](handoff/approval.md) — status: APPROVE

### OUTPUT

Stage A1 complete.

**Files created:**
- `apps/crm/app/api/entitlements/me/route.ts` — GET /api/entitlements/me (any role)
- `apps/crm/src/lib/server/requireEntitlement.ts` — server-side entitlement guard
- `apps/crm/src/components/billing/useEntitlements.ts` — client-side hook

**Files modified:**
- `apps/crm/app/engineer/schedule/page.tsx` — gated behind `feature_schedule` entitlement

**API routes added:**
- `GET /api/entitlements/me` — returns plan, features, limits, trial status for current company

**Schema changes:** None (Company.plan field already exists)

**Key discovery:** `src/lib/billing/plans.ts` (787 lines) already had full entitlements engine — `hasEntitlement()`, `getLimit()`, `isWithinLimit()`, plan definitions, module pricing. The admin route `/api/admin/entitlements` already existed but was admin-only.

**What was built:**
1. Non-admin `/api/entitlements/me` endpoint — lean payload for any authenticated user
2. `requireEntitlement(key)` — server guard returning 403 with `entitlement_required` error
3. `useEntitlements()` hook with `hasFeature(key)` helper
4. Engineer schedule page now gated behind `feature_schedule` via `FeatureGate` component

**Verification:**
- `tsc --noEmit`: PASS (no new errors; pre-existing errors in storage.ts, zod schemas, @neondatabase/auth)
- `next build`: SKIP (node_modules not installable in sandbox — workspace package @quantract/shared not on npm)
- Expo: N/A (no separate mobile app; engineer portal is Next.js at /app/engineer/)

**Risks / follow-ups:**
- `OrgEntitlements.extraUsers/extraEntities/extraStorageMB` hardcoded to 0 — needs Stripe add-on wiring in Stage A2
- `next build` not verified in sandbox — recommend running in CI
