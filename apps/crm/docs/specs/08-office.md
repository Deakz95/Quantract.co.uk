# 08 — Office

**Status:** PROPOSED

## Intent
Speed up scheduling, quoting, invoicing, and bookkeeping flows for office staff.

## Scope
- Scheduler
- Quotes/invoices
- Receipts groundwork (if exists)

## Out of Scope
- Full accounting integration redesign

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
- [ ] `TODO: <path>` Bulk actions: move jobs, assign engineer, change status
- [ ] `TODO: <path>` Invoice reminders + chasing templates (email/SMS hooks if present)
- [ ] `TODO: <path>` Basic receipt capture (if module exists) with categories

## Acceptance Criteria
- [ ] Bulk ops reduce repeated clicks
- [ ] Reminders are configurable and logged
- [ ] Receipts (if present) are searchable + exportable

## Execution Notes (for orchestrator)
- Claude should not create new folders for these docs.
- If a deliverable is not applicable after discovery, mark it as **N/A** and explain why.
- Prefer thin wrappers and minimal diffs where possible.
