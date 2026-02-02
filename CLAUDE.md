# CLAUDE.md — Quantract Monorepo

## What is Quantract?

Quantract is a multi-tenant SaaS CRM platform for UK trade contractors (primarily electrical). It manages the full quote-to-cash lifecycle: enquiries, quotes, jobs, certificates (BS 7671 electrical), invoices, and payments. It includes admin, engineer, and client portals.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.0 (App Router) |
| Language | TypeScript 5.9.3 |
| React | 19.2.0 |
| Styling | Tailwind CSS 4.1.18 + CVA + tailwind-merge |
| Database | PostgreSQL (Neon) via Prisma 6.0.0 |
| Auth | Custom session cookies (serverAuth.ts) — NOT next-auth primarily |
| Payments | Stripe 16.12.0 |
| Email | Resend 4.8.0 |
| Queue | BullMQ 5.66.5 + Redis |
| PDF | pdf-lib 1.17.1 |
| AI | OpenAI 4.104.0 |
| Testing | Vitest (unit), Playwright (E2E) |
| Error tracking | Sentry |
| Hosting | Render (Frankfurt), Neon Postgres |

## Monorepo Structure

```
quantract/
├── apps/
│   ├── crm/             # Main CRM application (admin + engineer + client portals)
│   ├── marketing/       # Marketing website (www.quantract.co.uk)
│   ├── certificates/    # Certificate verification app
│   └── tools/           # Standalone tools app
├── packages/
│   ├── shared/          # Shared utilities/types
│   └── ui/              # Shared UI components + globals.css
├── infra/               # DB scripts, infra docs
├── docs/                # Architecture docs
├── render.yaml          # Render deployment blueprint
└── package.json         # Root workspace config (npm workspaces)
```

## CRM App Structure (`apps/crm/`)

```
apps/crm/
├── app/                 # Next.js App Router pages
│   ├── admin/           # Admin portal pages
│   │   ├── jobs/        # Job management
│   │   ├── quotes/      # Quote management
│   │   ├── invoices/    # Invoice management
│   │   ├── certificates/# Certificate management
│   │   ├── clients/     # Client management
│   │   ├── contacts/    # Contact management
│   │   ├── deals/       # Deal pipeline (CRM)
│   │   ├── enquiries/   # Enquiry pipeline
│   │   ├── engineers/   # Engineer management
│   │   ├── schedule/    # Scheduling/planner
│   │   ├── timesheets/  # Timesheet management
│   │   ├── reports/     # Reporting
│   │   ├── tools/       # Built-in tools hub
│   │   ├── settings/    # Company settings
│   │   └── ...
│   ├── client/          # Client portal
│   ├── engineer/        # Engineer portal
│   ├── api/             # API route handlers
│   │   ├── admin/       # Admin API routes
│   │   ├── client/      # Client API routes (token-based + auth)
│   │   ├── engineer/    # Engineer API routes
│   │   ├── ai/          # AI chat endpoints
│   │   ├── auth/        # Auth endpoints
│   │   ├── public/      # Public endpoints (enquiries, invites)
│   │   ├── internal/    # Cron jobs (auto-chase, reminders)
│   │   └── webhooks/    # Stripe webhooks
│   └── auth/            # Auth pages (login, signup)
├── src/
│   ├── components/      # React components
│   │   ├── admin/       # Admin-specific components
│   │   ├── ui/          # Reusable UI primitives
│   │   └── ...
│   ├── lib/             # Core business logic
│   │   ├── serverAuth.ts    # Auth helpers (requireCompanyContext, etc.)
│   │   ├── permissions.ts   # RBAC capability system
│   │   ├── server/          # Server-only utilities
│   │   │   └── multiTenant.ts # Multi-tenant DB routing
│   │   ├── ai/              # AI prompt routing
│   │   └── tools/           # Tools registry (types.ts)
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript type definitions
│   └── server/          # Server utilities
├── prisma/
│   ├── schema.prisma    # Database schema
│   ├── migrations/      # Prisma migrations
│   └── seed.ts          # Database seeder
├── tests/               # Test files
├── scripts/             # Utility scripts (QA, smoke tests, migrations)
├── middleware.ts         # Next.js middleware (auth, tenancy, rate limiting)
└── next.config.mjs      # Next.js config
```

## Key Commands

```bash
# Development
npm run dev:crm              # Start CRM dev server (port 3000)
npm run dev:marketing        # Start marketing site
npm run dev:certificates     # Start certificates app
npm run dev:tools            # Start tools app

# Build
npm run build:all            # Build all workspaces
npm run build:crm            # Build CRM only

# Testing (run from apps/crm/)
npm run test                 # Vitest unit tests
npm run test:unit:watch      # Vitest watch mode
npm run test:e2e             # Playwright E2E tests
npm run test:smoke           # Playwright smoke (Chromium only)

# Database (run from apps/crm/)
npm run prisma:generate      # Generate Prisma client
npm run prisma:migrate:dev   # Create new migration
npm run prisma:studio        # Open Prisma Studio
npm run prisma:seed          # Seed database
npm run db:setup             # Full DB setup (generate + migrate + seed)

# Docker (local Postgres + Redis)
npm run docker:up            # Start local services
npm run docker:down          # Stop local services
npm run docker:reset         # Reset volumes and restart

# QA Scripts (run from apps/crm/)
npm run smoke                # Smoke tests
npm run qa:staging           # Feature inventory smoke
npm run qa:security-audit    # Security audit
npm run qa:api:full          # Full API sweep

# Linting & Types
npm run lint:all             # Lint all workspaces
npm run typecheck:all        # Type-check all workspaces
```

## Multi-Tenancy & Auth

### Tenant Resolution
1. **Subdomain**: `company.quantract.co.uk` → extracts subdomain via middleware
2. **Session cookie**: `qt_company_id` stores the active company ID

### Auth Pattern for API Routes
```typescript
// Standard admin route:
import { requireCompanyContext } from "@/lib/serverAuth";

export async function GET() {
  const ctx = await requireCompanyContext();
  // ctx.companyId guaranteed non-null
  // Use ctx.companyId in ALL Prisma queries
}

// Fine-grained permissions:
import { requireCapability } from "@/lib/serverAuth";

export async function POST() {
  const ctx = await requireCapability("invoices.manage");
}
```

### Critical Security Rule
**Every Prisma query on tenant data MUST include `where: { companyId: ctx.companyId }`** — never query without company scoping.

### Roles & Capabilities
- `admin` — full access to everything
- `office` — invoices.view, planner, expenses, suppliers
- `finance` — invoices.*, expenses, billing.view
- `engineer` — job-specific access only
- `client` — portal access only (token-based for quotes/invoices)

## API Route Conventions

- All routes live under `app/api/` using App Router route handlers
- Export named HTTP methods: `GET`, `POST`, `PATCH`, `DELETE`
- Use `NextResponse.json()` for responses
- Admin routes: `/api/admin/*` — require admin role
- Client routes: `/api/client/*` — token-based or client auth
- Engineer routes: `/api/engineer/*` — engineer auth
- Public routes: `/api/public/*` — no auth required
- Cron routes: `/api/internal/cron/*` — cron secret verification

## Database Schema — Key Models

| Model | Purpose |
|-------|---------|
| `Company` | Tenant container (branding, settings, subscription) |
| `User` | Auth identity (may span companies) |
| `CompanyUser` | Membership record (authoritative role) |
| `Client` | Customer record |
| `Contact` | Individual person at a client |
| `Site` | Physical location (child of Client) |
| `Quote` | Quote with line items (JSON) |
| `Job` | Work order (linked to quote, client, site, engineer) |
| `Invoice` | Invoice with Stripe/Xero integration |
| `Certificate` | Electrical certificate (EIC, EICR, MWC, etc.) |
| `Engineer` | Field worker profile |
| `Enquiry` | Inbound lead (pipeline stages) |
| `Deal` | Sales pipeline deal |
| `Activity` | Timeline entries (NOTE, CALL, EMAIL, MEETING, etc.) |
| `StockItem` / `StockMovement` | Inventory tracking |
| `RamsDocument` | Risk assessment documents |

## Coding Conventions

### File Organization
- Page components: `app/[portal]/[entity]/page.tsx` (server component or thin wrapper)
- Client components: `app/[portal]/[entity]/[Entity]Client.tsx` or `src/components/admin/[Entity]*.tsx`
- API routes: `app/api/[portal]/[entity]/route.ts`
- Shared UI: `src/components/ui/` or `packages/ui/`
- Business logic: `src/lib/`

### Naming
- Files: kebab-case for utilities, PascalCase for components
- Components: PascalCase (`QuoteCreateForm.tsx`)
- API routes: always `route.ts`
- IDs: cuid strings (Prisma `@id @default(cuid())`)

### Styling
- Tailwind CSS utility classes directly on elements
- `cn()` helper (clsx + tailwind-merge) for conditional classes
- CVA for component variants
- No CSS modules or styled-components

### State Management
- Server components for data fetching where possible
- React state + URL params for client-side state
- No Redux/Zustand — plain React patterns

### Soft Deletes
Many models use `deletedAt DateTime?` for soft deletion. Queries should filter `deletedAt: null` unless showing deleted items.

## Deployment

- **Platform**: Render (render.yaml blueprint)
- **Region**: Frankfurt (eu-central)
- **Apps**: 4 web services (crm, marketing, certificates, tools)
- **DB**: Neon PostgreSQL (supports shared + dedicated tenant tiers)
- **Build**: `npm ci && npm run build` (CRM also runs prisma:generate + migrate)
- **Health check**: `/api/health` on all services

## Adding New Features

### New Admin Page
1. Create `app/admin/[feature]/page.tsx`
2. Create client component in `src/components/admin/`
3. Add API routes under `app/api/admin/[feature]/route.ts`
4. Use `requireCompanyContext()` in all API routes
5. Add navigation item in `src/components/AppShell.tsx`

### New Tool
1. Register in `src/lib/tools/types.ts` (TOOLS array + TOOL_CATEGORIES)
2. Create page at `app/admin/tools/[tool-slug]/page.tsx`
3. Tools hub auto-renders from the registry

### New Prisma Model
1. Add to `prisma/schema.prisma` — always include `companyId` + `@@index([companyId])`
2. Run `npm run prisma:migrate:dev -- --name description`
3. Run `npm run prisma:generate`

### New Certificate Type
- Certificate types are stored as strings: "EIC", "EICR", "MWC", etc.
- Certificate data is stored as JSON in `Certificate.data`
- Test results go in `CertificateTestResult.data` (JSON)

## Environment Variables (CRM)

Key env vars (see `apps/crm/env.example`):
- `DATABASE_URL` / `DIRECT_URL` — Neon Postgres connection
- `NEON_API_KEY` / `NEON_PROJECT_ID` — Neon API (production)
- `OPENAI_API_KEY` — AI features
- `RESEND_API_KEY` — Transactional email
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Payments
- `SENTRY_DSN` — Error tracking
- `APP_ORIGIN` / `NEXT_PUBLIC_APP_ORIGIN` — Base URL

## Important Gotchas

1. **Auth is custom** — `serverAuth.ts` is authoritative, not next-auth. Don't import from next-auth for session management.
2. **CompanyUser.role is authoritative** — not User.role. Use `getEffectiveRole()`.
3. **Permissions-Policy headers** block camera/microphone/geolocation — update `next.config.mjs` if enabling those features.
4. **No WebRTC or real-time** infrastructure exists yet.
5. **StockItem has no location/vehicle tracking** — no Vehicle/Truck model exists.
6. **Quote items are JSON** — not a separate table. Stored as `[{description, qty, unitPrice}]`.
7. **lucide-react is pinned** to 0.562.0 via root overrides — don't change without testing.
8. **British English** throughout the product (colour, centre, programme, etc. in user-facing text).
