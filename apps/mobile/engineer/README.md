# Quantract Engineer — Mobile App

Expo / React Native app for field engineers. Provides job management, timesheets,
expense receipts, certificate editing, and offline support.

## Prerequisites

- Node >= 18
- npm (this project uses npm workspaces)
- Expo CLI (bundled via `npx expo`)
- For device builds: Xcode (iOS) or Android Studio (Android)

## Install

From the **app directory** (`apps/mobile/engineer/`):

```bash
npm install
```

Or from the **monorepo root**:

```bash
npm install          # installs all workspaces including this app
```

> The app is registered as an npm workspace (`"engineer"`) in the root
> `package.json`. Either install flow produces a deterministic
> `package-lock.json`.

## Development

```bash
npx expo start           # starts Metro bundler (press a/i/w for platform)
npx expo start --android # launch on Android emulator/device
npx expo start --ios     # launch on iOS simulator/device
npx expo start --web     # launch in browser
```

From the monorepo root:

```bash
npm run dev:engineer     # shortcut for `npm run start --workspace engineer`
```

## Type-check / Lint

```bash
npm run typecheck        # runs tsc --noEmit
npm run lint             # same as typecheck (no separate linter configured yet)
```

These scripts are picked up by the root `typecheck:all` and `lint:all` commands.

## Build (Web export)

```bash
npm run build:web        # expo export --platform web → outputs to dist/
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
