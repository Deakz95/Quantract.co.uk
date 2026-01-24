# Quantract Infrastructure Documentation

## Architecture Overview

Quantract is a multi-app monorepo deployed on Render with Neon Postgres.

### Applications

| App | Subdomain | Purpose | Database |
|-----|-----------|---------|----------|
| `apps/marketing` | www.quantract.co.uk | Marketing site | No |
| `apps/crm` | crm.quantract.co.uk | CRM application | Yes (Prisma) |
| `apps/certificates` | certificates.quantract.co.uk | Certificate management | No (future) |
| `apps/tools` | apps.quantract.co.uk | Utility tools | No |

### Deployment

All apps are deployed to Render. See `infra/render/render.yaml` for the blueprint.

### Local Development

Each app can be run independently:

```bash
# CRM (port 3000)
cd apps/crm && npm run dev

# Marketing (port 3001)
cd apps/marketing && npm run dev

# Certificates (port 3002)
cd apps/certificates && npm run dev

# Tools (port 3003)
cd apps/tools && npm run dev
```
