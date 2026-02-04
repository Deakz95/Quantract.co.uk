# 04 — UX Upgrades

**Status:** PROPOSED

## Intent
Reduce clicks and confusion for trade workflows: quote->accept->job->invoice->pay; cert issue->QR->share.

## Scope
- End-to-end flows
- Permission-aware guidance
- Mobile/desktop parity for critical tasks

## Out of Scope
- New modules
- Billing/checkout UX

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
- [ ] `TODO: <path>` Add 'next best action' panels on job + invoice pages
- [ ] `TODO: <path>` Fix any perpetual-loading states on invalid tokens/links
- [ ] `TODO: <path>` Improve search: highlight matches + recent items
- [ ] `TODO: <path>` Add undo/soft-delete affordance consistency across entities

## Acceptance Criteria
- [ ] Critical flows can be completed without dead ends
- [ ] Invalid links fail gracefully with clear recovery paths
- [ ] Search results are visibly match-highlighted

## Execution Notes (for orchestrator)
- Claude should not create new folders for these docs.
- If a deliverable is not applicable after discovery, mark it as **N/A** and explain why.
- Prefer thin wrappers and minimal diffs where possible.
