# 09 — Monorepo Restructure (DX + Reliability Enabler)

**Status:** PROPOSED

## Intent
Restructure the repo into a proper monorepo to reduce duplication, speed builds, share types/UI, and reduce AI apply timeouts.

## Scope
- Repo structure: /apps + /packages
- Package manager workspaces (pnpm)
- Shared types, UI, API client, entitlements utilities
- Build tooling alignment

## Out of Scope
- Large-scale rewrites of app logic
- Changing auth provider
- Changing deployment provider unless necessary

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
- [ ] `TODO: <path>` Discover current repo layout (multiple app roots) and document real paths before moving anything
- [ ] Stage 1 — Introduce workspaces: pnpm-workspace.yaml, align package.json scripts, single lockfile
- [ ] Stage 2 — Create /apps/{crm,certificates,marketing,mobile-engineer} and move code with minimal changes
- [ ] Stage 3 — Create /packages/shared for types/ui/api client/entitlements; move shared code out of apps
- [ ] `TODO: <path>` Update imports/tsconfig paths to use shared package
- [ ] Stage 4 — Remove duplicated config + unify lint/typecheck/build commands
- [ ] Stage 5 — Exclude build artifacts (.next, dist, node_modules) across all apps and CI caches appropriately

## Acceptance Criteria
- [ ] All apps build and run after restructure using single workspace commands
- [ ] Shared types and utilities are consumed from /packages/shared
- [ ] CI/build times improve and local dev is simpler
- [ ] AI apply timeouts reduce due to smaller diffs and less duplicated code

## Execution Notes (for orchestrator)
- Do this after key feature work stabilises; it’s an enabler but can churn many files.
- Move one app at a time; keep changes mechanical.
- Keep deployment configs working; update only what’s required.
- If any stage proves too risky, stop after Stage 1 (workspaces) and defer moves.
