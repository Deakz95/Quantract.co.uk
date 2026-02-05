# Contributing to Quantract

## Monorepo Structure

```
quantract/
├── apps/
│   ├── crm/              # Main CRM application (Next.js)
│   ├── marketing/         # Marketing site (Next.js)
│   ├── certificates/      # Certificates app (Next.js)
│   ├── tools/             # Internal tools (Next.js)
│   └── mobile/
│       └── engineer/      # Mobile engineer app (Expo/React Native)
├── packages/
│   ├── shared/            # Shared utilities and types
│   └── ui/                # Shared UI component library
└── pnpm-workspace.yaml
```

## Package Manager

This project uses **pnpm** with workspaces. Do not use npm or yarn.

- Run `pnpm install` from the repo root
- A single `pnpm-lock.yaml` is the source of truth
- `package-lock.json` and `yarn.lock` are gitignored

## Build Artefact Policy

The following directories must **never** be committed to git:

- `node_modules/`
- `.next/`
- `dist/`
- `build/`

These are all covered by `.gitignore`. If you see any of these tracked in git, remove them with `git rm --cached`.

## Import Boundary Rules

Cross-app imports are **forbidden**. Each app is an isolated deployable unit.

### Allowed imports

| App | Can import from |
|---|---|
| `apps/crm` | `@quantract/shared`, `@quantract/ui` |
| `apps/marketing` | `@quantract/shared`, `@quantract/ui` |
| `apps/certificates` | `@quantract/shared`, `@quantract/ui` |
| `apps/tools` | `@quantract/shared`, `@quantract/ui` |
| `apps/mobile/engineer` | *(no workspace packages — fully isolated)* |

### Forbidden imports

- No app may import from another app (e.g., CRM cannot import from `@quantract/certificates`)
- No relative path imports crossing `apps/` boundaries (e.g., `../../apps/crm/...`)
- Mobile engineer must **not** import `@quantract/ui` or `@quantract/shared`

These rules are enforced by ESLint `no-restricted-imports` in each app's `eslint.config.js`.

## Shared Code

All shared code belongs in `packages/`:

- **`packages/shared`** — Types, utilities, constants shared across web apps
- **`packages/ui`** — Reusable React UI components (web only)

To use a package, declare it as a `workspace:*` dependency in the consuming app's `package.json`.

## Workspace Commands

```bash
pnpm install          # Install all dependencies
pnpm build:all        # Build all apps via Turbo
pnpm lint:all         # Lint all apps via Turbo
pnpm typecheck:all    # Typecheck all apps via Turbo
pnpm dev:crm          # Start CRM dev server
pnpm dev:marketing    # Start marketing dev server
pnpm dev:certificates # Start certificates dev server
pnpm dev:tools        # Start tools dev server
pnpm dev:engineer     # Start mobile engineer (Expo)
```
