# 16 — Stage H1: AI Maintenance Ops API

**Status:** PENDING

## Intent
AI maintenance: Ops API + controlled actions + audit log (read-only first).

## Scope
- CRM: `apps/crm`
- Mobile Engineer: null

## Deliverables
1. Create `/api/ops/*` endpoints behind OPS_SECRET and IP allowlist (if possible)
2. Expose safe actions: check health, list queue backlog, retry job, restart worker (if supported)
3. Create OpsAuditLog model recording every action and payload
4. Integrate your existing AI by giving it a limited toolset that only calls Ops API endpoints

## Non-Goals
- No autonomous deploy/rollback yet

## API Routes
- `GET /api/ops/health`
- `GET /api/ops/queues`
- `POST /api/ops/jobs/[id]/retry`

## Data Model
- New Prisma model: `OpsAuditLog`

## Acceptance Criteria
- [ ] AI can query status; actions require explicit approval token; every action logged

## Commands
```bash
# Read-only first
git status

# Execute
pnpm -C apps/crm prisma migrate dev -n add_ops_audit_log
pnpm -C apps/crm next build
```

## Risks
- Security risk if ops endpoints exposed; must be tightly gated
