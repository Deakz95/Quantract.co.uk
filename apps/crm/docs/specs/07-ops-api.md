# 07 — Ops API (Production Sanity Layer)

**Status:** PROPOSED

## Intent
Ship internal ops endpoints and dashboards to monitor health, cron runs, queues, and tenant diagnostics to reduce production firefighting as usage scales.

## Scope
- Admin-only internal API routes
- System health dashboard components
- Cron monitoring
- Queue/job visibility (if applicable)
- Tenant diagnostics (impersonation/audit tie-in)

## Out of Scope
- Customer-facing features
- Full-featured incident management platform
- Replacing existing logging provider

## Discovery (Claude must run read-only first)
> Purpose: bind this phase to the *real app* by discovering the exact paths/components in your repo.

Run these commands (read-only):
- `git status`
- `git rev-parse --show-toplevel`
- `ls`
- `find . -maxdepth 3 -type d -name "apps" -o -name "packages"`
- `find . -maxdepth 4 -type f \( -name "package.json" -o -name "pnpm-workspace.yaml" -o -name "turbo.json" -o -name "nx.json" \) -print`
- `find . -maxdepth 5 -type f \( -name "schema.prisma" -o -name "*.sql" \) -print`
- `find . -maxdepth 6 -type f \( -iname "*schedule*" -o -iname "*dispatch*" -o -iname "*timesheet*" -o -iname "*expense*" -o -iname "*certificate*" -o -iname "*pdf*" -o -iname "*storage*" -o -iname "*ops*" \) -print | head -n 200`
- `find . -maxdepth 6 -type f \( -path "*app/api/*" -o -path "*pages/api/*" \) -print | head -n 200`

Then, based on findings, Claude must **replace TODO paths below** with the real ones.

## Deliverables
- [ ] `TODO: <path>` Identify existing cron endpoints and health dashboard route(s)
- [ ] Stage 1 — Health: /ops/health summarises DB connectivity, storage providers status, key deps
- [ ] `TODO: <path>` Add cron run tracking table (last-run, status, duration, error) if not present
- [ ] Stage 2 — Cron monitor: /ops/cron lists jobs + last run; UI widget on admin health page
- [ ] Stage 3 — Queue/jobs: /ops/queues lists backlog + failures + retry hooks (if queue exists)
- [ ] Stage 4 — Tenant diagnostics: /ops/tenants/:id returns usage summary, recent errors, audit highlights
- [ ] `TODO: <path>` Add strict auth guard (admin-only, internal role) and rate limiting

## Acceptance Criteria
- [ ] Admins can see system health at a glance and detect incidents early
- [ ] Cron jobs show last-run timestamps and failures with error snippets
- [ ] Queue backlogs and failures are visible (and retryable if implemented)
- [ ] Tenant diagnostics helps resolve support tickets faster
- [ ] No ops endpoints are reachable without appropriate auth

## Execution Notes (for orchestrator)
- Keep ops endpoints read-mostly; write actions (retries) must be strongly guarded.
- Do not leak sensitive tenant data in ops responses; use minimal summaries.
- Add structured logs around ops endpoints for traceability.
- If queues don’t exist yet, mark queue deliverables **N/A** and document.
