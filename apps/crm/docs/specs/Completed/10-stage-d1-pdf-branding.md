# 10 — Stage D1: PDF Branding v1

**Status:** PENDING

## Intent
PDF branding v1 (CompanyBrand + template blocks) across quotes/invoices/certs.

## Scope
- CRM: `apps/crm`
- Mobile Engineer: null

## Deliverables
1. Add CompanyBrand model (logo documentId, primary/secondary colors, footer text, contact details)
2. Update PDF renderers to apply brand (header/footer/logo/colors) consistently
3. CRM settings page to edit brand (admin/office-only role)

## Non-Goals
- No layout editor yet (D2)

## API Routes
- `GET/POST /api/admin/brand`

## Data Model
- New Prisma model: `CompanyBrand`

## Acceptance Criteria
- [ ] Company can brand quote/invoice/cert PDFs with logo/colors/footer

## Commands
```bash
# Read-only first
git status

# Execute
pnpm -C apps/crm prisma migrate dev -n add_company_brand
pnpm -C apps/crm next build
```

## Risks
- PDF rendering regressions; must snapshot test key PDFs
