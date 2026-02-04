# 02 — Platform Recommendations

**Status:** PROPOSED

## Intent
Reduce operational risk, improve reliability, and make future feature delivery cheaper.

## Scope
- Cross-app architecture
- DX + observability
- Security + compliance basics

## Out of Scope
- Large refactors
- Changing auth provider
- Rebuilding UI system

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
- [ ] `TODO: <path>` Add standard error boundary + route-level fallback pages where missing
- [ ] `TODO: <path>` Add audit log human-readable formatting (avoid raw UUID exposure in UI)
- [ ] `TODO: <path>` Add Sentry breadcrumbs for critical flows (quote->job->invoice, cert issue)
- [ ] `TODO: <path>` Add rate limiting / abuse protection on public-facing endpoints

## Acceptance Criteria
- [ ] Major user-facing crashes have friendly fallback + logging
- [ ] Audit trails show human labels (where possible)
- [ ] Key business flows emit traceable logs/events
- [ ] No obvious unauthenticated write endpoints remain

## Execution Notes (for orchestrator)
- Claude should not create new folders for these docs.
- If a deliverable is not applicable after discovery, mark it as **N/A** and explain why.
- Prefer thin wrappers and minimal diffs where possible.
