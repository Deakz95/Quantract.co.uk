[![CI](https://github.com/Deakz95/Quantract.co.uk/actions/workflows/ci.yml/badge.svg)](https://github.com/Deakz95/Quantract.co.uk/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Deakz95/Quantract.co.uk/branch/main/graph/badge.svg)](https://codecov.io/gh/Deakz95/Quantract.co.uk)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm install
cp env.example .env.local
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Testing

The project uses Vitest for unit tests and Playwright for E2E tests.

### Running Tests

```bash
# Run unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run unit tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run smoke tests (Chromium only)
npm run test:smoke
```

### Test Structure

- `src/**/*.test.ts` - Unit tests (Vitest)
- `src/**/*.test.tsx` - Component tests (Vitest + React Testing Library)
- `tests/playwright/*.spec.ts` - E2E tests (Playwright)

### Coverage

Coverage reports are generated in the `coverage/` directory. Key areas with coverage thresholds:

- `src/lib/*.ts` - 60% minimum (business logic)
- `src/lib/server/*.ts` - 40% minimum (server utilities)

## Environment variables

Copy `env.example` to `.env.local` and fill in values for any integrations you want to enable.
At startup, the app validates required variables (including conditional requirements for
Stripe, Xero, and Prisma) and will fail fast with a descriptive error if anything is missing.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

# Quantract A++ notes

## PDFs

- Quote PDF: `/api/client/quotes/:token/pdf`
- Agreement PDF: `/api/client/agreements/:token/pdf`

## Signature certificate

After signing, the certificate is available at:

- `/client/agreements/:token/certificate`

It includes timestamp, signer details, IP/user-agent (when available), and a SHA-256 hash.

## Revoke / rotate client link

Admin can revoke the quote link (rotate token):

- `POST /api/admin/quotes/:quoteId/token`

## Postgres (Prisma)

By default the app uses a local JSON file DB (`.qt-data.json`) so you can develop fast.

To switch to Postgres via Prisma **without changing any API shapes**, set:

```bash
DATABASE_URL=postgresql://USER:PASS@HOST:5432/quantract
QT_USE_PRISMA=1
```

### Development setup

```bash
npm run prisma:generate
npx prisma migrate dev --name init
```

## Observability (Sentry)

Set the Sentry DSN to enable frontend + backend error reporting:

```bash
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
```
### Production-safe workflow

For production and CI, avoid `prisma migrate dev` entirely. Validate the schema, generate the client
explicitly, and apply already-created migrations:

```bash
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate:deploy
```

If your build pipeline needs Prisma Client, it is explicitly generated as part of `npm run build`.

## Offline caching strategy

The engineer job list is cached client-side in `localStorage` as a best-effort fallback. The UI always
tries the live `/api/engineer/jobs` endpoint first; if it fails (offline), it will display the most
recent snapshot as long as it is no older than 24 hours. When connectivity returns, the cache is
overwritten with fresh data. This keeps offline views deterministic while avoiding long-lived stale
data.

<!-- Deploy trigger: 2026-01-16 03:07:34 -->

