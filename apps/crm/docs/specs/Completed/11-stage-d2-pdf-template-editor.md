# 11 — Stage D2: PDF Template Editor v2

**Status:** DONE

## Intent
PDF template editor v2 (layout canvas) for invoices/quotes/certs (versioned).

## Scope
- CRM: `apps/crm`
- Mobile Engineer: null

## Deliverables
1. Add PdfTemplate + PdfTemplateVersion models (per company, per docType)
2. Build template editor UI (grid canvas): text/image/line/table elements + bindings
3. Preview render pipeline uses template version
4. Set default template per doc type

## Non-Goals
- No advanced conditional logic (Level 3) yet

## API Routes
- CRUD `/api/admin/pdf-templates`
- `POST /api/admin/pdf-templates/[id]/preview`

## Data Model
- New Prisma models: `PdfTemplate`, `PdfTemplateVersion`

## Acceptance Criteria
- [x] Company can edit layout and have it applied to new PDFs; old PDFs unchanged (versioned)

## Commands
```bash
# Read-only first
git status

# Execute
pnpm -C apps/crm prisma migrate dev -n add_pdf_templates
pnpm -C apps/crm next build
```

## Risks
- Template editor complexity; must keep MVP minimal
