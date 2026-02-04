# 03 — UI Upgrades

**Status:** PROPOSED

## Intent
Make the UI faster to read and harder to misuse; reduce cognitive load.

## Scope
- CRM UI
- Mobile UI parity where relevant
- Certificates UI

## Out of Scope
- Full redesign
- New component library migration

## Discovery (Claude must run read-only first)
> Purpose: bind this phase to the *real app* by discovering the exact paths/components in your repo.

Run these commands (read-only):
- `git status`
- `git rev-parse --show-toplevel`
- `ls`
- `find . -maxdepth 3 -type d -name "apps" -o -name "packages"`
- `find . -maxdepth 4 -type f \( -name "package.json" -o -name "pnpm-workspace.yaml" -o -name "turbo.json" -o -name "nx.json" \) -print`
- `find . -maxdepth 5 -type f \( -name "schema.prisma" -o -name "*.sql" \) -print`
- `find . -maxdepth 6 -type f \( -iname "*entitle*" -o -iname "*plan*" -o -iname "*feature*flag*" -o -iname "*domain*" \) -print`
- `find . -maxdepth 6 -type f \( -path "*app/api/*" -o -path "*pages/api/*" \) -print | head -n 200`

Then, based on findings, Claude must **replace TODO paths below** with the real ones.

## Deliverables
- [ ] `TODO: <path>` Standardize empty states (no blank pages)
- [ ] `TODO: <path>` Standardize table/list row actions (consistent kebab menus)
- [ ] `TODO: <path>` Badge system for status (quote/job/invoice/cert) with single source
- [ ] `TODO: <path>` Fix raw UUID exposure in any list views

## Acceptance Criteria
- [ ] Empty states exist for core modules (clients, quotes, jobs, invoices, certs)
- [ ] Row actions are consistent across modules
- [ ] Statuses render consistently and accessibly

## Execution Notes (for orchestrator)
- Claude should not create new folders for these docs.
- If a deliverable is not applicable after discovery, mark it as **N/A** and explain why.
- Prefer thin wrappers and minimal diffs where possible.
