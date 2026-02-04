09b — Monorepo Restructure (Enforcement)

Status: REQUIRED
Priority: P0 (Enabler)

Intent

Enforce the monorepo rules defined in 09a so that:

Build artefacts never enter the repo

Cross-app coupling cannot reappear

AI-driven changes cannot violate boundaries

This stage turns structure into guarantees.

Scope

Tooling enforcement

Repo hygiene

AI-safe guardrails

Out of Scope

Feature development

App refactors

Performance optimisations

Discovery (Claude must run read-only first)

Purpose: verify that 09a is complete before enforcement.

Run these commands (read-only):

git status

git diff --name-only

pnpm -v

cat pnpm-workspace.yaml || true

find . -type d \( -name "node_modules" -o -name ".next" -o -name "dist" -o -name "build" \)

If 09a is incomplete, Claude must STOP and report blockers.

Enforcement Rules
Build Artefact Policy

Forbidden in git (must be ignored and never committed):

node_modules/

.next/

dist/

build/

Actions:

Add/verify .gitignore entries

Remove any committed artefacts

Document the policy in CONTRIBUTING.md

Import Boundary Enforcement

Add workspace-level tooling (eslint or tsconfig paths) to:

Prevent /apps/* importing from other apps

Prevent /apps/mobile-engineer importing /packages/shared/ui

Violations must fail lint/typecheck

Workspace Guarantees

pnpm workspaces must:

Use a single lockfile

Treat each app/package as an explicit dependency

No relative path imports crossing package boundaries

Deliverables

 .gitignore updated and verified

 No build artefacts tracked in git

 Import boundary enforcement added

 CONTRIBUTING.md updated with monorepo rules

 A simple “repo invariant” checklist added to docs

Acceptance Criteria

Fresh clone → install → build succeeds with zero manual cleanup

Any attempt to violate boundaries fails fast

AI-generated changes cannot introduce cross-app imports

Certificates and Tools apps remain cleanly extractable in future

Execution Notes (for orchestrator)

Claude MUST NOT relax or bypass rules “to make things work”.

If enforcement breaks an app, report the violation instead of patching around it.

Prefer minimal config over complex tooling.

This stage depends on 09a being complete and merged.