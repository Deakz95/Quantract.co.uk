# 03 — Stage A3: Fix Subdomain/Custom Domain Gating

**Status:** PENDING

## Intent
Fix subdomain/custom domain gating + UI state bugs (plan-aware + state-aware).

## Scope
- CRM: `apps/crm`
- Mobile Engineer: null

## Deliverables
1. Audit domain settings UI logic: hide Free-only upsell prompts when company already qualifies
2. Ensure Enterprise internal company can create subdomains/custom domains
3. Fix 'Custom domain Pro' section not dropping after upgrade
4. Add server-side entitlement check to domain mutation routes

## Non-Goals
- No new domain features

## API Routes
- Existing domain routes only (no new routes)

## Data Model
- No migrations expected

## Acceptance Criteria
- [ ] Free company sees no confusing domain UI (only upgrade prompt)
- [ ] Pro+ company can add subdomain and/or custom domain
- [ ] Enterprise company (yours) is not blocked

## Commands
```bash
# Read-only first
git status
pnpm -C apps/crm tsc --noEmit

# Execute
pnpm -C apps/crm next build
```

## Risks
- Multiple tenant states (pending/verified) could cause edge cases
