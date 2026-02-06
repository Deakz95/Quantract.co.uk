# Quantract Engineer — Mobile App

Expo / React Native app for field engineers. Provides job management, timesheets,
expense receipts, certificate editing, and offline support.

## Prerequisites

- Node >= 18
- pnpm (pinned via `packageManager` in root `package.json` — run `corepack enable` to auto-activate)
- Expo CLI (bundled via `npx expo`)
- For device builds: Xcode (iOS) or Android Studio (Android)

## Install

From the **monorepo root** (recommended):

```bash
pnpm install         # installs all workspaces including this app
```

> The app is registered as a pnpm workspace (`"engineer"`) in
> `pnpm-workspace.yaml`. The root `pnpm-lock.yaml` is the single lockfile
> for the entire monorepo — do not use npm or yarn.

## Development

```bash
npx expo start           # starts Metro bundler (press a/i/w for platform)
npx expo start --android # launch on Android emulator/device
npx expo start --ios     # launch on iOS simulator/device
npx expo start --web     # launch in browser
```

From the monorepo root:

```bash
pnpm dev:engineer        # shortcut defined in root package.json
```

## Type-check / Lint

```bash
pnpm typecheck           # runs tsc --noEmit
pnpm lint                # eslint + tsc --noEmit
```

From the monorepo root:

```bash
pnpm --filter engineer run typecheck
pnpm --filter engineer run lint
```

These scripts are also picked up by `pnpm typecheck:all` and `pnpm lint:all`.

## Build (Web export)

```bash
pnpm build:web           # expo export --platform web → outputs to dist/
```

From the monorepo root:

```bash
pnpm build:engineer      # shortcut defined in root package.json
```

## Project Structure

```
apps/mobile/engineer/
├── App.tsx                  # root component (providers + navigator)
├── index.ts                 # entry point
├── app.json                 # Expo config
├── src/
│   ├── api/                 # HTTP client, caching
│   ├── auth/                # AuthContext (login / token)
│   ├── components/          # shared UI (PhotoCapture, CertPicker, …)
│   ├── entitlements/        # feature-flag context
│   ├── navigation/          # React Navigation stacks & tabs
│   ├── offline/             # outbox + cert-draft offline stores
│   ├── screens/             # all screen components
│   ├── timer/               # live timer context
│   ├── types/               # shared TypeScript types
│   └── utils/               # helpers (document viewer, etc.)
├── assets/                  # icons, splash images
└── tsconfig.json
```

## Notes

- **Offline-first**: the app queues mutations in an outbox and syncs when
  connectivity returns (see `src/offline/`).
- **Build artifacts** (`dist/`, `node_modules/`, `.expo/`, `web-build/`) are
  gitignored and must never be committed.
- The app targets **Expo SDK 54** with React Native 0.81 and React 19.
