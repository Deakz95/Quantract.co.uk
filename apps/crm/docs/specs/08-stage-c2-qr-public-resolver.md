# 08 — Stage C2: Public QR Resolver

**Status:** PENDING

## Intent
Public QR resolver: scan QR opens latest certificate PDF (or asset page + history).

## Scope
- CRM: `apps/crm`
- Mobile Engineer: null

## Deliverables
1. Public route: `GET /q/[code]` resolves active tag
2. Redirect to signed Document URL for latest assigned certificate PDF
3. Optional: show branded landing page with company name + certificate history list
4. Add security: unguessable code + rate limiting + no data leakage beyond intended PDF

## Non-Goals
- No login required for basic view (unless company toggles 'private QR' later)

## API Routes
- `GET /q/[code]`

## Data Model
- No migrations (uses QrTag/QrAssignment/Document)

## Acceptance Criteria
- [ ] Scanning a QR opens latest certificate PDF quickly
- [ ] Invalid/disabled codes return a safe 404 page

## Commands
```bash
# Read-only first
git status

# Execute
pnpm -C apps/crm next build
```

## Risks
- Public exposure: ensure only intended PDF is accessible, no client data leakage
