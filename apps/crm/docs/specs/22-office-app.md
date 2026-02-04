# 22 — Office App (Desktop Install, PWA)

**Status:** PROPOSED

## Intent
Create an Office control-room surface for dispatch, approvals, compliance, and finance hygiene so office staff can run the company without needing Admin powers.

## Scope
- Office PWA (desktop install only)
- Dispatch board embedding + unassigned queue
- Approvals inbox (timesheets, expenses)
- Payroll export
- Supplier invoices/purchases (where implemented)
- Compliance dashboard (checks, cert expiry, equipment)
- Profit leakage alerts / exceptions feed

## Out of Scope
- System-level controls (feature flags, impersonation, entitlement overrides)
- Developer ops endpoints management
- Field execution (Engineer app responsibilities)

## Discovery (Claude must run read-only first)
> Purpose: bind this phase to the *real app* by discovering the exact paths/components in your repo.

Run these commands (read-only):
- `git status`
- `git rev-parse --show-toplevel`
- `ls`
- `find . -maxdepth 3 -type d -name "apps" -o -name "packages"`
- `find . -maxdepth 4 -type f \( -name "package.json" -o -name "pnpm-workspace.yaml" -o -name "turbo.json" -o -name "nx.json" \) -print`
- `find . -maxdepth 5 -type f \( -name "schema.prisma" -o -name "*.sql" \) -print`
- `find . -maxdepth 6 -type f \( -iname "*engineer*" -o -iname "*client*" -o -iname "*office*" -o -iname "*admin*" -o -iname "*cert*" -o -iname "*tool*" -o -iname "*schedule*" \) -print | head -n 200`
- `find . -maxdepth 6 -type f \( -path "*app/api/*" -o -path "*pages/api/*" \) -print | head -n 200`

Then, based on findings, Claude must **replace TODO paths below** with the real ones.


## Deliverables
- [ ] `TODO: <apps/crm/app/office>` Add Office nav + layout + permissions gating
- [ ] `TODO: <apps/crm/app/office/dispatch>` Embed or implement dispatch board surface
- [ ] `TODO: <apps/crm/app/office/approvals>` Build approvals inbox for timesheets + expenses (bulk actions)
- [ ] `TODO: <apps/crm/app/office/compliance>` Compliance dashboard (checks due, cert expiry, missing assets)
- [ ] `TODO: <apps/crm/app/office/exports>` Payroll + VAT-ready export surfaces
- [ ] `TODO: <apps/crm/app/api/office/*>` Office APIs for approvals + exports + dashboard widgets

## Acceptance Criteria
- [ ] Office users can complete daily workflow without visiting /admin routes
- [ ] Bulk approvals work and produce auditable events
- [ ] Exports match accountant expectations (CSV headers stable, totals correct)
- [ ] Office role cannot access Admin system controls

## Execution Notes (for orchestrator)
- Office is desktop-only: enforce responsive constraints but optimise for wide screens.
- Use existing role/permission system; add OfficeRole if needed, but keep minimal.
- Prefer widgets fed by existing APIs; avoid duplicating business logic in UI.
