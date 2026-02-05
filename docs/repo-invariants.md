# Repo Invariants Checklist

These invariants must hold at all times. Violations should be treated as bugs.

## Build Artefacts

- [ ] No `node_modules/` directories tracked in git
- [ ] No `.next/` directories tracked in git
- [ ] No `dist/` or `build/` directories tracked in git
- [ ] No `package-lock.json` or `yarn.lock` files tracked in git

Verify: `git ls-files --cached -- '**/node_modules/*' '**/.next/*' '**/dist/*' '**/build/*' '**/package-lock.json' '**/yarn.lock'` should return empty.

## Lockfile

- [ ] A single `pnpm-lock.yaml` exists at the repo root
- [ ] No other lockfiles (`package-lock.json`, `yarn.lock`) exist anywhere

## Import Boundaries

- [ ] No app imports from another app's package name
- [ ] No relative imports cross `apps/` boundaries
- [ ] `apps/mobile/engineer` does not import `@quantract/shared` or `@quantract/ui`
- [ ] `pnpm lint:all` passes with zero boundary violations

## Workspace Structure

- [ ] `pnpm-workspace.yaml` lists `apps/*`, `apps/mobile/*`, and `packages/*`
- [ ] Each app declares shared packages as `workspace:*` dependencies
- [ ] No app has a direct dependency on another app

## Extractability

- [ ] `apps/certificates` and `apps/tools` can be removed from the workspace without breaking other apps
- [ ] `apps/mobile/engineer` has zero workspace package dependencies

## Quick Verification

Run from repo root:

```bash
# Check no artefacts in git
git ls-files --cached -- '**/node_modules/*' '**/.next/*' '**/dist/*' '**/build/*' '**/package-lock.json' '**/yarn.lock'

# Lint all apps (includes boundary checks)
pnpm lint:all

# Typecheck all apps
pnpm typecheck:all
```
