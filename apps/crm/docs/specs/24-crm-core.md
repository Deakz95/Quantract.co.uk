# 24 — CRM Core (Tablet + Desktop Install, PWA)

**Status:** PROPOSED

## Intent
Make the CRM core a fast, tablet-friendly surface for sales and operations basics: leads → quotes → jobs → invoices → payments, with on-site quoting on iPad/Android tablets.

## Scope
- CRM core web app/PWA (tablet + desktop)
- Leads/enquiries and pipeline
- Quotes + acceptance
- Jobs + variations + snagging
- Invoices + payments
- Clients + sites
- Tablet UX pass (big tap targets, offline-safe draft quoting where feasible)

## Out of Scope
- Dispatch board (Office surface)
- System admin controls
- Certificate template editor (Certs app)

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
- [ ] `TODO: <apps/crm/app/(crm)>` Tablet-first UI pass on Quote create/edit + Job view pages
- [ ] `TODO: <apps/crm/app/api/quotes/*>` Add idempotency to key create/update endpoints
- [ ] `TODO: <apps/crm>` Add PWA install + offline shell caching for CRM routes
- [ ] `TODO: <apps/crm>` Add quick actions: call client, navigate to site, share quote link

## Acceptance Criteria
- [ ] Quote creation is comfortable on iPad/Android tablet (no tiny controls, no broken layouts)
- [ ] Key workflows remain stable on desktop and tablet
- [ ] PWA install works and supports offline shell + graceful retry
- [ ] No Office/Admin-only capabilities leak into CRM core routes

## Execution Notes (for orchestrator)
- Prefer targeted UX upgrades over broad refactors.
- Any new caching must be tenant-safe; never cross-tenant cache data.
