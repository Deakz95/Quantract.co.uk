```review
Stage: phase-1-blockers (01-05)

Intent: Fix plan gating + domain state logic. Create single source of truth for entitlements. Enterprise never blocked.

Files created:
- src/lib/entitlements.ts — unified entitlements source of truth
- src/lib/server/requireEntitlement.ts — server-side entitlement guard
- src/components/EntitlementGate.tsx — client-side gate component + provider
- app/api/entitlements/me/route.ts — canonical entitlements endpoint

Files modified:
- app/admin/settings/subdomain/page.tsx — now uses entitlements, not `plan === 'Pro'`

API routes:
- GET /api/entitlements/me — returns full entitlements object for any authenticated user

Migrations:
- none

Verification:
- tsc (CRM): PASS

Key changes:
1. **Single source of truth**: `computeEntitlements()` in `src/lib/entitlements.ts` — all plan logic flows through here
2. **Enterprise override**: `isEnterprise(plan)` short-circuits ALL entitlement checks to true
3. **Entitlement keys**: UI/API reference keys like `feature_custom_domain`, never plan strings
4. **Server guard**: `requireEntitlement(key)` throws 403 EntitlementError if not met
5. **Client guard**: `<EntitlementGate entitlement="...">` + `useHasEntitlement(key)` hook
6. **Subdomain page fixed**: Uses `hasEntitlement(entitlements, 'feature_subdomain')` and `hasEntitlement(entitlements, 'feature_custom_domain')`

Enterprise rules:
- If `plan === "enterprise"` → all entitlements return true
- If email in `ADMIN_BYPASS_EMAILS` env var → treated as enterprise
- No Enterprise company can be blocked from subdomain, custom domain, or any feature

Risks:
- Old direct plan checks still exist elsewhere (settings page badges, AppShell, buildCrmContext) — need incremental migration
- featureFlags.ts still exists (old system) — recommend deprecating and migrating callers to new entitlements.ts

Not done (out of scope for 01-05):
- No Stripe, no billing tables, no pricing logic
- Other direct `plan ===` checks not yet migrated (incremental)
- Mobile app not yet wired to /api/entitlements/me
```
