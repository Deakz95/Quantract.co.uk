# 08 — Mobile Engineer App Source Hygiene

**Status:** PROPOSED

## Intent
Make the engineer mobile app reviewable and maintainable by ensuring source code is present, build artifacts are excluded, and CI/builds are deterministic.

## Scope
- Mobile engineer app repository structure
- Build artifacts and dependency management
- CI/build commands (where present)

## Out of Scope
- Large app rewrite
- Switching mobile framework
- Adding new mobile features unrelated to hygiene

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
- [ ] `TODO: <path>` Verify mobile engineer app root path and whether source is missing (src/*, app/* etc.)
- [ ] Stage 1 — Ensure source is committed: include referenced modules (AuthContext, Outbox, Draft store, etc.)
- [ ] Stage 2 — Remove build artifacts from archives and repo (.next, dist, node_modules) and add ignore rules
- [ ] `TODO: <path>` Add README with exact build/run steps (dev, build, lint, test)
- [ ] Stage 3 — Deterministic installs: ensure lockfile usage and consistent package manager configuration

## Acceptance Criteria
- [ ] Mobile app source is present and builds from scratch on a clean checkout
- [ ] No build artifacts are committed or shipped in orchestrator zips
- [ ] Running install+build succeeds consistently
- [ ] AI tooling can reason about the actual mobile logic (no missing imports)

## Execution Notes (for orchestrator)
- Prefer excluding heavy folders from orchestration input to reduce timeouts.
- If monorepo migration is planned, align this stage to that structure.
- Do not delete artifacts needed for production build pipelines; just exclude them from source control and zips.
