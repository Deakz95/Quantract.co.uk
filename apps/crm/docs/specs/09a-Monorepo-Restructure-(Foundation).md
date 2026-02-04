09a — Monorepo Restructure (Foundation)

Status: REQUIRED
Priority: P0 (Enabler)

Intent

Establish a clean, enforceable monorepo structure that supports:

Next.js PWA apps (CRM, Office, Admin, Client, Certs, Tools)

Expo mobile Engineer app

Shared domain logic without cross-app coupling

This stage defines structure and rules only — no behavioural enforcement yet.

Scope

Repository structure

Package boundaries

Workspace configuration

Shared code layout

Out of Scope

CI enforcement

Lint rules

Build pipeline changes

Runtime behaviour changes

Discovery (Claude must run read-only first)

Purpose: bind this phase to the real app and avoid inventing structure.

Run these commands (read-only):

git status

git rev-parse --show-toplevel

ls

find . -maxdepth 2 -type d -name "apps" -o -name "packages"

find . -maxdepth 3 -type d -path "*apps/*"

find . -maxdepth 4 -type f -name "package.json"

find . -maxdepth 5 -type f -name "schema.prisma"

Claude must map existing apps to the target structure below and note any mismatches.

Target Structure
/apps
  /crm
  /office
  /admin
  /client
  /certificates
  /tools
  /mobile-engineer

/packages
  /shared
    /domain        # pure business logic (NO framework imports)
    /types         # Prisma models, API DTOs, enums
    /ui            # web-only UI primitives (Next.js compatible)
    /config        # feature flags, plan maps, env helpers

Package Boundary Rules (FOUNDATIONAL)
/apps/*

MUST NOT import from other /apps/*

MAY import from /packages/shared/*

MUST treat shared packages as external dependencies

/packages/shared/domain

MUST be framework-agnostic

MUST NOT import:

React

Next.js

Expo / React Native

Node-only APIs

MUST contain:

business rules

calculations

validators

state machines

/packages/shared/types

MAY include:

Prisma-generated types

API request/response DTOs

enums and constants

MUST NOT include runtime logic

/packages/shared/ui

Web-only

MAY import React / Next.js

MUST NOT be imported by /apps/mobile-engineer

/apps/mobile-engineer

MAY import:

/packages/shared/domain

/packages/shared/types

MUST NOT import:

/packages/shared/ui

any Next.js-only modules

Deliverables

 Repository folders match the target structure (no new apps invented)

 Shared code moved into appropriate /packages/shared/* folders

 App imports updated to respect package boundaries

 A short README added at /packages/shared/README.md explaining boundaries

Acceptance Criteria

Each app builds independently

No app imports another app directly

Shared logic is consumed via packages, not copy-paste

Mobile engineer app can consume shared domain logic without bundling web code

Execution Notes (for orchestrator)

Claude MUST NOT refactor logic beyond moving files and fixing imports.

If a file cannot be safely moved, mark it as TODO (blocked) and explain why.

Do NOT introduce lint rules or CI checks in this stage.

This stage is structural only — behaviour must remain unchanged.