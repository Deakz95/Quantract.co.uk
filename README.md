# Quantract Monorepo

Professional software for electrical contractors and building services companies.

## Architecture

```
apps/
  marketing/        → www.quantract.co.uk (Marketing site, port 3001)
  crm/              → crm.quantract.co.uk (CRM application, port 3000)
  certificates/     → certificates.quantract.co.uk (Certificate management, port 3002)
  tools/            → apps.quantract.co.uk (Utility tools, port 3003)

packages/
  shared/           → Shared utilities (@quantract/shared)

infra/
  db/               → Database documentation
  render/           → Render deployment config
  docs/             → Infrastructure documentation
```

## Quick Start

### Install All Dependencies (from repo root)

```bash
npm install
```

This installs dependencies for all workspaces.

### Run Individual Apps

```bash
# CRM (port 3000)
npm run dev:crm

# Marketing (port 3001)
npm run dev:marketing

# Certificates (port 3002)
npm run dev:certificates

# Tools (port 3003)
npm run dev:tools
```

### Build All Apps

```bash
npm run build:all
```

### CRM Setup (with database)

```bash
cd apps/crm
npm run docker:up    # Start local Postgres
npm run db:setup     # Run migrations and seed
cd ../..
npm run dev:crm      # Start CRM dev server
```

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Neon Postgres with Prisma ORM
- **Deployment**: Render
- **Monitoring**: Sentry
- **Package Manager**: npm workspaces

## Environment Variables

Each app has its own `.env.example` file. Copy to `.env.local` and configure:

| App | Config File | Database |
|-----|-------------|----------|
| CRM | `apps/crm/.env.local.example` | Yes (Prisma) |
| Marketing | `apps/marketing/.env.example` | No |
| Certificates | `apps/certificates/.env.example` | No |
| Tools | `apps/tools/.env.example` | No |

### CRM Database Variables

```bash
DATABASE_URL="postgresql://..."      # Pooled connection (runtime)
DIRECT_URL="postgresql://..."        # Direct connection (migrations)
```

## Shared Package

Import utilities from `@quantract/shared`:

```typescript
import { cn, formatDate, formatCurrency } from "@quantract/shared";
```

Available utilities:
- `cn()` - Combine class names conditionally
- `formatDate()` - Format dates (locale-aware)
- `formatCurrency()` - Format currency (GBP default)
- `generateId()` - Generate UUIDs
- `truncate()` - Truncate strings

## Deployment

See `infra/render/render.yaml` for the Render Blueprint configuration.

## Health Checks

All apps expose `/api/health`:

```bash
curl https://crm.quantract.co.uk/api/health
curl https://www.quantract.co.uk/api/health
curl https://certificates.quantract.co.uk/api/health
curl https://apps.quantract.co.uk/api/health
```

## Auth Boundaries

Each app manages its own auth independently:

| App | Auth Domain | Notes |
|-----|-------------|-------|
| CRM | crm.quantract.co.uk | Session-based, multi-role |
| Certificates | certificates.quantract.co.uk | Separate auth |
| Tools | apps.quantract.co.uk | Separate auth |

For future SSO, introduce `auth.quantract.co.uk`.
