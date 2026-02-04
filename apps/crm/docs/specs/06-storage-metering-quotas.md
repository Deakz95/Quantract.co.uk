# 06 — Storage Metering & Quotas (BYOS + Pricing)

**Status:** PROPOSED

## Intent
Add storage metering and quotas so plans can enforce fair usage, show alerts, and prevent runaway storage costs across internal and BYOS storage.

## Scope
- Documents/files storage
- BYOS storage settings
- Plan/entitlement enforcement points
- Background reconciliation job

## Out of Scope
- Full billing/Stripe overhaul (only enforce entitlements/limits)
- Multi-region object storage replication
- Enterprise-only compliance archiving

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
- [ ] `TODO: <path>` Identify current file upload paths and where file metadata is stored
- [ ] Stage 1 — Metering: track per-file size + per-company storage totals; expose usage in admin
- [ ] `TODO: <path>` Add background job to reconcile totals from file table (source of truth)
- [ ] Stage 2 — Quotas: plan-based limits (e.g., 10GB/100GB/Unlimited) + enforcement at upload time
- [ ] `TODO: <path>` Add warnings at 80%/90% and hard block at 100% (with clear UI messaging)
- [ ] Stage 3 — Cleanup & insights: list largest files, unused/old files, and allow admin cleanup actions
- [ ] `TODO: <path>` Add audit entries for deletes and cleanup actions

## Acceptance Criteria
- [ ] Admin can view storage usage per company (total + breakdown if available)
- [ ] Totals remain accurate (reconciliation job fixes drift)
- [ ] Uploads are blocked when quota exceeded, with actionable messaging
- [ ] Users receive warnings before hitting limits
- [ ] Cleanup tools reduce storage without breaking references

## Execution Notes (for orchestrator)
- Prefer metering from DB file metadata; do not rely solely on provider APIs.
- Make reconciliation safe to run repeatedly (idempotent).
- Ensure deletions are safe: prevent deleting referenced files (or require replacement).
- Where BYOS is used, still meter usage by your DB metadata (not provider billing).
